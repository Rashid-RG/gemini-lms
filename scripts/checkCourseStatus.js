require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

sql('SELECT status FROM "studyMaterial" WHERE "courseId" = $1', ['cd892b11-d4f0-4ad5-855b-6ed19c4f40c3'])
  .then(r => console.log('Course status:', r[0]?.status))
  .catch(e => console.log('Error:', e.message));
