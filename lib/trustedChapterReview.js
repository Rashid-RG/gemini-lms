// Advisory chapter activity audit. A valid heartbeat is client-triggered and
// therefore NOT proof of reading, attention, comprehension or course completion.
export const CHAPTER_REVIEW_POLICY_VERSION = "chapter-review-v1";

const finiteTime = value => value != null && Number.isFinite(new Date(value).getTime());

export function buildChapterCompletionReview({
  chapterEvidence, sessions, activityEnabled = false, truncated = false
}) {
  if (!chapterEvidence || !Array.isArray(chapterEvidence.chapters) || !Array.isArray(sessions))
    throw new TypeError("Missing chapter review evidence");
  const validChapters = chapterEvidence.evidenceStatus === "assessment_evidence_only" &&
    chapterEvidence.chapters.length > 0;
  if (activityEnabled && (truncated || sessions.some(session =>
    !Number.isSafeInteger(session.chapterIndex) || session.chapterIndex < 0 ||
    !Number.isSafeInteger(session.heartbeatCount) || session.heartbeatCount < 0 ||
    !finiteTime(session.startedAt) || !finiteTime(session.expiresAt) ||
    new Date(session.expiresAt) <= new Date(session.startedAt) ||
    (session.closedAt != null && !finiteTime(session.closedAt))
  ))) {
    return {
      policyVersion: CHAPTER_REVIEW_POLICY_VERSION, status: "incomplete_data",
      chapterCompletionVerified: false, eligibleForCertificate: false,
      chapters: []
    };
  }
  const byChapter = new Map();
  if (activityEnabled) {
    for (const session of sessions) {
      const prior = byChapter.get(session.chapterIndex) || { sessions: 0, acceptedHeartbeats: 0 };
      prior.sessions += 1;
      prior.acceptedHeartbeats += session.heartbeatCount;
      byChapter.set(session.chapterIndex, prior);
    }
  }
  const chapters = validChapters ? chapterEvidence.chapters.map(chapter => ({
    chapterId: chapter.chapterId,
    assessmentCheckpointsPassed: chapter.assessmentCheckpointsPassed === true,
    observedSessions: byChapter.get(chapter.chapterId)?.sessions || 0,
    acceptedHeartbeats: byChapter.get(chapter.chapterId)?.acceptedHeartbeats || 0,
    activityEvidenceStatus: activityEnabled ? "observational_only" : "not_enabled",
    chapterCompletionVerified: false
  })) : [];
  return {
    policyVersion: CHAPTER_REVIEW_POLICY_VERSION,
    status: validChapters ? "awaiting_trusted_completion_evidence" : "incomplete_data",
    chapterCompletionVerified: false,
    eligibleForCertificate: false,
    chapters
  };
}
