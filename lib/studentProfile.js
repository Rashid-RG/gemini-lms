export const REQUIRED_STUDENT_PROFILE_FIELDS = [
  { key: "name", label: "Full Name" },
  { key: "studentIdentifier", label: "Student ID" },
  { key: "phoneNumber", label: "Phone Number" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "emergencyContactName", label: "Guardian / Emergency Contact Name" },
  { key: "emergencyContactPhone", label: "Guardian / Emergency Contact Phone" },
  { key: "guardianEmail", label: "Guardian Email" },
  { key: "guardianRelationship", label: "Guardian Relationship" },
]

export function getMissingStudentProfileFields(profile = {}) {
  return REQUIRED_STUDENT_PROFILE_FIELDS.filter(({ key }) => {
    const value = profile?.[key]
    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
    }
    return value === null || value === undefined || String(value).trim() === ""
  })
}

export function evaluateStudentProfileCompleteness(profile = {}) {
  const missingFields = getMissingStudentProfileFields(profile)
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    missingLabels: missingFields.map((field) => field.label),
  }
}