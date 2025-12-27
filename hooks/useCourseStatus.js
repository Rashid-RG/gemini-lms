"use client"
import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook for real-time course status updates via SSE
 * @param {string} courseId - The course ID to monitor
 * @param {Object} options - Configuration options
 * @returns {Object} Status and control functions
 */
export function useCourseStatus(courseId, options = {}) {
  const {
    enabled = true,
    onStatusChange = null,
    onComplete = null,
    onError = null
  } = options;

  const [status, setStatus] = useState({
    courseStatus: null,
    contentStatus: {},
    isComplete: false,
    isConnected: false,
    error: null
  });

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isCompleteRef = useRef(false);
  const isMountedRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => {
    isCompleteRef.current = status.isComplete;
  }, [status.isComplete]);

  // Cleanup function that doesn't trigger state updates
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    // Only update state if still mounted
    if (isMountedRef.current) {
      setStatus(prev => ({ ...prev, isConnected: false }));
    }
  }, [cleanup]);

  const connect = useCallback(() => {
    if (!courseId || !enabled || !isMountedRef.current) return;

    // Close existing connection
    cleanup();

    try {
      const eventSource = new EventSource(`/api/course-status?courseId=${courseId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMountedRef.current) return;
        reconnectAttemptsRef.current = 0;
        setStatus(prev => ({ ...prev, isConnected: true, error: null }));
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            setStatus(prev => ({
              ...prev,
              courseStatus: data.courseStatus,
              contentStatus: data.contentStatus,
              isComplete: data.isComplete
            }));
            
            if (onStatusChange) {
              onStatusChange(data);
            }
          } else if (data.type === 'complete') {
            setStatus(prev => ({ ...prev, isComplete: true }));
            eventSource.close();
            
            if (onComplete) {
              onComplete();
            }
          } else if (data.type === 'error') {
            setStatus(prev => ({ ...prev, error: data.message }));
            
            if (onError) {
              onError(data.message);
            }
          } else if (data.type === 'timeout') {
            // Auto-reconnect on timeout if not complete
            eventSource.close();
            if (!isCompleteRef.current && reconnectAttemptsRef.current < 5 && isMountedRef.current) {
              reconnectAttemptsRef.current++;
              reconnectTimeoutRef.current = setTimeout(() => { 
                if (isMountedRef.current) connect(); 
              }, 2000);
            }
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;
        setStatus(prev => ({ ...prev, isConnected: false }));
        eventSource.close();

        // Auto-reconnect with fixed backoff delays if not complete
        if (!isCompleteRef.current && reconnectAttemptsRef.current < 5 && isMountedRef.current) {
          reconnectAttemptsRef.current++;
          const delays = [1000, 2000, 4000, 8000, 16000];
          const delayIndex = Math.min(reconnectAttemptsRef.current - 1, delays.length - 1);
          reconnectTimeoutRef.current = setTimeout(() => { 
            if (isMountedRef.current) connect(); 
          }, delays[delayIndex]);
        }
      };
    } catch (err) {
      console.error('SSE connection error:', err);
      if (isMountedRef.current) {
        setStatus(prev => ({ ...prev, error: err.message, isConnected: false }));
      }
    }
  }, [courseId, enabled, onStatusChange, onComplete, onError, cleanup]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled && courseId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      cleanup(); // Use cleanup instead of disconnect to avoid state updates during unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, enabled]);

  // Disconnect when complete
  useEffect(() => {
    if (status.isComplete) {
      cleanup();
    }
  }, [status.isComplete, cleanup]);

  return {
    ...status,
    connect,
    disconnect,
    isGenerating: status.courseStatus === 'Generating'
  };
}

/**
 * Utility to check if specific content type is ready
 */
export function isContentReady(contentStatus, type) {
  return contentStatus?.[type] === 'Ready';
}

/**
 * Utility to get generation progress percentage
 */
export function getGenerationProgress(contentStatus) {
  if (!contentStatus || Object.keys(contentStatus).length === 0) {
    return 0;
  }
  
  const total = Object.keys(contentStatus).length;
  const ready = Object.values(contentStatus).filter(s => s === 'Ready').length;
  
  return Math.round((ready / total) * 100);
}
