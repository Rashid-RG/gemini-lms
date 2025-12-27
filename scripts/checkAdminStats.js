require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING);

async function checkAdminStats() {
    try {
        console.log('=== Admin Dashboard Stats ===\n');
        
        // Payment statistics
        const payments = await sql`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
                COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE status = 'completed'), 0) as total_revenue
            FROM "paymentRecord"
        `;
        console.log('Payment Stats:', payments[0]);
        
        // All payment records
        const allPayments = await sql`
            SELECT id, "userEmail", amount, plan, status, "createdAt"
            FROM "paymentRecord"
            ORDER BY "createdAt" DESC
            LIMIT 10
        `;
        console.log('\nRecent Payments:', JSON.stringify(allPayments, null, 2));
        
        // User stats
        const users = await sql`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE "isMember" = true) as premium_members
            FROM users
        `;
        console.log('\nUser Stats:', users[0]);
        
        // Course stats
        const courses = await sql`
            SELECT 
                COUNT(*) as total_courses,
                COUNT(*) FILTER (WHERE status = 'Ready') as ready_courses
            FROM "studyMaterial"
        `;
        console.log('\nCourse Stats:', courses[0]);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAdminStats();
