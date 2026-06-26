require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql('SELECT id, type, status, content FROM "studyTypeContent" WHERE "courseId" = $1 AND type = $2', 
  ['cd892b11-d4f0-4ad5-855b-6ed19c4f40c3', 'Quiz'])
  .then(r => {
    if (r.length === 0) {
      console.log('No Quiz record found!');
      return;
    }
    const rec = r[0];
    console.log('id:', rec.id, 'status:', rec.status);
    const content = typeof rec.content === 'string' ? JSON.parse(rec.content) : rec.content;
    console.log('Content type:', typeof content);
    console.log('Is array:', Array.isArray(content));
    console.log('Has questions:', !!content?.questions);
    if (content?.questions) {
      console.log('Questions count:', content.questions.length);
    } else if (Array.isArray(content)) {
      console.log('Array length:', content.length);
    } else {
      console.log('Keys:', Object.keys(content || {}));
      console.log('Sample:', JSON.stringify(content).substring(0, 300));
    }
  })
  .catch(e => console.log('Error:', e.message));
