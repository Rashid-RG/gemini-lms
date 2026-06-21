require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function createDemoAccounts() {
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
    const tutorPassword = process.env.DEMO_TUTOR_PASSWORD;
    if (!adminPassword || !tutorPassword) {
        console.error('Set DEMO_ADMIN_PASSWORD and DEMO_TUTOR_PASSWORD env vars');
        return;
    }

    // Create a demo Admin
    const adminHash = hashPassword(adminPassword);
    try {
        await sql`INSERT INTO admins (email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
                  VALUES ('geminilmsadmin@gmail.com', ${adminHash}, 'Demo Admin', 'admin', true, NOW(), NOW())
                  ON CONFLICT (email) DO NOTHING`;
        console.log('✅ Admin account created: geminilmsadmin@gmail.com');
    } catch (e) {
        console.log('ℹ️  Admin already exists or error:', e.message);
    }

    // Create a demo Tutor
    const tutorHash = hashPassword(tutorPassword);
    try {
        await sql`INSERT INTO admins (email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
                  VALUES ('geminilmsturor@gmail.com', ${tutorHash}, 'Demo Tutor', 'tutor', true, NOW(), NOW())
                  ON CONFLICT (email) DO NOTHING`;
        console.log('✅ Tutor account created: geminilmsturor@gmail.com');
    } catch (e) {
        console.log('ℹ️  Tutor already exists or error:', e.message);
    }

    // Now show all accounts
    const admins = await sql`SELECT id, email, name, role, "isActive" FROM admins ORDER BY id`;
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              ADMINS TABLE - ALL ROLES                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    admins.forEach(a => {
        const emoji = a.role === 'super_admin' ? '🛡️' : a.role === 'admin' ? '🔑' : '🎓';
        const pad = (s, n) => String(s).padEnd(n);
        console.log(`║  ${emoji} ${pad(a.role, 13)} │ ${pad(a.name, 15)} │ ${pad(a.email, 22)} ║`);
    });
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    console.log('\n📌 All 3 roles live in the SAME "admins" table');
    console.log('📌 The "role" column tells them apart: super_admin / admin / tutor');
    console.log('\n🔐 Demo credentials:');
    console.log('   Admin: geminilmsadmin@gmail.com / Admin@123');
    console.log('   Tutor: geminilmsturor@gmail.com / Tutor@123\n');
}

createDemoAccounts().catch(console.error);
