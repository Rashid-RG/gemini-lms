"use client"
import { Button } from '@/components/ui/button'
import { UserButton, useUser } from '@clerk/nextjs'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Flame, Award, TrendingUp, Bell } from 'lucide-react'

// Format date safely to avoid hydration mismatch
const formatNotificationDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

function DashboardHeader() {
  const path = usePathname();
  const { user, isLoaded } = useUser();
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple cache for streak data
  const streakCacheRef = useRef({ data: null, timestamp: 0 });

  // Fetch streak function with caching
  const fetchStreak = useCallback(async (forceRefresh = false) => {
    if (!userEmail) return;
    
    // Use cache if valid (5 min) and not forcing
    const cache = streakCacheRef.current;
    if (!forceRefresh && cache.data && (Date.now() - cache.timestamp) < 5 * 60 * 1000) {
      setStreak(cache.data);
      return;
    }
    
    try {
      const res = await axios.get(`/api/user-streak?studentEmail=${userEmail}`, {
        timeout: 3000 // Shorter timeout
      });
      const data = res?.data?.result || {};
      const streakData = { 
        current: data.streakCount || 0, 
        longest: data.longestStreak || 0 
      };
      setStreak(streakData);
      streakCacheRef.current = { data: streakData, timestamp: Date.now() };
    } catch (err) {
      // ignore errors, keep defaults
    }
  }, [userEmail]);

  // Fetch streak on initial load only
  useEffect(() => {
    if (userEmail) {
      fetchStreak(false);
    }
  }, [userEmail, fetchStreak]);

  // Fetch notifications - with caching
  const notifCacheRef = useRef({ data: [], timestamp: 0 });
  
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    if (!userEmail) return;
    
    // Use cache if valid (2 min) and not forcing
    const cache = notifCacheRef.current;
    if (!forceRefresh && cache.data.length > 0 && (Date.now() - cache.timestamp) < 2 * 60 * 1000) {
      setNotifications(cache.data);
      return;
    }
    
    try {
      setNotifLoading(true);
      setNotifError('');
      const res = await axios.get(`/api/notifications?userEmail=${encodeURIComponent(userEmail)}&limit=5`, {
        timeout: 3000 // Shorter timeout
      });
      const notifs = res.data?.result || [];
      setNotifications(notifs);
      notifCacheRef.current = { data: notifs, timestamp: Date.now() };
    } catch (err) {
      setNotifError('Failed to load');
    } finally {
      setNotifLoading(false);
    }
  }, [userEmail]);

  const handleNotificationClick = () => {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (willOpen) {
      fetchNotifications(false); // Use cache if available
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCount = notifications.filter(n => (n.status || '').toLowerCase() !== 'closed').length;

  // Check if we're on a dashboard route (sidebar is visible)
  const isDashboardRoute = path?.startsWith('/dashboard');

  return (
    <div className={`p-3 md:p-5 shadow-md flex ${isDashboardRoute ? 'justify-end' : 'justify-between'} pl-16 md:pl-5`}>
      {!isDashboardRoute && (
        <Link href={'/dashboard'}>
          <div className='flex gap-2 items-center'>
            <Image src={'/logo.svg'} alt='logo' width={30} height={30} />
            <h2 className="font-bold text-xl hidden sm:block">GEMINI LMS</h2>
          </div>
        </Link>
      )}

      <div className='flex items-center gap-2 md:gap-3 flex-wrap justify-end'>
        <div className='relative' ref={dropdownRef}>
          <button
            onClick={handleNotificationClick}
            className='relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50'
          >
            <Bell className='w-5 h-5 text-slate-700' />
            {openCount > 0 && (
              <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center'>
                {openCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className='absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-20'>
              <div className='px-3 py-2 border-b border-slate-100'>
                <p className='text-sm font-semibold text-slate-800'>Support updates</p>
                <p className='text-[11px] text-slate-500'>Latest 5 tickets</p>
              </div>
              {notifLoading ? (
                <div className='p-3 text-sm text-slate-600'>Loading...</div>
              ) : notifError ? (
                <div className='p-3 text-sm text-rose-600'>{notifError}</div>
              ) : notifications.length === 0 ? (
                <div className='p-3 text-sm text-slate-500'>No updates yet.</div>
              ) : (
                <div className='max-h-80 overflow-y-auto divide-y divide-slate-100'>
                  {notifications.map((n) => {
                    const dateStr = formatNotificationDate(n.updatedAt || n.createdAt);
                    return (
                    <div key={n.id} className='p-3 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span className='font-semibold text-slate-800'>{n.status || 'Open'}</span>
                        <span className='text-[11px] text-slate-500'>{dateStr}</span>
                      </div>
                      <p className='text-slate-700 mt-1 line-clamp-2'>{n.subject}</p>
                      {n.adminMessage && (
                        <p className='text-[12px] text-slate-500 mt-1'>Admin: {n.adminMessage}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
              <div className='px-3 py-2 border-t border-slate-100 text-right'>
                <Link href='/dashboard/support' className='text-xs text-blue-600 hover:underline'>View all</Link>
              </div>
            </div>
          )}
        </div>

        {/* Streak Display - Hidden on small mobile */}
        <div className='hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg shadow-sm'>
          <Flame className='w-5 h-5 text-orange-500' />
          <div className='flex flex-col'>
            <div className='text-sm font-bold text-orange-700'>{streak.current} Day{streak.current !== 1 ? 's' : ''}</div>
            <div className='flex items-center gap-1 text-[10px] text-orange-600'>
              <TrendingUp className='w-3 h-3' />
              <span>Next: {streak.longest + 1}</span>
            </div>
          </div>
        </div>

        {/* Badges Button - Hidden on small mobile */}
        <Link href={'/dashboard/badges'} className='hidden sm:block'>
          <Button variant="outline" size="sm" className='flex items-center gap-2 border-purple-200 hover:bg-purple-50'>
            <Award className='w-4 h-4 text-purple-600' />
            <span className='text-purple-700 font-semibold'>Badges</span>
          </Button>
        </Link>

        {mounted && isLoaded && user && (
          <Link href={'/dashboard/profile'} className='flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50'>
            <div className='h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700'>
              {user?.firstName?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className='hidden sm:flex flex-col leading-tight text-left'>
              <span className='text-sm font-semibold text-slate-800'>{user?.fullName || user?.username}</span>
              <span className='text-[11px] text-slate-500'>{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
          </Link>
        )}
        {mounted && <UserButton afterSignOutUrl="/" />}
        <Link href={'/dashboard'} className='hidden md:block'>
          <Button>Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

export default DashboardHeader