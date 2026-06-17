const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function run() {
    const dbUrl = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING;
    const sql = neon(dbUrl);

    try {
        console.log("Fetching courses from studyMaterial...");
        const courses = await sql`SELECT * FROM "studyMaterial" LIMIT 3`;
        console.log("Courses:", JSON.stringify(courses, null, 2));
    } catch (err) {
        console.error("FAILED to fetch courses:", err);
    }
}

run();
