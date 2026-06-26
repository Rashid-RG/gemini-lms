require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
    // Check study type content structure
    const rows = await sql`SELECT id, "courseId", type, content, status FROM "studyTypeContent" LIMIT 5`;
    for (const row of rows) {
        console.log('ID:', row.id, '| Type:', row.type, '| Status:', row.status, '| Course:', row.courseId?.substring(0, 8));
        const c = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        if (Array.isArray(c)) {
            console.log('  Content is array with', c.length, 'items');
            if (c[0]) console.log('  First item keys:', Object.keys(c[0]));
            console.log('  Sample:', JSON.stringify(c[0]).substring(0, 300));
        } else {
            console.log('  Content keys:', Object.keys(c || {}));
            console.log('  Sample:', JSON.stringify(c).substring(0, 300));
        }
        console.log('---');
    }

    // Check chapter notes structure
    const notes = await sql`SELECT id, "courseId", "chapterId", notes FROM "chapterNotes" LIMIT 2`;
    for (const n of notes) {
        console.log('Note ID:', n.id, '| Chapter:', n.chapterId);
        console.log('  HTML preview:', String(n.notes).substring(0, 200));
        console.log('---');
    }
}

check().catch(e => console.error('Error:', e.message));
