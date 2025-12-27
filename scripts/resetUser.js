require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

async function resetUser() {
    try {
        // Reset user to Free tier
        await sql`UPDATE users SET credits = 5, "isMember" = false WHERE email = 'darkmotosu@gmail.com'`;
        console.log('✅ User reset to Free tier');
        
        // Verify
        const result = await sql`SELECT email, credits, "isMember" FROM users WHERE email = 'darkmotosu@gmail.com'`;
        console.log('Current state:', result[0]);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

resetUser();
