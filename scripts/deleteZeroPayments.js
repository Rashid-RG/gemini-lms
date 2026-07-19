const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('Error: DATABASE_URL not found in environment or .env.local');
    process.exit(1);
}

async function run() {
    const sql = neon(connectionString);
    
    console.log('=== Finding Payment Records with 0.00 Rs ===');
    const zeroPayments = await sql`SELECT id, "userEmail", amount, plan, status, "createdAt" FROM "paymentRecord" WHERE CAST(amount AS NUMERIC) = 0`;
    console.log('Found records:', JSON.stringify(zeroPayments, null, 2));
    
    if (zeroPayments.length === 0) {
        console.log('No records with 0.00 Rs found.');
        return;
    }
    
    console.log('\n=== Deleting Payment Records ===');
    const idsToDelete = zeroPayments.map(r => r.id);
    const deleteResult = await sql`DELETE FROM "paymentRecord" WHERE id = ANY(${idsToDelete})`;
    console.log('Deleted successfully. Result:', deleteResult);
}

run().catch(console.error);
