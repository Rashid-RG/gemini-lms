require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  // Get the PendingReview course
  const courses = await sql('SELECT "courseId" FROM "studyMaterial" ORDER BY id DESC LIMIT 3');
  
  for (const course of courses) {
    console.log('\nCourse:', course.courseId);
    const content = await sql(
      'SELECT id, type, status, content IS NOT NULL as has_content FROM "studyTypeContent" WHERE "courseId" = $1',
      [course.courseId]
    );
    if (content.length === 0) {
      console.log('  No study type content records found!');
    } else {
      content.forEach(c => console.log(`  - id:${c.id} type:${c.type} status:${c.status} hasContent:${c.has_content}`));
    }
  }
}

check().catch(e => console.error(e.message));
