const { neon } = require('@neondatabase/serverless');

async function checkUsers() {
    const connectionString = "postgresql://neondb_owner:npg_d8Fgih1lWUqH@ep-cool-tree-a4ll1itd-pooler.us-east-1.aws.neon.tech/AI-Study-Material-Gen?sslmode=require";
    const sql = neon(connectionString);
    
    console.log('=== Registered Users ===');
    const users = await sql`SELECT id, name, email, "createdAt" FROM users ORDER BY "createdAt" DESC`;
    console.log(`Total users: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));

    console.log('\n=== Course Enrollments ===');
    const enrollments = await sql`SELECT id, "courseId", "studentEmail", "enrolledAt" FROM "courseEnrollments" ORDER BY "enrolledAt" DESC`;
    console.log(`Total enrollments: ${enrollments.length}`);
    console.log(JSON.stringify(enrollments, null, 2));
}

checkUsers().catch(console.error);
