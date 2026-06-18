const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function run() {
    const dbUrl = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING;
    const sql = neon(dbUrl);

    try {
        console.log("Fetching course details...");
        const courses = await sql`SELECT "courseId", topic, status, "includeVideos", videos, "hasAssignments", "createdAt" FROM "studyMaterial" ORDER BY "createdAt" DESC LIMIT 10`;
        console.log("Courses found:", JSON.stringify(courses, null, 2));

        if (courses.length > 0) {
            for (const course of courses) {
                const courseId = course.courseId;
                console.log(`\n===================================`);
                console.log(`Details for courseId: ${courseId} (${course.topic})`);
                console.log(`Status: ${course.status}, includeVideos: ${course.includeVideos}, Has Videos: ${!!course.videos}`);
                
                const notes = await sql`SELECT "chapterId" FROM "chapterNotes" WHERE "courseId" = ${courseId} ORDER BY "chapterId"`;
                console.log("Chapter Notes IDs generated:", notes.map(n => n.chapterId));

                const studyContent = await sql`SELECT type, status, count(*) FROM "studyTypeContent" WHERE "courseId" = ${courseId} GROUP BY type, status`;
                console.log("Study Type Content status count:", studyContent);

                const assignments = await sql`SELECT title FROM "courseAssignments" WHERE "courseId" = ${courseId}`;
                console.log("Course Assignments generated:", assignments.map(a => a.title));
            }
        } else {
            console.log("No courses matching topic found.");
        }
    } catch (err) {
        console.error("FAILED:", err);
    }
}

run();
