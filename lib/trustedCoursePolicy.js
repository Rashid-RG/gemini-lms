// Trusted course assessment policy v1: read-only, fail-closed and versioned.
// Never issues certificates, updates progress, or accepts client-reported scores.
export const TRUSTED_COURSE_POLICY_VERSION = "trusted-course-v1";
export const TRUSTED_PASS_THRESHOLD = 60;

const validScore = score => Number.isInteger(score) && score >= 0 && score <= 100;
const validId = id => Number.isSafeInteger(id) && id > 0;
const validTimestamp = value => value != null && Number.isFinite(new Date(value).getTime());

export function evaluateTrustedCourseAssessments({
  assessments, attempts, assignments, submissions,
  truncated = false
}) {
  if (!Array.isArray(assessments) || !Array.isArray(attempts) ||
      !Array.isArray(assignments) || !Array.isArray(submissions)) {
    throw new TypeError("Expected assessment and submission arrays");
  }
  // A truncated or empty catalog cannot authorize a completion decision.
  if (truncated || assessments.length === 0) {
    return {
      policyVersion: TRUSTED_COURSE_POLICY_VERSION, status: "pending_review",
      eligibleForCertificate: false, readyForCompletionReview: false,
      reason: truncated ? "incomplete_data" : "no_ready_assessments",
      assessments: [], assignments: []
    };
  }
  const byAssessment = new Map();
  for (const assessment of assessments) {
    if (!validId(assessment.id) || !["Quiz", "MCQ"].includes(assessment.type) ||
        byAssessment.has(assessment.id)) throw new TypeError("Invalid assessment catalog");
    byAssessment.set(assessment.id, { assessmentId: assessment.id, type: assessment.type, score: null });
  }
  // A retry or retake is not cumulative credit. Use latest completed verified
  // attempt per assessment, breaking equal timestamps by ID for determinism.
  const latest = new Map();
  for (const attempt of attempts) {
    if (attempt.status !== "submitted" || attempt.mlEligibility !== "server_verified") continue;
    if (!byAssessment.has(attempt.studyTypeContentId)) continue;
    if (!validScore(attempt.score) || !validTimestamp(attempt.submittedAt) ||
        typeof attempt.id !== "string" || !attempt.id) throw new TypeError("Invalid verified attempt");
    const previous = latest.get(attempt.studyTypeContentId);
    const time = new Date(attempt.submittedAt).getTime();
    if (!previous || time > previous.time || (time === previous.time && attempt.id > previous.id)) {
      latest.set(attempt.studyTypeContentId, { score: attempt.score, id: attempt.id, time });
    }
  }
  const quizResults = [...byAssessment.values()].map(item => {
    const recent = latest.get(item.assessmentId);
    return {
      ...item, score: recent?.score ?? null,
      passed: recent ? recent.score >= TRUSTED_PASS_THRESHOLD : false,
      gradingProvenance: recent ? "server_verified" : "missing"
    };
  }).sort((a, b) => a.assessmentId - b.assessmentId);

  const assignmentIds = new Set();
  const assignmentResults = assignments.map(assignment => {
    if (typeof assignment.assignmentId !== "string" || !assignment.assignmentId.trim() ||
        assignmentIds.has(assignment.assignmentId)) throw new TypeError("Invalid assignment catalog");
    assignmentIds.add(assignment.assignmentId);
    const candidates = submissions.filter(row =>
      row.assignmentId === assignment.assignmentId &&
      validScore(row.score) &&
      row.status === "ManuallyGraded" &&
      typeof row.reviewedBy === "string" && row.reviewedBy.trim() &&
      typeof row.gradedBy === "string" && row.gradedBy.trim() &&
      row.gradedBy.toLowerCase() !== "ai" &&
      validTimestamp(row.reviewedAt) && validTimestamp(row.gradedAt)
    );
    const latestReviewed = candidates.sort((a, b) => {
      const delta = new Date(b.reviewedAt) - new Date(a.reviewedAt);
      return delta || (Number(b.id) || 0) - (Number(a.id) || 0);
    })[0];
    return {
      assignmentId: assignment.assignmentId,
      score: latestReviewed?.score ?? null,
      passed: Boolean(latestReviewed && latestReviewed.score >= TRUSTED_PASS_THRESHOLD),
      gradingProvenance: latestReviewed ? "instructor_reviewed" : "pending_instructor_review"
    };
  }).sort((a, b) => a.assignmentId.localeCompare(b.assignmentId));

  const allAssessmentsPassed = quizResults.every(item => item.passed);
  const allAssignmentsPassed = assignmentResults.every(item => item.passed);
  const readyForCompletionReview = allAssessmentsPassed && allAssignmentsPassed;
  return {
    policyVersion: TRUSTED_COURSE_POLICY_VERSION,
    status: readyForCompletionReview ? "assessment_requirements_met" : "pending_review",
    eligibleForCertificate: false, // No trustworthy chapter-completion proof yet
    readyForCompletionReview,
    reason: !allAssessmentsPassed ? "quiz_requirements_incomplete" :
      !allAssignmentsPassed ? "assignment_review_incomplete" : "chapter_completion_unverified",
    assessments: quizResults, assignments: assignmentResults
  };
}
