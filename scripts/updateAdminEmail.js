/**
 * Script to update admin email in database
 * Run with: npx tsx scripts/updateAdminEmail.js
 */

const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const { eq } = require("drizzle-orm");
const { pgTable, serial, varchar, boolean, timestamp, index } = require("drizzle-orm/pg-core");

// Re-define the admin table schema for this script
const ADMIN_TABLE = pgTable('admins', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    passwordHash: varchar('passwordHash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('admin'),
    isActive: boolean('isActive').default(true),
    lastLoginAt: timestamp('lastLoginAt'),
    createdAt: timestamp('createdAt').defaultNow(),
    updatedAt: timestamp('updatedAt').defaultNow()
});

const OLD_EMAIL = "e2145286@bit.uom.lk";
const NEW_EMAIL = "e2240212@bit.uom.lk";

async function updateAdminEmail() {
    try {
        // Get connection string from env or hardcode for this one-time script
        const connectionString = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING || 
            "postgresql://neondb_owner:npg_d8Fgih1lWUqH@ep-cool-tree-a4ll1itd-pooler.us-east-1.aws.neon.tech/AI-Study-Material-Gen?sslmode=require";
        
        const sql = neon(connectionString);
        const db = drizzle(sql);

        console.log("🔍 Checking for existing admin account...");
        
        // Check if old admin exists
        const existingAdmin = await db
            .select()
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.email, OLD_EMAIL));

        if (existingAdmin.length === 0) {
            console.log(`❌ No admin found with email: ${OLD_EMAIL}`);
            
            // Check if new email already exists
            const newEmailAdmin = await db
                .select()
                .from(ADMIN_TABLE)
                .where(eq(ADMIN_TABLE.email, NEW_EMAIL));
            
            if (newEmailAdmin.length > 0) {
                console.log(`✅ Admin with new email ${NEW_EMAIL} already exists!`);
                console.log("Admin details:", {
                    id: newEmailAdmin[0].id,
                    email: newEmailAdmin[0].email,
                    name: newEmailAdmin[0].name,
                    role: newEmailAdmin[0].role,
                    isActive: newEmailAdmin[0].isActive
                });
            } else {
                console.log(`ℹ️ Neither old nor new admin email exists in database.`);
                console.log("You may need to create a new admin account via /admin/setup");
            }
            return;
        }

        console.log(`✅ Found admin: ${existingAdmin[0].email}`);
        console.log("Updating email...");

        // Update email
        const result = await db
            .update(ADMIN_TABLE)
            .set({ 
                email: NEW_EMAIL,
                updatedAt: new Date()
            })
            .where(eq(ADMIN_TABLE.email, OLD_EMAIL))
            .returning();

        if (result.length > 0) {
            console.log(`✅ Admin email updated successfully!`);
            console.log(`   Old email: ${OLD_EMAIL}`);
            console.log(`   New email: ${NEW_EMAIL}`);
            console.log("Updated admin:", {
                id: result[0].id,
                email: result[0].email,
                name: result[0].name,
                role: result[0].role
            });
        } else {
            console.log("❌ Update failed - no rows affected");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

updateAdminEmail();
