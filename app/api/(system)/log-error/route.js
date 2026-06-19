import { NextResponse } from "next/server";
import { logger, trackError } from "@/lib/logger";

/**
 * POST /api/log-error
 * Endpoint for client-side error logging
 */
export async function POST(req) {
    try {
        const errorData = await req.json();
        
        // Validate required fields
        if (!errorData.message) {
            return NextResponse.json(
                { error: "Error message is required" },
                { status: 400 }
            );
        }
        
        // Add server-side context
        const enrichedError = {
            ...errorData,
            source: 'client',
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            receivedAt: new Date().toISOString()
        };
        
        // Log the error
        trackError(enrichedError, { source: 'client-report' });
        
        // In production, you would send to external service here
        // Example: Sentry, LogRocket, DataDog, etc.
        
        return NextResponse.json({ 
            success: true, 
            message: "Error logged successfully" 
        });
        
    } catch (error) {
        logger.error("Failed to log client error", { error: error.message });
        return NextResponse.json(
            { error: "Failed to log error" },
            { status: 500 }
        );
    }
}
