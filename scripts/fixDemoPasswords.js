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
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
    const tutorPassword = process.env.DEMO_TUTOR_PASSWORD;
    if (!adminPassword || !tutorPassword) {
        console.error('Set DEMO_ADMIN_PASSWORD and DEMO_TUTOR_PASSWORD env vars');
        return;
    }

    // Fix Admin password
    const adminHash = hashPassword(adminPassword);
    await sql`UPDATE admins SET "passwordHash" = ${adminHash}, "updatedAt" = NOW() WHERE email = 'admin@demo.com'`;
    console.log('✅ Fixed admin@demo.com password');

    // Fix Tutor password
    const tutorHash = hashPassword(tutorPassword);
    await sql`UPDATE admins SET "passwordHash" = ${tutorHash}, "updatedAt" = NOW() WHERE email = 'tutor@demo.com'`;
    console.log('✅ Fixed tutor@demo.com password');

    console.log('\n🔐 Passwords updated. Login with the credentials from your env vars.');
}

fixPasswords().catch(console.error);
