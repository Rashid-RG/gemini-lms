-- PLANNED / NON-DESTRUCTIVE. Apply to isolated CI only until approval.
-- Single-statement, SECURITY INVOKER atomic publisher for Neon HTTP driver.
-- Broad SHARE locks intentionally serialize publisher reads with concurrent
-- writes to course/assessment/assignment source tables in this pilot.
-- No immutable record is changed; publishing appends a new revision.
CREATE OR REPLACE FUNCTION trusted_publish_course_revision(
  p_course_id varchar, p_actor varchar, p_manifest jsonb, p_fingerprint varchar
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_course record;
  v_assessments jsonb;
  v_assignments jsonb;
  v_expected jsonb;
  v_total_assessments integer;
  v_not_ready integer;
  v_total_assignments integer;
  v_next integer;
  v_id varchar;
BEGIN
  IF p_course_id IS NULL OR length(trim(p_course_id)) = 0 OR length(p_course_id) > 255
     OR p_actor IS NULL OR length(trim(p_actor)) = 0
     OR p_fingerprint !~ '^[a-f0-9]{64}$'
     OR p_manifest IS NULL OR jsonb_typeof(p_manifest) <> 'object' THEN
    RAISE EXCEPTION 'Invalid revision publication request';
  END IF;

  -- Prevent two publishers claiming the same course revision number.
  PERFORM pg_advisory_xact_lock(hashtextextended('trusted-revision:' || p_course_id, 0));
  -- This also blocks source UPDATE/INSERT/DELETE until the snapshot is inserted.
  -- Unavoidably broad for initial prototype; optimize course-specific locking later.
  LOCK TABLE "studyMaterial", "studyTypeContent", "courseAssignments" IN SHARE MODE;

  SELECT "courseId", "createdBy", "courseLayout", "hasAssignments", "assignmentCount"
    INTO v_course FROM "studyMaterial" WHERE "courseId" = p_course_id;
  IF NOT FOUND OR lower(trim(v_course."createdBy")) <> lower(trim(p_actor)) THEN
    RAISE EXCEPTION 'Course publisher unauthorized';
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE "status" IS DISTINCT FROM 'Ready')::integer,
         COALESCE(jsonb_agg(jsonb_build_object(
           'id',"id",'chapterId',"chapterId",'type',"type",'content',"content"
         ) ORDER BY "id"), '[]'::jsonb)
    INTO v_total_assessments, v_not_ready, v_assessments
    FROM "studyTypeContent"
    WHERE "courseId"=p_course_id AND "type" IN ('Quiz','MCQ');

  SELECT count(*)::integer,
         COALESCE(jsonb_agg(jsonb_build_object(
           'assignmentId',"assignmentId",'title',"title",
           'description',"description",'rubric',"rubric",'totalPoints',"totalPoints"
         ) ORDER BY "assignmentId"), '[]'::jsonb)
    INTO v_total_assignments, v_assignments
    FROM "courseAssignments" WHERE "courseId"=p_course_id;

  IF v_total_assessments < 1 OR v_total_assessments > 200
     OR v_not_ready > 0 OR v_total_assignments > 200
     OR (v_course."hasAssignments" IS TRUE AND
         v_total_assignments < GREATEST(1,COALESCE(v_course."assignmentCount",0))) THEN
    RAISE EXCEPTION 'Course requirements incomplete';
  END IF;

  v_expected := jsonb_build_object(
    'courseId', p_course_id,
    'courseLayout', v_course."courseLayout",
    'assessments', v_assessments,
    'assignments', v_assignments
  );
  IF v_expected IS DISTINCT FROM p_manifest THEN
    RAISE EXCEPTION 'Course content changed before publication';
  END IF;

  SELECT COALESCE(MAX("revisionNumber"),0)+1 INTO v_next
    FROM "trustedCourseRevisions" WHERE "courseId"=p_course_id;
  v_id := md5(p_course_id || ':' || v_next::text || ':' || clock_timestamp()::text ||
              ':' || random()::text);
  INSERT INTO "trustedCourseRevisions" (
    "id","courseId","revisionNumber","fingerprint","manifestVersion",
    "manifestSnapshot","publishedBy"
  ) VALUES (
    v_id,p_course_id,v_next,p_fingerprint,'course-manifest-sha256-v1',
    p_manifest,p_actor
  );
  RETURN jsonb_build_object(
    'revisionId',v_id,'revisionNumber',v_next,
    'fingerprint',p_fingerprint,'manifestVersion','course-manifest-sha256-v1'
  );
END;
$$;
