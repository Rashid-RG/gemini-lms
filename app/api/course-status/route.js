import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";

/**
 * Server-Sent Events endpoint for real-time course status updates
 * This replaces polling with push-based updates
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return new Response(JSON.stringify({ error: 'courseId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isControllerClosed = false;
      let consecutiveErrors = 0;
      const MAX_ERRORS = 3;
      
      const sendEvent = (data) => {
        if (isControllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.error('SSE send error:', err.message);
          isControllerClosed = true;
        }
      };

      const checkStatus = async () => {
        try {
          // Get course status
          const course = await db.select({
            status: STUDY_MATERIAL_TABLE.status,
            courseId: STUDY_MATERIAL_TABLE.courseId
          }).from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

          if (course.length === 0) {
            sendEvent({ type: 'error', message: 'Course not found' });
            return null;
          }

          // Get study content statuses
          const studyContent = await db.select({
            type: STUDY_TYPE_CONTENT_TABLE.type,
            status: STUDY_TYPE_CONTENT_TABLE.status
          }).from(STUDY_TYPE_CONTENT_TABLE)
            .where(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId));

          const contentStatus = {};
          studyContent.forEach(item => {
            contentStatus[item.type] = item.status;
          });

          // Reset error count on success
          consecutiveErrors = 0;

          return {
            courseStatus: course[0].status,
            contentStatus,
            isComplete: course[0].status === 'Ready' && 
                       Object.values(contentStatus).every(s => s === 'Ready' || s === 'Error')
          };
        } catch (err) {
          consecutiveErrors++;
          // Only log first error, not repeated ones
          if (consecutiveErrors === 1) {
            console.error('SSE status check error (will retry):', err.message);
          }
          
          // If too many consecutive errors, close the connection
          if (consecutiveErrors >= MAX_ERRORS) {
            sendEvent({ type: 'error', message: 'Database connection issues, please refresh' });
            return 'close';
          }
          
          return null; // Return null to skip this check, will retry
        }
      };

      // Send initial status with retry
      let initialStatus = await checkStatus();
      if (initialStatus === 'close') {
        try { controller.close(); } catch (e) {}
        isControllerClosed = true;
        return;
      }
      if (initialStatus) {
        sendEvent({ type: 'status', ...initialStatus });
      }

      // Poll for updates every 10 seconds (increased from 5s to reduce DB load)
      const interval = setInterval(async () => {
        if (isControllerClosed) {
          clearInterval(interval);
          return;
        }

        const status = await checkStatus();
        
        if (status === 'close') {
          clearInterval(interval);
          try { controller.close(); } catch (e) {}
          isControllerClosed = true;
          return;
        }
        
        if (status) {
          sendEvent({ type: 'status', ...status });

          // Close connection if everything is complete
          if (status.isComplete) {
            sendEvent({ type: 'complete', message: 'All content generated' });
            clearInterval(interval);
            try {
              controller.close();
            } catch (e) {
              // Already closed
            }
            isControllerClosed = true;
          }
        }
      }, 10000); // Changed from 5000 to 10000ms

      // Cleanup after 3 minutes (reduced from 5 to reduce long connections)
      setTimeout(() => {
        if (!isControllerClosed) {
          clearInterval(interval);
          sendEvent({ type: 'timeout', message: 'Connection timeout, please reconnect' });
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
          isControllerClosed = true;
        }
      }, 3 * 60 * 1000); // Reduced from 5 to 3 minutes
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    }
  });
}
