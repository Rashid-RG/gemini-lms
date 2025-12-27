/**
 * CSV Export Utility
 * Generates CSV files for admin data exports
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions { key, header }
 * @returns {string} CSV string
 */
export function arrayToCSV(data, columns) {
    if (!data || data.length === 0) return '';

    // Header row
    const headers = columns.map(col => `"${col.header}"`).join(',');

    // Data rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = getNestedValue(item, col.key);
            
            // Handle different data types
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            } else if (typeof value === 'boolean') {
                value = value ? 'Yes' : 'No';
            } else if (value instanceof Date) {
                value = value.toISOString();
            }
            
            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        }).join(',');
    });

    return [headers, ...rows].join('\n');
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

/**
 * Trigger CSV download in browser
 * @param {string} csvContent - CSV string
 * @param {string} filename - Download filename
 */
export function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Pre-defined column configurations for common exports
 */
export const EXPORT_COLUMNS = {
    submissions: [
        { key: 'id', header: 'Submission ID' },
        { key: 'studentEmail', header: 'Student Email' },
        { key: 'course.topic', header: 'Course' },
        { key: 'assignment.title', header: 'Assignment' },
        { key: 'submittedAt', header: 'Submitted At' },
        { key: 'status', header: 'Status' },
        { key: 'score', header: 'Score' },
        { key: 'gradedBy', header: 'Graded By' },
        { key: 'feedback', header: 'Feedback' }
    ],
    users: [
        { key: 'id', header: 'User ID' },
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'isMember', header: 'Is Member' },
        { key: 'credits', header: 'Credits' },
        { key: 'totalCreditsUsed', header: 'Total Credits Used' },
        { key: 'createdAt', header: 'Joined At' }
    ],
    courses: [
        { key: 'id', header: 'Course ID' },
        { key: 'courseId', header: 'Course UUID' },
        { key: 'topic', header: 'Topic' },
        { key: 'courseType', header: 'Type' },
        { key: 'difficultyLevel', header: 'Difficulty' },
        { key: 'createdBy', header: 'Created By' },
        { key: 'status', header: 'Status' },
        { key: 'totalStudents', header: 'Total Students' },
        { key: 'averageRating', header: 'Avg Rating' },
        { key: 'createdAt', header: 'Created At' }
    ],
    activityLog: [
        { key: 'id', header: 'Log ID' },
        { key: 'adminEmail', header: 'Admin' },
        { key: 'action', header: 'Action' },
        { key: 'targetType', header: 'Target Type' },
        { key: 'targetId', header: 'Target ID' },
        { key: 'studentEmail', header: 'Student' },
        { key: 'courseId', header: 'Course ID' },
        { key: 'createdAt', header: 'Timestamp' }
    ],
    grades: [
        { key: 'studentEmail', header: 'Student Email' },
        { key: 'studentName', header: 'Student Name' },
        { key: 'courseTopic', header: 'Course' },
        { key: 'assignmentTitle', header: 'Assignment' },
        { key: 'score', header: 'Score' },
        { key: 'status', header: 'Status' },
        { key: 'submittedAt', header: 'Submitted' },
        { key: 'gradedAt', header: 'Graded' },
        { key: 'gradedBy', header: 'Graded By' }
    ]
};

/**
 * Format date for filename
 */
export function getExportFilename(prefix) {
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}_${date}.csv`;
}
