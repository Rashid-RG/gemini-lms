"use client";
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for handling async operations with loading states
 * Provides consistent loading, error, and success states
 */
export function useAsync(asyncFunction, immediate = false) {
  const [status, setStatus] = useState('idle'); // idle | pending | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      if (mountedRef.current) {
        setData(result);
        setStatus('success');
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setStatus('error');
      }
      throw err;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    execute,
    reset,
    status,
    data,
    error,
    isIdle: status === 'idle',
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  };
}

/**
 * Custom hook for data fetching with caching and refetch
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 */
export function useFetch(url, options = {}) {
  const { 
    immediate = true,
    refreshInterval = null,
    onSuccess = null,
    onError = null,
    transform = (data) => data
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!url) return;
    
    if (isBackground) {
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(url, options.fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const transformed = transform(result);
      
      if (mountedRef.current) {
        setData(transformed);
        onSuccess?.(transformed);
      }
      
      return transformed;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        onError?.(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [url, options.fetchOptions, transform, onSuccess, onError]);

  const refetch = useCallback(() => fetchData(false), [fetchData]);
  const revalidate = useCallback(() => fetchData(true), [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
  }, [immediate, url, fetchData]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval && url) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, url, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refetch,
    revalidate,
    mutate: setData
  };
}

/**
 * Custom hook for form submission with optimistic updates
 * @param {Function} submitFn - Async submit function
 * @param {Object} options - Options
 */
export function useFormSubmit(submitFn, options = {}) {
  const {
    onSuccess = null,
    onError = null,
    resetOnSuccess = false
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submit = useCallback(async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const result = await submitFn(formData);
      setSubmitSuccess(true);
      onSuccess?.(result);
      
      if (resetOnSuccess) {
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 3000);
      }
      
      return result;
    } catch (err) {
      setSubmitError(err);
      onError?.(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitFn, onSuccess, onError, resetOnSuccess]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    submit,
    reset,
    isSubmitting,
    submitError,
    submitSuccess
  };
}

/**
 * Custom hook for debounced values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttled callbacks
 * @param {Function} callback - Callback to throttle
 * @param {number} delay - Minimum delay between calls
 */
export function useThrottle(callback, delay = 500) {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRan.current >= delay) {
      callback(...args);
      lastRan.current = now;
    } else {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRan.current = Date.now();
      }, delay - (now - lastRan.current));
    }
  }, [callback, delay]);
}
