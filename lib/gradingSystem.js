/**
 * Grading System Configuration
 * Defines the grading scale used throughout the application
 */

export const GRADING_SCALE = [
    { grade: 'A+', min: 85, max: 100, color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-300' },
    { grade: 'A', min: 75, max: 84, color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' },
    { grade: 'A-', min: 70, max: 74, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
    { grade: 'B+', min: 65, max: 69, color: 'text-cyan-600', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-300' },
    { grade: 'B', min: 60, max: 64, color: 'text-blue-500', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-300' },
    { grade: 'B-', min: 55, max: 59, color: 'text-indigo-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-300' },
    { grade: 'C+', min: 50, max: 54, color: 'text-purple-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300' },
    { grade: 'C', min: 46, max: 49, color: 'text-yellow-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' },
    { grade: 'C-', min: 40, max: 45, color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-300' },
    { grade: 'S', min: 35, max: 39, color: 'text-orange-700', bgColor: 'bg-orange-200', borderColor: 'border-orange-400' },
    { grade: 'F', min: 0, max: 34, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
];

/**
 * Get grade color based on score
 * @param {number} score - Student's score (0-100)
 * @returns {string} Tailwind CSS color class
 */
export const getGradeColor = (score) => {
    const gradeEntry = GRADING_SCALE.find(entry => score >= entry.min && score <= entry.max);
    return gradeEntry?.color || 'text-red-600';
};

/**
 * Get background color based on score
 * @param {number} score - Student's score (0-100)
 * @returns {string} Tailwind CSS background color class
 */
export const getGradeBgColor = (score) => {
    const gradeEntry = GRADING_SCALE.find(entry => score >= entry.min && score <= entry.max);
    return gradeEntry?.bgColor || 'bg-red-100';
};

/**
 * Get border color based on score
 * @param {number} score - Student's score (0-100)
 * @returns {string} Tailwind CSS border color class
 */
export const getGradeBorderColor = (score) => {
    const gradeEntry = GRADING_SCALE.find(entry => score >= entry.min && score <= entry.max);
    return gradeEntry?.borderColor || 'border-red-300';
};

/**
 * Get grade letter based on score
 * @param {number} score - Student's score (0-100)
 * @returns {string} Grade letter (A+, A, A-, B+, B, B-, C+, C, C-, S, F)
 */
export const getGradeLabel = (score) => {
    const gradeEntry = GRADING_SCALE.find(entry => score >= entry.min && score <= entry.max);
    return gradeEntry?.grade || 'F';
};

/**
 * Get grade description based on score
 * @param {number} score - Student's score (0-100)
 * @returns {string} Grade description
 */
export const getGradeDescription = (score) => {
    if (score >= 85) return 'Outstanding';
    if (score >= 75) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 55) return 'Adequate';
    if (score >= 50) return 'Acceptable';
    if (score >= 46) return 'Fair';
    if (score >= 40) return 'Below Average';
    if (score >= 35) return 'Poor';
    return 'Unsatisfactory';
};
