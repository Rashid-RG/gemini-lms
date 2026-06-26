require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkRoles() {
    const admins = await sql`SELECT id, email, name, role, "isActive", "lastLoginAt", "createdAt" FROM admins ORDER BY id`;
    
    console.log('\n=== ALL ADMIN ACCOUNTS IN DATABASE ===\n');
    admins.forEach(a => {
        const roleEmoji = a.role === 'super_admin' ? '🛡️' : a.role === 'admin' ? '🔑' : '🎓';
        console.log(`  ${roleEmoji}  ID: ${a.id} | ${a.name} (${a.email})`);
        console.log(`      Role: ${a.role} | Active: ${a.isActive} | Last Login: ${a.lastLoginAt || 'Never'}`);
        console.log('');
    });

    console.log('=== ROLE SUMMARY ===');
    const roles = {};
    admins.forEach(a => { roles[a.role] = (roles[a.role] || 0) + 1; });
    Object.entries(roles).forEach(([role, count]) => {
        const emoji = role === 'super_admin' ? '🛡️' : role === 'admin' ? '🔑' : '🎓';
        console.log(`  ${emoji}  ${role}: ${count}`);
    });
    console.log(`\n  Total: ${admins.length} account(s)\n`);
}

checkRoles().catch(console.error);
