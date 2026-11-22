import { createHash } from "node:crypto";

// Provisional manifest fingerprints are for drift detection only.
// They are NOT signed, persisted, immutable, or proof of an approved course version.
// Keep private answer keys inside the digest computation; never return source content.
export const COURSE_MANIFEST_FINGERPRINT_VERSION = "course-manifest-sha256-v1";
const LIMIT = 2_000_000;

function canonical(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Invalid numeric manifest value");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Cyclic manifest");
    seen.add(value);
    const result = "[" + value.map(item => canonical(item, seen)).join(",") + "]";
    seen.delete(value);
    return result;
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("Unsupported manifest value");
  }
  if (seen.has(value)) throw new TypeError("Cyclic manifest");
  seen.add(value);
  const keys = Object.keys(value).sort();
  if (keys.some(key => key === "__proto__" || key === "constructor" || key === "prototype")) {
    throw new TypeError("Unsafe manifest keys");
  }
  const result = "{" + keys.map(key => {
    if (value[key] === undefined) throw new TypeError("Undefined manifest value");
    return JSON.stringify(key) + ":" + canonical(value[key], seen);
  }).join(",") + "}";
  seen.delete(value);
  return result;
}

export function fingerprintCourseManifest({ courseId, courseLayout, assessments, assignments, incomplete = false }) {
  if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 255 ||
      !Array.isArray(assessments) || !Array.isArray(assignments) ||
      !Array.isArray(courseLayout?.chapters) || courseLayout.chapters.length < 1 ||
      courseLayout.chapters.length > 200 || assessments.length < 1 ||
      assessments.length > 200 || assignments.length > 200 || incomplete) {
    return { version: COURSE_MANIFEST_FINGERPRINT_VERSION, status: "incomplete_data", fingerprint: null, frozen: false };
  }
  const ids = new Set();
  for (const item of assessments) {
    if (!Number.isSafeInteger(item.id) || item.id < 1 ||
        !Number.isSafeInteger(item.chapterId) || item.chapterId < 0 ||
        item.chapterId >= courseLayout.chapters.length ||
        !["Quiz", "MCQ"].includes(item.type) || ids.has(item.id) ||
        item.content == null) {
      return { version: COURSE_MANIFEST_FINGERPRINT_VERSION, status: "incomplete_data", fingerprint: null, frozen: false };
    }
    ids.add(item.id);
  }
  const assignmentIds = new Set();
  for (const assignment of assignments) {
    if (typeof assignment.assignmentId !== "string" || !assignment.assignmentId.trim() ||
        assignmentIds.has(assignment.assignmentId)) {
      return { version: COURSE_MANIFEST_FINGERPRINT_VERSION, status: "incomplete_data", fingerprint: null, frozen: false };
    }
    assignmentIds.add(assignment.assignmentId);
  }
  const manifest = {
    courseId, courseLayout,
    assessments: [...assessments].sort((a, b) => a.id - b.id).map(a => ({
      id: a.id, chapterId: a.chapterId, type: a.type, content: a.content
    })),
    assignments: [...assignments].sort((a, b) => a.assignmentId.localeCompare(b.assignmentId)).map(a => ({
      assignmentId: a.assignmentId, title: a.title, description: a.description,
      rubric: a.rubric, totalPoints: a.totalPoints
    }))
  };
  const serialized = canonical(manifest);
  if (Buffer.byteLength(serialized, "utf8") > LIMIT) {
    return { version: COURSE_MANIFEST_FINGERPRINT_VERSION, status: "incomplete_data", fingerprint: null, frozen: false };
  }
  return {
    version: COURSE_MANIFEST_FINGERPRINT_VERSION,
    status: "provisional_unfrozen",
    fingerprint: createHash("sha256").update(serialized).digest("hex"),
    frozen: false
  };
}

export function compareCourseFingerprint(current, expected) {
  if (expected == null) return "not_requested";
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/i.test(expected)) return "invalid_reference";
  if (current?.status !== "provisional_unfrozen" || !current.fingerprint) return "incomplete_data";
  return current.fingerprint === expected.toLowerCase() ? "unchanged" : "changed";
}
