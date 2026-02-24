require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

async function check() {
    const types = await sql`SELECT DISTINCT type FROM "studyTypeContent"`;
    console.log('Types in DB:', types.map(x => x.type));
    
    // Also check what the review item looks like
    const reviews = await sql`SELECT * FROM "contentReview" ORDER BY id DESC LIMIT 3`;
    reviews.forEach(r => {
        console.log('\nReview:', JSON.stringify(r, null, 2));
    });
}
check().catch(e => console.error(e.message));
