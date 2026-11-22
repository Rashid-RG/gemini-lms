// Read-only chapter assessment evidence from authoritative graded attempts.
// A passed quiz establishes an assessment checkpoint, NOT proof of lesson reading
// or certificate-ready chapter completion. No browser progress fields are trusted.
const isId = value => Number.isSafeInteger(value) && value > 0;
const isTime = value => value != null && Number.isFinite(new Date(value).getTime());

export function summarizeTrustedChapterEvidence({ chapters, assessments, attempts, truncated = false }) {
  if (!Array.isArray(chapters) || !Array.isArray(assessments) || !Array.isArray(attempts))
    throw new TypeError("Chapter evidence requires arrays");
  if (truncated || chapters.length === 0) {
    return {
      evidenceStatus: "incomplete_data", allAssessmentCheckpointsPassed: false,
      chapterCompletionVerified: false, chapters: []
    };
  }
  const chapterIds = new Set();
  for (const chapterId of chapters) {
    if (!isId(chapterId) || chapterIds.has(chapterId))
      throw new TypeError("Invalid chapter catalog");
    chapterIds.add(chapterId);
  }
  const assessmentMap = new Map();
  const byChapter = new Map([...chapterIds].map(id => [id, []]));
  for (const assessment of assessments) {
    if (!isId(assessment.id) || !isId(assessment.chapterId) ||
        !["Quiz", "MCQ"].includes(assessment.type) ||
        !chapterIds.has(assessment.chapterId) || assessmentMap.has(assessment.id))
      throw new TypeError("Invalid chapter assessment mapping");
    assessmentMap.set(assessment.id, assessment);
    byChapter.get(assessment.chapterId).push(assessment.id);
  }
  const latest = new Map();
  for (const attempt of attempts) {
    if (attempt.status !== "submitted" || attempt.mlEligibility !== "server_verified") continue;
    if (!assessmentMap.has(attempt.studyTypeContentId)) continue;
    if (typeof attempt.id !== "string" || !attempt.id ||
        !Number.isInteger(attempt.score) || attempt.score < 0 || attempt.score > 100 ||
        !isTime(attempt.submittedAt)) throw new TypeError("Invalid verified chapter attempt");
    const time = new Date(attempt.submittedAt).getTime();
    const previous = latest.get(attempt.studyTypeContentId);
    if (!previous || time > previous.time || (time === previous.time && attempt.id > previous.id))
      latest.set(attempt.studyTypeContentId, { id: attempt.id, score: attempt.score, time });
  }
  const results = [...chapterIds].sort((a, b) => a - b).map(chapterId => {
    const assessmentsForChapter = byChapter.get(chapterId);
    const checks = assessmentsForChapter.map(assessmentId => {
      const recent = latest.get(assessmentId);
      return {
        assessmentId,
        latestVerifiedScore: recent?.score ?? null,
        passed: Boolean(recent && recent.score >= 60)
      };
    }).sort((a, b) => a.assessmentId - b.assessmentId);
    return {
      chapterId, assessmentCount: checks.length, checkpoints: checks,
      assessmentCheckpointsPassed: checks.length > 0 && checks.every(check => check.passed),
      chapterCompletionVerified: false,
      reason: checks.length === 0 ? "no_verifiable_chapter_assessment" :
        checks.every(check => check.passed) ? "reading_completion_not_verified" :
        "assessment_checkpoint_incomplete"
    };
  });
  return {
    evidenceStatus: "assessment_evidence_only",
    allAssessmentCheckpointsPassed: results.every(chapter => chapter.assessmentCheckpointsPassed),
    chapterCompletionVerified: false,
    chapters: results
  };
}
