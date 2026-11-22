// Accept only a complete integer score, not parseInt's partial conversions.
// Never derive an official manual grade from browser-supplied text without
// authenticated reviewer authorization at the API boundary.
export function parseManualGrade(value) {
  if (typeof value !== "number" || !Number.isInteger(value) ||
      !Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError("Manual grade must be an integer between 0 and 100");
  }
  return value;
}
