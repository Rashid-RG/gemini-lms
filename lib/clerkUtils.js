import { currentUser } from "@clerk/nextjs/server";

export async function getAuthEmail(sessionClaims) {
    // 1. Try sessionClaims (optimized path for custom configured claims)
    let email = sessionClaims?.email || 
                sessionClaims?.primaryEmailAddress?.emailAddress || 
                sessionClaims?.primary_email_address ||
                sessionClaims?.emailAddress;
                
    if (email) {
        return email.toLowerCase();
    }

    // 2. Fallback: Request user details directly from Clerk API using currentUser()
    try {
        const user = await currentUser();
        if (user) {
            const primaryEmail = user.primaryEmailAddress?.emailAddress || 
                                 user.emailAddresses?.[0]?.emailAddress;
            if (primaryEmail) {
                return primaryEmail.toLowerCase();
            }
        }
    } catch (e) {
        console.error("Failed to retrieve authenticated email from Clerk SDK:", e);
    }
    
    return null;
}
