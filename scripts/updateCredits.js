const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function updateCredits() {
    const sql = neon(process.env.DATABASE_URL);
    
    // Update to premium
    console.log('Updating user to Premium...');
    await sql`UPDATE users SET credits = 999999, "isMember" = true WHERE email = 'darkmotosu@gmail.com'`;
    
    // Verify
    const users = await sql`SELECT id, name, email, credits, "isMember" FROM users WHERE email = 'darkmotosu@gmail.com'`;
    console.log('Updated User:', JSON.stringify(users, null, 2));
    
    // Add payment record
    console.log('Adding payment record...');
    await sql`INSERT INTO "paymentRecord" ("userEmail", amount, currency, plan, "planType", "creditsAdded", status, "paymentMethod", "sessionId") 
              VALUES ('darkmotosu@gmail.com', '1500', 'lkr', 'premium_monthly', 'subscription', 999999, 'completed', 'payhere', 'MANUAL_UPDATE')`;
    
    console.log('Done! Refresh your dashboard to see the changes.');
}

updateCredits().catch(console.error);
