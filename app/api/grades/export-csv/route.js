import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET /api/grades/export-csv?type=student|instructor&courseId=xxx
 * Export grades to CSV format
 */
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = sessionClaims?.email;
    const url = new URL(req.url);
    const exportType = url.searchParams.get("type") || "student"; // student or instructor
    const courseId = url.searchParams.get("courseId");

    if (exportType === "student") {
      // Export student's grades
      const studentGrades = await db
        .select()
        .from(STUDENT_PROGRESS_TABLE)
        .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, userEmail));

      const coursesData = await Promise.all(
        studentGrades.map(async (grade) => {
          const course = await db
            .select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, grade.courseId));

          return {
            courseId: grade.courseId,
            courseName: course[0]?.topic || "Unknown Course",
            progress: grade.progressPercentage,
            quizAverage: grade.quizScores
              ? Object.values(JSON.parse(grade.quizScores || "{}")).reduce((a, b) => a + b, 0) /
                Object.keys(JSON.parse(grade.quizScores || "{}")).length
              : 0,
            assignmentAverage: grade.assignmentScores
              ? Object.values(JSON.parse(grade.assignmentScores || "{}")).reduce((a, b) => a + b, 0) /
                Object.keys(JSON.parse(grade.assignmentScores || "{}")).length
              : 0,
            mcqAverage: grade.mcqScores
              ? Object.values(JSON.parse(grade.mcqScores || "{}")).reduce((a, b) => a + b, 0) /
                Object.keys(JSON.parse(grade.mcqScores || "{}")).length
              : 0,
            finalGrade: Math.round(
              (Object.values(JSON.parse(grade.quizScores || "{}")).reduce((a, b) => a + b, 0) /
                Object.keys(JSON.parse(grade.quizScores || "{}")).length *
                0.3 +
                Object.values(JSON.parse(grade.assignmentScores || "{}")).reduce((a, b) => a + b, 0) /
                  Object.keys(JSON.parse(grade.assignmentScores || "{}")).length *
                  0.4 +
                Object.values(JSON.parse(grade.mcqScores || "{}")).reduce((a, b) => a + b, 0) /
                  Object.keys(JSON.parse(grade.mcqScores || "{}")).length *
                  0.3) || 0
            ),
            status: grade.status,
            startedAt: grade.startedAt,
            completedAt: grade.completedAt,
          };
        })
      );

      // Create CSV content
      const csv = generateStudentCSV(coursesData, userEmail);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="grades_${userEmail}_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (exportType === "instructor" && courseId) {
      // Export all students' grades for a course (instructor only)
      const course = await db
        .select()
        .from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

      if (!course.length || course[0].createdBy !== userEmail) {
        return NextResponse.json(
          { error: "Unauthorized to export this course" },
          { status: 403 }
        );
      }

      const studentGrades = await db
        .select()
        .from(STUDENT_PROGRESS_TABLE)
        .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));

      const csv = generateInstructorCSV(studentGrades, course[0].topic);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="grades_${course[0].topic}_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting grades:", error);
    return NextResponse.json(
      { error: "Failed to export grades" },
      { status: 500 }
    );
  }
}

function generateStudentCSV(data, email) {
  const headers = [
    "Course Name",
    "Progress %",
    "Quiz Avg",
    "Assignment Avg",
    "MCQ Avg",
    "Final Grade",
    "Status",
    "Started",
    "Completed",
  ];
  const rows = data.map((course) => [
    course.courseName,
    course.progress,
    course.quizAverage.toFixed(2),
    course.assignmentAverage.toFixed(2),
    course.mcqAverage.toFixed(2),
    course.finalGrade,
    course.status,
    course.startedAt?.toISOString().split("T")[0] || "",
    course.completedAt?.toISOString().split("T")[0] || "",
  ]);

  return (
    `Student Email: ${email}\nExport Date: ${new Date().toISOString()}\n\n` +
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  );
}

function generateInstructorCSV(data, courseName) {
  const headers = [
    "Student Email",
    "Progress %",
    "Quiz Avg",
    "Assignment Avg",
    "MCQ Avg",
    "Final Grade",
    "Status",
    "Started",
    "Last Activity",
  ];

  const rows = data.map((student) => {
    const quizAvg = student.quizScores
      ? Object.values(JSON.parse(student.quizScores || "{}")).reduce((a, b) => a + b, 0) /
        Object.keys(JSON.parse(student.quizScores || "{}")).length
      : 0;
    const assignAvg = student.assignmentScores
      ? Object.values(JSON.parse(student.assignmentScores || "{}")).reduce((a, b) => a + b, 0) /
        Object.keys(JSON.parse(student.assignmentScores || "{}")).length
      : 0;
    const mcqAvg = student.mcqScores
      ? Object.values(JSON.parse(student.mcqScores || "{}")).reduce((a, b) => a + b, 0) /
        Object.keys(JSON.parse(student.mcqScores || "{}")).length
      : 0;
    const finalGrade = Math.round(quizAvg * 0.3 + assignAvg * 0.4 + mcqAvg * 0.3);

    return [
      student.studentEmail,
      student.progressPercentage,
      quizAvg.toFixed(2),
      assignAvg.toFixed(2),
      mcqAvg.toFixed(2),
      finalGrade,
      student.status,
      student.startedAt?.toISOString().split("T")[0] || "",
      student.lastActivityAt?.toISOString().split("T")[0] || "",
    ];
  });

  return (
    `Course: ${courseName}\nExport Date: ${new Date().toISOString()}\n\n` +
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  );
}
