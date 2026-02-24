require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

async function check() {
    console.log('=== Content Feedback (student reports) ===');
    const feedback = await sql`SELECT * FROM "contentFeedback" ORDER BY "createdAt" DESC LIMIT 10`;
    feedback.forEach(f => {
        console.log(`  ID:${f.id} | Type:${f.contentType} | Issue:${f.issueType} | Status:${f.status} | Course:${f.courseId?.substring(0,8)}...`);
    });
    console.log(`  Total: ${feedback.length}`);

    console.log('\n=== Content Reviews (admin queue) ===');
    const reviews = await sql`SELECT * FROM "contentReview" ORDER BY "createdAt" DESC LIMIT 10`;
    reviews.forEach(r => {
        console.log(`  ID:${r.id} | Type:${r.contentType} | Status:${r.status} | Priority:${r.priority} | FlaggedBy:${r.flaggedBy} | Course:${r.courseId?.substring(0,8)}...`);
    });
    console.log(`  Total: ${reviews.length}`);
}

check().catch(e => console.error('Error:', e.message));
