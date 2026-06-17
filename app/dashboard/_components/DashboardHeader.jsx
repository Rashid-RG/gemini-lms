"use client"
import { Button } from '@/components/ui/button'
import { UserButton, useUser } from '@clerk/nextjs'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Flame, Award, TrendingUp, Bell, Menu } from 'lucide-react'

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

function DashboardHeader({ onMenuClick, isSidebarCollapsed }) {
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
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/50 bg-white/80 p-3.5 backdrop-blur-xl transition-all duration-300 md:px-6 shadow-sm shadow-slate-100/40">
      {/* Left section: mobile toggle & logo */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95"
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        
        {(!isDashboardRoute || onMenuClick) && (
          <Link href="/dashboard" className={`transition-all duration-200 hover:opacity-90 hover:scale-[1.02] ${isSidebarCollapsed ? 'flex' : 'flex md:hidden'}`}>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="logo" width={32} height={32} className="drop-shadow-sm" />
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">GEMINI LMS</span>
            </div>
          </Link>
        )}
      </div>

      <div className='flex items-center gap-2 md:gap-3 flex-wrap justify-end'>
        <div className='relative' ref={dropdownRef}>
          <button
            onClick={handleNotificationClick}
            className='relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95'
          >
            <Bell className='w-5 h-5 text-slate-700' />
            {openCount > 0 && (
              <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white animate-pulse'>
                {openCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className='absolute right-0 mt-3.5 w-80 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-3 duration-200'>
              <div className='px-4 py-3 border-b border-slate-100/80 bg-slate-50/50 rounded-t-2xl'>
                <p className='text-sm font-bold text-slate-900'>Support updates</p>
                <p className='text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5'>Latest 5 tickets</p>
              </div>
              {notifLoading ? (
                <div className='p-4 text-sm text-slate-500 flex items-center justify-center gap-2'>
                  <div className='w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin' />
                  <span>Loading...</span>
                </div>
              ) : notifError ? (
                <div className='p-4 text-sm text-rose-500 bg-rose-50/50'>{notifError}</div>
              ) : notifications.length === 0 ? (
                <div className='p-6 text-sm text-slate-400 text-center'>No updates yet.</div>
              ) : (
                <div className='max-h-80 overflow-y-auto divide-y divide-slate-100'>
                  {notifications.map((n) => {
                    const dateStr = formatNotificationDate(n.updatedAt || n.createdAt);
                    return (
                    <div key={n.id} className='p-4 text-sm hover:bg-slate-50/50 transition-colors duration-150'>
                      <div className='flex items-center justify-between'>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (n.status || '').toLowerCase() === 'closed' 
                            ? 'bg-slate-100 text-slate-600' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>{n.status || 'Open'}</span>
                        <span className='text-[10px] text-slate-400 font-medium'>{dateStr}</span>
                      </div>
                      <p className='text-slate-800 font-semibold mt-1.5 line-clamp-2 leading-snug'>{n.subject}</p>
                      {n.adminMessage && (
                        <div className='bg-slate-50 border-l-2 border-indigo-500 p-2 rounded-r-lg mt-2 text-[11px] text-slate-600 leading-normal'>
                          <span className='font-bold text-slate-700 block mb-0.5'>Admin Reply:</span>
                          {n.adminMessage}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
              <div className='px-4 py-2.5 border-t border-slate-100/80 text-center bg-slate-50/30 rounded-b-2xl'>
                <Link href='/dashboard/support' className='text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline'>View all support tickets</Link>
              </div>
            </div>
          )}
        </div>

        {/* Streak Display - Hidden on small mobile */}
        <div className='hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-orange-200/50 rounded-xl shadow-sm hover:bg-orange-500/15 hover:shadow transition-all duration-300 hover:scale-[1.02] cursor-pointer group'>
          <Flame className='w-5 h-5 text-orange-500 animate-pulse group-hover:scale-110 transition-transform duration-200' />
          <div className='flex flex-col leading-tight'>
            <div className='text-xs font-black text-orange-850'>{streak.current} Day{streak.current !== 1 ? 's' : ''} Streak</div>
            <div className='flex items-center gap-1 text-[9px] font-bold text-orange-600 tracking-wide uppercase'>
              <TrendingUp className='w-3 h-3' />
              <span>Next Reward: {streak.longest + 1}</span>
            </div>
          </div>
        </div>

        {/* Badges Button - Hidden on small mobile */}
        <Link href={'/dashboard/badges'} className='hidden sm:block'>
          <Button variant="outline" size="sm" className='flex items-center gap-2 border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm'>
            <Award className='w-4 h-4 text-indigo-600 animate-bounce' style={{ animationDuration: '3s' }} />
            <span className='text-indigo-700 font-bold text-xs'>Badges</span>
          </Button>
        </Link>

        {mounted && isLoaded && user && (
          <Link href={'/dashboard/profile'} className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 hover:bg-slate-50 px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm'>
            <div className='h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold shadow-sm'>
              {user?.firstName?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className='hidden sm:flex flex-col leading-tight text-left max-w-[120px]'>
              <span className='text-xs font-bold text-slate-800 truncate'>{user?.fullName || user?.username}</span>
              <span className='text-[10px] text-slate-500 truncate'>{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
          </Link>
        )}
        {mounted && <UserButton afterSignOutUrl="/" />}
        <Link href={'/dashboard'} className='hidden md:block'>
          <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 hover:scale-105 active:scale-95 px-4">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default DashboardHeader