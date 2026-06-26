require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const reviews = await sql('SELECT count(*) as cnt FROM "contentReview"');
    console.log('Total review items:', reviews[0].cnt);

    const pending = await sql('SELECT count(*) as cnt FROM "contentReview" WHERE status = $1', ['pending']);
    console.log('Pending reviews:', pending[0].cnt);

    const courses = await sql('SELECT "courseId", status FROM "studyMaterial" WHERE status = $1 ORDER BY id DESC LIMIT 5', ['PendingReview']);
    console.log('Courses with PendingReview status:', courses.length);
    courses.forEach(c => console.log('  -', c.courseId, c.status));

    if (courses.length > 0) {
      const courseId = courses[0].courseId;
      const courseReviews = await sql('SELECT id, "contentType", status FROM "contentReview" WHERE "courseId" = $1', [courseId]);
      console.log('\nReview items for latest course (' + courseId + '):', courseReviews.length);
      courseReviews.forEach(r => console.log('  -', r.id, r.contentType, r.status));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
