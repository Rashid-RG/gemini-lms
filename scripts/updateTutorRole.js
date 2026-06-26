#!/usr/bin/env node

/**
 * Script to update an admin account's role to 'tutor'
 * Run this to fix accounts that were created without the tutor role
 * Usage: node scripts/updateTutorRole.js
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function updateTutorRole() {
    try {
        const email = process.argv[2];
        
        if (!email) {
            console.log('Usage: node scripts/updateTutorRole.js <email>');
            console.log('Example: node scripts/updateTutorRole.js tutor@example.com');
            process.exit(1);
        }

        console.log(`\nUpdating role for: ${email}`);

        // Get current admin
        const existing = await sql`SELECT id, email, name, role FROM admins WHERE email = ${email.toLowerCase()}`;
        
        if (existing.length === 0) {
            console.error(`❌ Admin not found with email: ${email}`);
            process.exit(1);
        }

        const admin = existing[0];
        console.log(`Found admin: ${admin.name} (${admin.email})`);
        console.log(`Current role: ${admin.role}`);

        // Update role to tutor
        await sql`UPDATE admins SET role = 'tutor', "updatedAt" = NOW() WHERE id = ${admin.id}`;

        console.log(`✅ Role updated to: tutor`);
        console.log('\nThe "Create Course" button should now appear in the dashboard!');
        console.log('Log out and log back in for the changes to take effect.\n');

    } catch (error) {
        console.error('Error updating tutor role:', error);
        process.exit(1);
    }
}

updateTutorRole();
