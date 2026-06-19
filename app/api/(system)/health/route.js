import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/logger";
import { getQuotaStatus } from "@/lib/apiQuotaManager";
import { db } from "@/configs/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 * Health check and metrics endpoint for monitoring
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const includeMetrics = searchParams.get('metrics') === 'true';
    const includeQuota = searchParams.get('quota') === 'true';
    
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    };
    
    // Check database connectivity
    try {
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        health.database = {
            status: 'connected',
            latency: `${Date.now() - start}ms`
        };
    } catch (error) {
        health.status = 'degraded';
        health.database = {
            status: 'disconnected',
            error: error.message
        };
    }
    
    // Include quota status if requested
    if (includeQuota) {
        try {
            health.aiQuota = getQuotaStatus();
        } catch (error) {
            health.aiQuota = { status: 'unknown', error: error.message };
        }
    }
    
    // Include metrics if requested
    if (includeMetrics) {
        try {
            health.metrics = getMetrics();
        } catch (error) {
            health.metrics = { error: error.message };
        }
    }
    
    // Determine overall status
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500;
    
    return NextResponse.json(health, { status: statusCode });
}
