const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function run() {
    const dbUrl = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING;
    if (!dbUrl) {
        console.error("No database connection string found in .env.local");
        return;
    }

    const sql = neon(dbUrl);

    try {
        console.log("Testing query on mockExams table...");
        const result = await sql`SELECT * FROM "mockExams" LIMIT 1`;
        console.log("SUCCESS mockExams:", result);
    } catch (err) {
        console.error("FAILED mockExams:", err.message || err);
    }

    try {
        console.log("Testing query on courseDiscussions table...");
        const result = await sql`SELECT * FROM "courseDiscussions" LIMIT 1`;
        console.log("SUCCESS courseDiscussions:", result);
    } catch (err) {
        console.error("FAILED courseDiscussions:", err.message || err);
    }
}

run();
