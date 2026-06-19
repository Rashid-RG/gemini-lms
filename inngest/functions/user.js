import { db } from "@/configs/db";
import { inngest } from "../client";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, and, sql } from "drizzle-orm";
import { initializeUserCredits } from "@/lib/credits";
import { ensureStudentIdentifierForUser, hasStudentIdentifier } from "@/lib/studentIdentifier";
import { emailService } from "@/lib/emailService";
import { INITIAL_USER_CREDITS } from "@/lib/constants";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.sleep("wait-a-moment", "1s");
        return { event, body: "Hello, World!" };
    },
);

export const CreateNewUser = inngest.createFunction(
    { id: 'create-user', retries: 1 },
    { event: 'user.create' },
    async ({ event, step }) => {
        const { user } = event.data;
        
        const result = await step.run('Check User and create New if Not in DB', async () => {
            const rawEmail = user?.primaryEmailAddress?.emailAddress 
                || user?.emailAddresses?.[0]?.emailAddress 
                || user?.email;
            const email = rawEmail?.trim().toLowerCase();
            
            if (!email) {
                console.error('CreateNewUser: No email found for user', JSON.stringify(user, null, 2));
                return { error: 'No email found for user', skipped: true };
            }
            
            const result = await db.select().from(USER_TABLE)
                .where(eq(USER_TABLE.email, email));

            if (result?.length === 0) {
                await db.insert(USER_TABLE).values({
                    name: user?.fullName || user?.firstName || 'User',
                    email: email,
                    credits: INITIAL_USER_CREDITS,
                    totalCreditsUsed: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).onConflictDoNothing({ target: USER_TABLE.email });

                const userResp = await db.select().from(USER_TABLE)
                    .where(eq(USER_TABLE.email, email));

                const ensuredUser = userResp?.[0]
                    ? await ensureStudentIdentifierForUser(userResp[0])
                    : null;
                
                const existingTransactions = await db.select({ count: sql`count(*)` })
                    .from(CREDIT_TRANSACTION_TABLE)
                    .where(and(
                        eq(CREDIT_TRANSACTION_TABLE.userEmail, email),
                        eq(CREDIT_TRANSACTION_TABLE.type, 'initial_grant')
                    ));

                if (Number(existingTransactions[0]?.count || 0) === 0) {
                    await initializeUserCredits(email, INITIAL_USER_CREDITS);
                }
                
                return ensuredUser ? [ensuredUser] : userResp;
            }

            if (!hasStudentIdentifier(result[0]?.studentIdentifier)) {
                const ensuredUser = await ensureStudentIdentifierForUser(result[0]);
                return ensuredUser ? [ensuredUser] : result;
            }

            return result;
        });

        const email = user?.primaryEmailAddress?.emailAddress 
            || user?.emailAddresses?.[0]?.emailAddress 
            || user?.email;
        
        const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'User';
        
        if (email) {
            await step.run('send-welcome-email', async () => {
                try {
                    return await emailService.sendWelcomeEmail(email, firstName);
                } catch (emailError) {
                    console.warn('Welcome email failed (non-fatal inside step):', emailError?.message);
                    return { success: false, error: emailError?.message };
                }
            });
        }

        return 'Success';
    }
);
