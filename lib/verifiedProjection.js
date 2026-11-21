// Verification before marking a persisted attempt as synchronized.
// Comparison prevents an existing ledger row with conflicting identity/score
// from being silently treated as a successful projection.
export function matchesVerifiedProjection(attempt, projection) {
  if (!attempt || !projection) return false;
  const aTime = new Date(attempt.submittedAt).getTime();
  const pTime = new Date(projection.submittedAt).getTime();
  return typeof attempt.id === "string" && attempt.id !== "" &&
    attempt.id === projection.attemptId &&
    attempt.studentEmail === projection.studentEmail &&
    attempt.courseId === projection.courseId &&
    Number.isSafeInteger(attempt.studyTypeContentId) &&
    attempt.studyTypeContentId === projection.studyTypeContentId &&
    Number.isInteger(attempt.score) && attempt.score >= 0 && attempt.score <= 100 &&
    attempt.score === projection.score &&
    Number.isFinite(aTime) && aTime === pTime &&
    attempt.status === "submitted" && attempt.mlEligibility === "server_verified";
}
