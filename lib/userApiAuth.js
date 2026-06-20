import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthEmail } from "@/lib/clerkUtils";

/**
 * Authenticate a Clerk user for an API route and resolve their canonical email.
 * Supports bypassing for internal server-to-server loopback requests via headers.
 */
export async function requireUserAuth(req) {
  // 1. Check for custom header for internal server-to-server calls
  if (req) {
    const internalKey = req.headers.get("x-internal-key");
    if (internalKey && internalKey === process.env.CLERK_SECRET_KEY) {
      return { authenticated: true, isInternal: true };
    }
  }

  // 2. Resolve via Clerk auth
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = await getAuthEmail(sessionClaims);
  if (!email) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: "Authenticated email not found" },
        { status: 401 }
      ),
    };
  }

  return { authenticated: true, userId, email, isInternal: false };
}

/**
 * Reject attempts to access another user's email-scoped data.
 */
export function isSameUserEmail(authEmail, requestedEmail) {
  return Boolean(
    authEmail &&
    requestedEmail &&
    authEmail.toLowerCase() === String(requestedEmail).trim().toLowerCase()
  );
}
