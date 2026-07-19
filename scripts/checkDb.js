const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function checkDatabase() {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('=== Checking User Data ===');
    const users = await sql`SELECT id, name, email, credits, "isMember" FROM users WHERE email = 'darkmotosu@gmail.com'`;
    console.log('User:', JSON.stringify(users, null, 2));
    
    console.log('\n=== Recent Payments ===');
    const payments = await sql`SELECT id, "userEmail", amount, plan, status, "creditsAdded", "createdAt" FROM "paymentRecord" WHERE "userEmail" = 'darkmotosu@gmail.com' ORDER BY "createdAt" DESC LIMIT 5`;
    console.log('Payments:', JSON.stringify(payments, null, 2));
    
    console.log('\n=== Credit Transactions ===');
    const transactions = await sql`SELECT id, "userEmail", amount, type, reason, "balanceBefore", "balanceAfter", "createdAt" FROM "creditTransactions" WHERE "userEmail" = 'darkmotosu@gmail.com' ORDER BY "createdAt" DESC LIMIT 5`;
    console.log('Transactions:', JSON.stringify(transactions, null, 2));
}

checkDatabase().catch(console.error);
