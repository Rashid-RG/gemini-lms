#!/usr/bin/env python3
"""Ephemeral PostgreSQL integration tests using the actual proposed SQL migrations.

HARD GUARD: Only the localhost PostgreSQL container provisioned by GitHub Actions
is allowed. Never accepts DATABASE_URL, an external host, or developer credentials.
Creates a unique schema and drops it in finally. No production connections.
"""
import concurrent.futures
import os
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]


def ensure_ephemeral_ci():
    required = {
        "GITHUB_ACTIONS": "true",
        "CI": "true",
        "ASSESSMENT_PG_CI_ACK": "EPHEMERAL_LOCALHOST_ONLY",
        "PGHOST": "127.0.0.1",
        "PGPORT": "5432",
        "PGDATABASE": "assessment_ci",
        "PGUSER": "assessment_ci",
    }
    for key, expected in required.items():
        if os.getenv(key) != expected:
            raise SystemExit(f"Refusing PostgreSQL test: {key} must be {expected}")
    if os.getenv("DATABASE_URL") or os.getenv("ASSESSMENT_TEST_DATABASE_URL"):
        raise SystemExit("Refusing PostgreSQL test: application and Neon database URLs must be absent")


def run_psql(query=None, file=None, schema=None, expect_failure=False):
    env = dict(os.environ)
    env.pop("DATABASE_URL", None)
    env.pop("ASSESSMENT_TEST_DATABASE_URL", None)
    if schema:
        env["PGOPTIONS"] = f"-c search_path={schema}"
    else:
        env.pop("PGOPTIONS", None)
    command = ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At"]
    if file:
        command += ["-f", str(ROOT / file)]
    else:
        command += ["-c", query]
    response = subprocess.run(command, cwd=ROOT, env=env, text=True,
                              capture_output=True, timeout=30)
    if expect_failure:
        assert response.returncode != 0, f"Expected SQL failure: {query}"
    elif response.returncode:
        raise AssertionError(f"PostgreSQL assertion failed: {response.stderr.strip()}")
    return response.stdout.strip()


def assert_one(result, message):
    assert result == "1", f"{message}: expected 1, got {result!r}"


