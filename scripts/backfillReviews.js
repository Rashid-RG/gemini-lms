require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function backfill() {
    // Get all feedback that doesn't have a matching review
    const feedback = await sql`SELECT * FROM "contentFeedback" WHERE status = 'open'`;
    
    for (const f of feedback) {
        const existing = await sql`
            SELECT id FROM "contentReview" 
            WHERE "courseId" = ${f.courseId} 
            AND "contentType" = ${f.contentType} 
            AND status = 'pending'
        `;
        
        if (existing.length === 0) {
            await sql`
                INSERT INTO "contentReview" 
                ("courseId", "contentType", status, priority, "flaggedBy", "flagReason", "autoFlagged", "createdAt", "updatedAt")
                VALUES (${f.courseId}, ${f.contentType}, 'pending', 'normal', ${f.studentEmail}, ${'Student reported: ' + f.issueType + ' - ' + f.description}, false, NOW(), NOW())
            `;
            console.log(`Created review for feedback #${f.id}`);
        }
    }
    
    // Verify
    const reviews = await sql`SELECT id, "contentType", status, priority, "flaggedBy" FROM "contentReview"`;
    console.log('\nReview queue now:', reviews.length, 'items');
    reviews.forEach(r => console.log(`  ID:${r.id} | ${r.contentType} | ${r.status} | ${r.priority} | ${r.flaggedBy}`));
}

backfill().catch(e => console.error('Error:', e.message));
