require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql('UPDATE "studyTypeContent" SET status = $1 WHERE status = $2 AND content IS NOT NULL', ['Ready', 'Generating'])
  .then(r => console.log('Fixed records:', r))
  .catch(e => console.log('Error:', e.message));