def main():
    ensure_ephemeral_ci()
    schema = "assessment_ci_" + uuid.uuid4().hex
    schema_quoted = '"' + schema + '"'
    print("Using disposable PostgreSQL schema:", schema, flush=True)
    run_psql(f"CREATE SCHEMA {schema_quoted}")
    try:
        # Test the actual reviewed migration files, not copied miniature tables.
        run_psql(file="drizzle/phase1_trusted_assessment_attempts.sql", schema=schema)
        run_psql(file="drizzle/phase1_verified_assessment_projection.sql", schema=schema)
        attempt = str(uuid.uuid4())
        learner = "learner@example.invalid"
        course = "integration-course"
        # Expiry checks operate in SQL; no test of Clerk session assumptions here.
        run_psql(f"""
          INSERT INTO "trustedAssessmentAttempts"
            ("id","studentEmail","courseId","studyTypeContentId","questionSnapshot",
             "questionCount","status","expiresAt")
          VALUES ('{attempt}','{learner}','{course}',2,'[]',1,'started',NOW()+INTERVAL '5 minutes')
        """, schema=schema)

        def submit(identity, key=attempt):
            return run_psql(f"""
              WITH updated AS (
                UPDATE "trustedAssessmentAttempts"
                SET "status"='submitted',"score"=75,"correctCount"=1,
                    "submittedAt"=NOW(),"mlEligibility"='server_verified'
                WHERE "id"='{key}' AND "studentEmail"='{identity}'
                  AND "status"='started' AND "expiresAt" > NOW()
                RETURNING "id"
              )
              SELECT COUNT(*) FROM updated
            """, schema=schema)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: submit(learner), range(4)))
        assert results.count("1") == 1 and results.count("0") == 3, results
        assert submit(learner) == "0", "Replayed submission accepted"

        private = str(uuid.uuid4())
        expired = str(uuid.uuid4())
        for key, expiry in [(private, "NOW()+INTERVAL '5 minutes'"),
                            (expired, "NOW()-INTERVAL '1 minute'")]:
            run_psql(f"""
              INSERT INTO "trustedAssessmentAttempts"
                ("id","studentEmail","courseId","studyTypeContentId","questionSnapshot","questionCount","expiresAt")
              VALUES ('{key}','{learner}','{course}',2,'[]',1,{expiry})
            """, schema=schema)
        assert submit("another@example.invalid", private) == "0", "Cross-user attempt accepted"
        assert submit(learner, private) == "1"
        assert submit(learner, expired) == "0", "Expired attempt accepted"

        # Atomic projection insertion with duplicate protection.
        def project():
            return run_psql(f"""
              WITH inserted AS (
                INSERT INTO "verifiedAssessmentProjection"
                  ("attemptId","studentEmail","courseId","studyTypeContentId","score","submittedAt")
                SELECT a."id",a."studentEmail",a."courseId",
                       a."studyTypeContentId",a."score",a."submittedAt"
                FROM "trustedAssessmentAttempts" a
                WHERE a."id"='{attempt}' AND a."status"='submitted'
                  AND a."mlEligibility"='server_verified'
                ON CONFLICT ("attemptId") DO NOTHING RETURNING "attemptId"
              ) SELECT COUNT(*) FROM inserted
            """, schema=schema)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: project(), range(4)))
        assert results.count("1") == 1 and results.count("0") == 3, results
        assert project() == "0", "Duplicate projection accepted"

        # Crash between projection insertion and marking should be recoverable.
        assert run_psql(f"""SELECT "adaptiveSyncStatus" FROM "trustedAssessmentAttempts"
                           WHERE "id"='{attempt}'""", schema=schema) == "pending"

        def mark(key=attempt):
            return run_psql(f"""
              WITH updated AS (
                UPDATE "trustedAssessmentAttempts" a
                SET "adaptiveSyncStatus"='ledgered'
                WHERE a."id"='{key}' AND a."status"='submitted'
                  AND a."mlEligibility"='server_verified'
                  AND a."adaptiveSyncStatus"='pending'
                  AND EXISTS (
                    SELECT 1 FROM "verifiedAssessmentProjection" p
                    WHERE p."attemptId"=a."id" AND p."studentEmail"=a."studentEmail"
                      AND p."courseId"=a."courseId"
                      AND p."studyTypeContentId"=a."studyTypeContentId"
                      AND p."score"=a."score" AND p."submittedAt"=a."submittedAt"
                  ) RETURNING a."id"
              ) SELECT COUNT(*) FROM updated
            """, schema=schema)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: mark(), range(4)))
        assert results.count("1") == 1 and results.count("0") == 3, results
        assert mark() == "0", "Projection marked twice"

        # Corrupt an intentionally separate projection and confirm mismatch is rejected.
        mismatched = str(uuid.uuid4())
        run_psql(f"""
          INSERT INTO "trustedAssessmentAttempts"
            ("id","studentEmail","courseId","studyTypeContentId","questionSnapshot",
             "questionCount","status","score","mlEligibility","submittedAt","expiresAt")
          VALUES ('{mismatched}','{learner}','{course}',2,'[]',1,
                  'submitted',20,'server_verified',NOW(),NOW()+INTERVAL '1 minute')
        """, schema=schema)
        run_psql(f"""
          INSERT INTO "verifiedAssessmentProjection"
            ("attemptId","studentEmail","courseId","studyTypeContentId","score","submittedAt")
          SELECT "id","studentEmail","courseId","studyTypeContentId",99,"submittedAt"
          FROM "trustedAssessmentAttempts" WHERE "id"='{mismatched}'
        """, schema=schema)
        assert mark(mismatched) == "0", "Mismatched score marked ledgered"

        run_psql(f"DELETE FROM \"trustedAssessmentAttempts\" WHERE \"id\"='{attempt}'",
                 schema=schema, expect_failure=True)
        assert_one(run_psql(f"""SELECT COUNT(*) FROM "trustedAssessmentAttempts"
                  WHERE "studentEmail"='{learner}' AND "id"='{attempt}'""", schema=schema),
                   "Learner's attempt disappeared")
        assert run_psql(f"""SELECT COUNT(*) FROM "trustedAssessmentAttempts"
                  WHERE "studentEmail"='another@example.invalid'""", schema=schema) == "0"

        # Explicit rollback does not persist a marker or change the verified score.
        run_psql(f"""
          BEGIN;
          UPDATE "trustedAssessmentAttempts" SET "score"=0 WHERE "id"='{attempt}';
          ROLLBACK;
        """, schema=schema)
        assert run_psql(f"""SELECT "score" FROM "trustedAssessmentAttempts"
                  WHERE "id"='{attempt}'""", schema=schema) == "75"
        # Independently proposed chapter-activity migration and atomic replay checks.
        run_psql(file="drizzle/phase1_trusted_chapter_sessions.sql", schema=schema)
        session = str(uuid.uuid4())
        run_psql(f"""
          INSERT INTO "trustedChapterSessions"
            ("id","studentEmail","courseId","chapterIndex","startedAt",
             "lastHeartbeatAt","expiresAt")
          VALUES ('{session}','{learner}','{course}',0,NOW()-INTERVAL '1 minute',
                  NOW()-INTERVAL '1 minute',NOW()+INTERVAL '20 minutes')
        """, schema=schema)
        def heartbeat(who=learner, key=session):
            return run_psql(f"""
              WITH updated AS (
                UPDATE "trustedChapterSessions"
                SET "heartbeatCount"="heartbeatCount"+1,"lastHeartbeatAt"=NOW()
                WHERE "id"='{key}' AND "studentEmail"='{who}' AND "courseId"='{course}'
                  AND "chapterIndex"=0 AND "closedAt" IS NULL
                  AND "expiresAt">NOW()
                  AND "lastHeartbeatAt"<=NOW()-INTERVAL '30 seconds'
                RETURNING "id"
              ) SELECT COUNT(*) FROM updated
            """, schema=schema)
        assert heartbeat("attacker@example.invalid") == "0", "Cross-student session claimed"
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: heartbeat(), range(4)))
        assert results.count("1") == 1 and results.count("0") == 3, results
        assert heartbeat() == "0", "Repeated heartbeat accepted too soon"
        run_psql(f"""
          UPDATE "trustedChapterSessions" SET "closedAt"=NOW() WHERE "id"='{session}'
        """, schema=schema)
        assert heartbeat() == "0", "Closed session accepted a heartbeat"
        expired_session = str(uuid.uuid4())
        run_psql(f"""
          INSERT INTO "trustedChapterSessions"
            ("id","studentEmail","courseId","chapterIndex","startedAt",
             "lastHeartbeatAt","expiresAt")
          VALUES ('{expired_session}','{learner}','{course}',0,
                  NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour',
                  NOW()-INTERVAL '30 minutes')
        """, schema=schema)
        assert heartbeat(learner, expired_session) == "0", "Expired session accepted"
        print("PASS: real PostgreSQL migrations, replay, deadline, owner scope, parallel claims, ledger, FK, rollback, chapter sessions")
    finally:
        run_psql(f"DROP SCHEMA {schema_quoted} CASCADE")


if __name__ == "__main__":
    main()
