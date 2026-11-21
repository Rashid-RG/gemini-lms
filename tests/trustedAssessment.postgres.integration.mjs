// Opt-in PostgreSQL integration tests. NEVER use a production database URL.
// Run only with ASSESSMENT_TEST_DATABASE_URL and the explicit safety acknowledgement.
// This suite creates and drops a random, isolated schema in the supplied TEST database.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const testUrl = process.env.ASSESSMENT_TEST_DATABASE_URL;
const acknowledgement = process.env.ASSESSMENT_TEST_DATABASE_ACK;
const productionUrl = process.env.DATABASE_URL;
const guardPassed = Boolean(testUrl &&
  acknowledgement === "ISOLATED_NONPRODUCTION" &&
  testUrl !== productionUrl &&
  /^postgres(?:ql)?:\/\//.test(testUrl));

test("PostgreSQL reconciliation: retry, parallel writers, source isolation, FK and recovery", {
  skip: !guardPassed ? "Explicit isolated database and acknowledgement required" : false
}, async () => {
  // The test connection MUST point to a separate disposable DB or Neon test branch.
  // The script never imports configs/db.js or reads the normal database connection.
  const connection = neon(testUrl);
  const schema = "assessment_it_" + randomUUID().replaceAll("-", "");
  // This identifier is generated from cryptographic UUID hex and never comes from user input.
  const qSchema = `"${schema}"`;
  const execute = (query, values = []) => connection(query, values);
  await execute(`CREATE SCHEMA ${qSchema}`);
  try {
    await execute(`
      CREATE TABLE ${qSchema}."trustedAssessmentAttempts" (
        "id" varchar PRIMARY KEY,
        "studentEmail" varchar NOT NULL,
        "courseId" varchar NOT NULL,
        "studyTypeContentId" integer NOT NULL,
        "status" varchar NOT NULL,
        "mlEligibility" varchar NOT NULL,
        "adaptiveSyncStatus" varchar NOT NULL DEFAULT 'pending',
        "score" integer,
        "submittedAt" timestamp,
        "expiresAt" timestamp NOT NULL
      )`);
    await execute(`
      CREATE TABLE ${qSchema}."verifiedAssessmentProjection" (
        "attemptId" varchar PRIMARY KEY REFERENCES ${qSchema}."trustedAssessmentAttempts"("id") ON DELETE RESTRICT,
        "studentEmail" varchar NOT NULL,
        "courseId" varchar NOT NULL,
        "studyTypeContentId" integer NOT NULL,
        "score" integer NOT NULL CHECK ("score" BETWEEN 0 AND 100),
        "submittedAt" timestamp NOT NULL
      )`);
    const id = randomUUID();
    const student = "pilot-learner@example.invalid";
    const course = "pilot-course";
    await execute(`
      INSERT INTO ${qSchema}."trustedAssessmentAttempts"
        ("id","studentEmail","courseId","studyTypeContentId","status","mlEligibility","score","submittedAt","expiresAt")
      VALUES ($1,$2,$3,5,'submitted','server_verified',80,'2026-11-22T07:00:00','2026-11-22T08:00:00')
    `, [id, student, course]);

    // This is the same INSERT SELECT / conflict strategy used in reconciliation.
    const insert = () => execute(`
      INSERT INTO ${qSchema}."verifiedAssessmentProjection"
        ("attemptId","studentEmail","courseId","studyTypeContentId","score","submittedAt")
      SELECT a."id",a."studentEmail",a."courseId",a."studyTypeContentId",a."score",a."submittedAt"
      FROM ${qSchema}."trustedAssessmentAttempts" a
      WHERE a."id"=$1 AND a."status"='submitted'
        AND a."mlEligibility"='server_verified' AND a."score" BETWEEN 0 AND 100
        AND a."submittedAt" IS NOT NULL
      ON CONFLICT ("attemptId") DO NOTHING
      RETURNING "attemptId"
    `, [id]);
    const claimRows = await Promise.all([insert(), insert(), insert(), insert()]);
    assert.equal(claimRows.reduce((sum, rows) => sum + rows.length, 0), 1,
      "Concurrent INSERT requests must project the attempt exactly once");

    // Simulate process death after ledger insertion: marker stays pending.
    let [attempt] = await execute(`SELECT "adaptiveSyncStatus" FROM ${qSchema}."trustedAssessmentAttempts" WHERE "id"=$1`, [id]);
    assert.equal(attempt.adaptiveSyncStatus, "pending");
    await insert(); // Retry cannot duplicate the durable ledger row.
    let [countRow] = await execute(`SELECT count(*)::integer AS count FROM ${qSchema}."verifiedAssessmentProjection"`);
    assert.equal(countRow.count, 1);

    const mark = () => execute(`
      UPDATE ${qSchema}."trustedAssessmentAttempts" a
      SET "adaptiveSyncStatus"='ledgered'
      WHERE a."id"=$1 AND a."status"='submitted'
        AND a."mlEligibility"='server_verified' AND a."adaptiveSyncStatus"='pending'
        AND EXISTS (
          SELECT 1 FROM ${qSchema}."verifiedAssessmentProjection" p
          WHERE p."attemptId"=a."id" AND p."studentEmail"=a."studentEmail"
            AND p."courseId"=a."courseId"
            AND p."studyTypeContentId"=a."studyTypeContentId"
            AND p."score"=a."score" AND p."submittedAt"=a."submittedAt"
        ) RETURNING a."id"
    `, [id]);
    const transitions = await Promise.all([mark(), mark(), mark()]);
    assert.equal(transitions.reduce((sum, rows) => sum + rows.length, 0), 1,
      "Exactly one concurrent reconciliation may mark the source ledgered");
    assert.equal((await mark()).length, 0);

    // Contradicting a ledger row must not be accepted on a new attempt.
    const badId = randomUUID();
    await execute(`INSERT INTO ${qSchema}."trustedAssessmentAttempts"
       ("id","studentEmail","courseId","studyTypeContentId","status","mlEligibility","score","submittedAt","expiresAt")
       VALUES ($1,$2,$3,5,'submitted','server_verified',20,'2026-11-22T07:00:00','2026-11-22T08:00:00')`,
      [badId, "other@example.invalid", course]);
    await execute(`INSERT INTO ${qSchema}."verifiedAssessmentProjection"
      ("attemptId","studentEmail","courseId","studyTypeContentId","score","submittedAt")
      VALUES ($1,$2,$3,5,99,'2026-11-22T07:00:00')`,
      [badId, "other@example.invalid", course]);
    const badTransitions = await execute(`
      UPDATE ${qSchema}."trustedAssessmentAttempts" a SET "adaptiveSyncStatus"='ledgered'
      WHERE a."id"=$1 AND a."adaptiveSyncStatus"='pending'
        AND EXISTS (SELECT 1 FROM ${qSchema}."verifiedAssessmentProjection" p
          WHERE p."attemptId"=a."id" AND p."studentEmail"=a."studentEmail"
          AND p."courseId"=a."courseId" AND p."studyTypeContentId"=a."studyTypeContentId"
          AND p."score"=a."score" AND p."submittedAt"=a."submittedAt")
      RETURNING a."id"`, [badId]);
    assert.equal(badTransitions.length, 0, "Conflicting scores cannot be marked ledgered");

    // A foreign key prevents a ledger row from surviving without its source attempt.
    await assert.rejects(() => execute(
      `DELETE FROM ${qSchema}."trustedAssessmentAttempts" WHERE "id"=$1`, [id]
    ), /foreign key|constraint|violat/i);

    const visible = await execute(`SELECT "id" FROM ${qSchema}."trustedAssessmentAttempts"
      WHERE "studentEmail"=$1 AND "courseId"=$2`, [student, course]);
    assert.deepEqual(visible.map(x => x.id), [id], "Student-scoped query cannot return another learner's record");
  } finally {
    await execute(`DROP SCHEMA ${qSchema} CASCADE`);
  }
});
