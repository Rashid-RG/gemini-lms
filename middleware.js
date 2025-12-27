import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// User routes protected by Clerk
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)','/create','/course(.*)'])

// Admin routes - handled separately with database auth
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
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
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}