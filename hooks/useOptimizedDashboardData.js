/**
 * useOptimizedDashboardData Hook
 * Consolidates multiple dashboard data fetches into ONE API call
 * Reduces network requests and improves performance significantly
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const dashboardDataCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export function useOptimizedDashboardData(userEmail, { enabled = true, forceRefresh = false } = {}) {
  const [data, setData] = useState({
    streak: { current: 0, longest: 0 },
    notifications: [],
    user: { credits: 5, isMember: false },
    loading: true,
    error: null
  });

  const cacheKeyRef = useRef(`dashboard:${userEmail}`);
  const fetchTimeoutRef = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    if (!userEmail || !enabled) return;

    try {
      // Check cache first
      const cached = dashboardDataCache.get(cacheKeyRef.current);
      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(prev => ({
          ...prev,
          ...cached.data,
          loading: false
        }));
        return;
      }

      setData(prev => ({ ...prev, loading: true, error: null }));

      // Call consolidated dashboard endpoint
      const response = await axios.post(
        '/api/dashboard-data',
        { userEmail, forceRefresh },
        { timeout: 30000 } // 30 second timeout for dashboard data to handle cold starts
      );

      const result = response.data.result;

      setData({
        streak: result.streak || { current: 0, longest: 0 },
        notifications: result.notifications || [],
        user: result.user || { credits: 5, isMember: false },
        loading: false,
        error: null
      });

      // Cache the result
      dashboardDataCache.set(cacheKeyRef.current, {
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load data'
      }));
    }
  }, [userEmail, enabled, forceRefresh]);

  useEffect(() => {
    if (enabled && userEmail) {
      fetchDashboardData();
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [userEmail, enabled, forceRefresh, fetchDashboardData]);

  // Return refresh function for manual updates
  return {
    ...data,
    refetch: () => {
      dashboardDataCache.delete(cacheKeyRef.current);
      fetchDashboardData();
    }
  };
}
