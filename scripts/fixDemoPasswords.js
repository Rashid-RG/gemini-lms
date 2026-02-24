require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

// Must match lib/adminAuth.js: 100000 iterations
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function fixPasswords() {
    // Fix Admin password
    const adminHash = hashPassword('Admin@123');
    await sql`UPDATE admins SET "passwordHash" = ${adminHash}, "updatedAt" = NOW() WHERE email = 'admin@demo.com'`;
    console.log('✅ Fixed admin@demo.com password → Admin@123');

    // Fix Tutor password
    const tutorHash = hashPassword('Tutor@123');
    await sql`UPDATE admins SET "passwordHash" = ${tutorHash}, "updatedAt" = NOW() WHERE email = 'tutor@demo.com'`;
    console.log('✅ Fixed tutor@demo.com password → Tutor@123');

    console.log('\n🔐 You can now login:');
    console.log('   Admin: admin@demo.com / Admin@123');
    console.log('   Tutor: tutor@demo.com / Tutor@123');
}

fixPasswords().catch(console.error);
