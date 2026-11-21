import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// User routes protected by Clerk
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)','/create','/course(.*)','/grades(.*)','/instructor-gradebook(.*)'])

// Admin routes - handled separately with database auth
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

// Inngest routes - uses its own signing key authentication
const isInngestRoute = createRouteMatcher(['/api/inngest(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Skip Clerk protection for Inngest routes - they use signing key auth
  if (isInngestRoute(req)) {
    return NextResponse.next()
  }

  // Skip Clerk protection for admin routes - they use database auth
  if (isAdminRoute(req)) {
    // Admin routes are handled by their own authentication system
    // The admin layout and API routes will verify the admin session
    return NextResponse.next()
  }
  
  // Protect user routes with Clerk
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // In trusted mode, old quiz pages must not run browser-side grading.
  // Route all existing quiz entry points to the isolated server-graded pilot.
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED === 'true' && req.method === 'GET') {
    const legacyQuizPath = req.nextUrl.pathname.match(/^\/course\/([^/]+)\/(quiz|mcq|manual-quiz)\/?$/)
    if (legacyQuizPath) {
      const destination = req.nextUrl.clone()
      destination.pathname = `/course/${legacyQuizPath[1]}/trusted-quiz`
      return NextResponse.redirect(destination)
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}