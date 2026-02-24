require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

async function checkAdmin() {
    const rows = await sql`SELECT id, email, name, role, "isActive", "passwordHash" FROM admins`;
    rows.forEach(a => {
        console.log('ID:', a.id);
        console.log('Email:', a.email);
        console.log('Name:', a.name);
        console.log('Role:', a.role);
        console.log('Active:', a.isActive);
        console.log('Hash (first 60):', a.passwordHash?.substring(0, 60));
        console.log('Hash has colon:', a.passwordHash?.includes(':'));
        console.log('Hash length:', a.passwordHash?.length);
        console.log('---');
    });

    // Now verify the password directly
    const crypto = require('crypto');
    const password = 'Admin@123';
    
    for (const admin of rows) {
        const [salt, hash] = admin.passwordHash.split(':');
        console.log('Salt length:', salt?.length);
        console.log('Hash part length:', hash?.length);
        const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        console.log('Password match:', hash === verifyHash);
    }
}

checkAdmin().catch(e => console.error('Error:', e.message));
