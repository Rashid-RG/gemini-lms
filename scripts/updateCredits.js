const { neon } = require('@neondatabase/serverless');

async function updateCredits() {
    const sql = neon('postgresql://neondb_owner:npg_d8Fgih1lWUqH@ep-cool-tree-a4ll1itd-pooler.us-east-1.aws.neon.tech/AI-Study-Material-Gen?sslmode=require');
    
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
