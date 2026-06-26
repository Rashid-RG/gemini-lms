require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

// Same hashing method used in lib/adminAuth.js
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

const NEW_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD;
if (!NEW_PASSWORD) {
    console.error('Set ADMIN_DEFAULT_PASSWORD env var');
    process.exit(1);
}

async function resetAdminPassword() {
    try {
        // Get all admins
        const admins = await sql`SELECT id, email, name, role FROM admins`;
        
        if (admins.length === 0) {
            console.log('No admin accounts found. Go to /admin/setup to create one.');
            return;
        }

        console.log('Found admin accounts:');
        admins.forEach(a => console.log(`  - ${a.email} (${a.role})`));

        // Reset password for all admins
        const hashedPassword = hashPassword(NEW_PASSWORD);
        
        for (const admin of admins) {
            await sql`UPDATE admins SET "passwordHash" = ${hashedPassword}, "updatedAt" = NOW() WHERE id = ${admin.id}`;
            console.log(`\n✅ Password reset for: ${admin.email}`);
        }

        console.log(`\n========================================`);
        console.log(`  Login: http://localhost:3000/admin/login`);
        console.log(`  Email: ${admins[0].email}`);
        console.log(`  Password: ${NEW_PASSWORD}`);
        console.log(`========================================\n`);
        console.log('⚠️  Please change this password after logging in!');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

resetAdminPassword();
