import { db } from "@/configs/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/adminApiAuth";

/**
 * Diagnostic endpoint to test database performance
 * Use this to identify slow queries or connection issues
 * 
 * Usage:
 * GET /api/debug/db-health
 * GET /api/debug/db-health?timeout=5000&count=10
 */

export async function GET(req) {
    // Database diagnostics require a verified super-admin session in every environment.
    const access = await requireSuperAdmin();
    if (!access.authenticated) return access.error;

    const searchParams = new URL(req.url).searchParams;
    const requestedTimeout = Number(searchParams.get('timeout'));
    const testTimeout = Number.isFinite(requestedTimeout) ? Math.min(10000, Math.max(250, Math.floor(requestedTimeout))) : 5000;
    const requestedCount = Number(searchParams.get('count'));
    const testCount = Number.isFinite(requestedCount) ? Math.min(20, Math.max(1, Math.floor(requestedCount))) : 5;

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        tests: {}
    };

    // Test 1: Simple count query
    try {
        const startTime = performance.now();
        
        // Implement timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), testTimeout);
        
        try {
            const result = await Promise.race([
                db.select().from(USER_TABLE).limit(1),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout')), testTimeout)
                )
            ]);
            
            clearTimeout(timeout);
            const duration = performance.now() - startTime;
            
            diagnostics.tests.simpleQuery = {
                status: 'success',
                duration: Math.round(duration),
                threshold: testTimeout,
                passed: duration < testTimeout
            };
        } catch (e) {
            clearTimeout(timeout);
            diagnostics.tests.simpleQuery = {
                status: 'error',
                error: e.message,
                threshold: testTimeout
            };
        }
    } catch (err) {
        diagnostics.tests.simpleQuery = {
            status: 'failed',
            error: err.message
        };
    }

    // Test 2: Query with ordering and limit
    try {
        const startTime = performance.now();
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), testTimeout);
        
        try {
            const result = await Promise.race([
                db.select({
                    id: STUDY_MATERIAL_TABLE.id,
                    topic: STUDY_MATERIAL_TABLE.topic,
                    status: STUDY_MATERIAL_TABLE.status,
                }).from(STUDY_MATERIAL_TABLE)
                    .limit(testCount),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout')), testTimeout)
                )
            ]);
            
            clearTimeout(timeout);
            const duration = performance.now() - startTime;
            
            diagnostics.tests.complexQuery = {
                status: 'success',
                duration: Math.round(duration),
                resultCount: result?.length || 0,
                threshold: testTimeout,
                passed: duration < testTimeout
            };
        } catch (e) {
            clearTimeout(timeout);
            diagnostics.tests.complexQuery = {
                status: 'error',
                error: e.message,
                threshold: testTimeout
            };
        }
    } catch (err) {
        diagnostics.tests.complexQuery = {
            status: 'failed',
            error: err.message
        };
    }

    // Test 3: Connection speed (just a ping)
    try {
        const startTime = performance.now();
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), testTimeout);
        
        try {
            // Use a minimal query to test connection speed
            const result = await Promise.race([
                db.select().from(USER_TABLE).limit(1),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), testTimeout)
                )
            ]);
            
            clearTimeout(timeout);
            const duration = performance.now() - startTime;
            
            diagnostics.tests.connectionPing = {
                status: 'success',
                duration: Math.round(duration),
                threshold: testTimeout,
                passed: duration < testTimeout
            };
        } catch (e) {
            clearTimeout(timeout);
            diagnostics.tests.connectionPing = {
                status: 'error',
                error: e.message,
                threshold: testTimeout
            };
        }
    } catch (err) {
        diagnostics.tests.connectionPing = {
            status: 'failed',
            error: err.message
        };
    }

    // Summary
    const passedTests = Object.values(diagnostics.tests).filter(t => t.passed === true).length;
    const totalTests = Object.keys(diagnostics.tests).length;

    diagnostics.summary = {
        passedTests,
        totalTests,
        allPassed: passedTests === totalTests,
        recommendation: passedTests === totalTests 
            ? 'Database performance is healthy'
            : passedTests > 0
            ? 'Database has some slow queries - consider optimization'
            : 'Database connection is slow or experiencing issues'
    };

    const status = passedTests === totalTests ? 200 : 503;
    return NextResponse.json(diagnostics, { status });
}
