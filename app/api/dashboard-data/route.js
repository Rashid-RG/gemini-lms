/**
 * Consolidated Dashboard Data Endpoint
 * Combines streak, notifications, courses, and user data into ONE request
 * Reduces from 3-4 API calls to 1, dramatically improving dashboard load time
 */
import { NextResponse } from "next/server";
import axios from 'axios';

export const maxDuration = 15;

// Simple cache for dashboard data
const dashboardCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function POST(req) {
  try {
    const { userEmail, forceRefresh } = await req.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail required" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `dashboard:${userEmail}`;
    const cached = dashboardCache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ result: cached.data }, {
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // ⚡ Make all requests in parallel instead of sequential
    const [streakRes, notificationsRes, userDataRes] = await Promise.allSettled([
      // Fetch streak data
      axios.get(`/api/user-streak?studentEmail=${userEmail}`, { timeout: 3000 }),
      
      // Fetch notifications
      axios.get(`/api/notifications?userEmail=${encodeURIComponent(userEmail)}&limit=5`, { timeout: 3000 }),
      
      // Fetch user data (credits, membership)
      axios.post('/api/create-user', {
        user: { email: userEmail },
        forceRefresh: false
      }, { timeout: 3000 })
    ]);

    // Compile results, handling failures gracefully
    const dashboardData = {
      streak: {
        current: streakRes.status === 'fulfilled' ? (streakRes.value?.data?.result?.streakCount || 0) : 0,
        longest: streakRes.status === 'fulfilled' ? (streakRes.value?.data?.result?.longestStreak || 0) : 0
      },
      notifications: notificationsRes.status === 'fulfilled' ? (notificationsRes.value?.data?.result || []) : [],
      user: userDataRes.status === 'fulfilled' ? (userDataRes.value?.data?.result || {}) : { credits: 5, isMember: false },
      errors: {
        streak: streakRes.status === 'rejected' ? streakRes.reason?.message : null,
        notifications: notificationsRes.status === 'rejected' ? notificationsRes.reason?.message : null,
        user: userDataRes.status === 'rejected' ? userDataRes.reason?.message : null
      }
    };

    // Cache the result
    dashboardCache.set(cacheKey, {
      data: dashboardData,
      timestamp: Date.now()
    });

    return NextResponse.json({ result: dashboardData }, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
