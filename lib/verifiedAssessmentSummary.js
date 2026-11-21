// Deterministic read model for verified attempts. No mutable counters, no replays.
// Only opaque assessment IDs and aggregated scores are returned to a student.
export function summarizeVerifiedAttempts(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Expected assessment attempt records");
  const groups = new Map();
  for (const row of rows) {
    if (row.status !== "submitted" || row.mlEligibility !== "server_verified") continue;
    if (!Number.isSafeInteger(row.studyTypeContentId) || row.studyTypeContentId < 1 ||
        !Number.isInteger(row.score) || row.score < 0 || row.score > 100 ||
        typeof row.id !== "string" || !row.id) throw new TypeError("Invalid verified attempt");
    const key = row.studyTypeContentId;
    let group = groups.get(key);
    if (!group) {
      group = { assessmentId: key, totalAttempts: 0, scoreSum: 0, lastSubmittedAt: null, seen: new Set() };
      groups.set(key, group);
    }
    if (group.seen.has(row.id)) continue;
    group.seen.add(row.id);
    group.totalAttempts += 1;
    group.scoreSum += row.score;
    const submittedAt = new Date(row.submittedAt);
    if (!Number.isFinite(submittedAt.getTime())) throw new TypeError("Invalid submission timestamp");
    if (!group.lastSubmittedAt || submittedAt > new Date(group.lastSubmittedAt)) {
      group.lastSubmittedAt = submittedAt.toISOString();
    }
  }
  return [...groups.values()].map(({ assessmentId, totalAttempts, scoreSum, lastSubmittedAt }) => {
    const averageScore = Math.round(scoreSum / totalAttempts);
    const masteryLevel = totalAttempts >= 2 && averageScore >= 85 ? "expert" :
      averageScore >= 80 ? "proficient" : averageScore >= 70 ? "intermediate" :
      averageScore >= 60 ? "beginner" : "novice";
    return { assessmentId, totalAttempts, averageScore, masteryLevel,
      needsReview: averageScore < 70, lastSubmittedAt, provenance: "server_verified" };
  }).sort((a, b) => a.assessmentId - b.assessmentId);
}
