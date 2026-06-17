"use client"
import { CourseCountContext } from '@/app/_context/CourseCountContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LayoutDashboard, Shield, UserCircle, TrendingUp, Award, Compass, Trophy, LifeBuoy, ShieldCheck, ClipboardCheck, ClipboardList, Users, Settings, CreditCard, BarChart3, Mail, BookOpen, Megaphone, History, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useContext, useMemo, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'

function SideBar({ onNavigate }) {
    const [mounted, setMounted] = useState(false);
    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const adminEmails = useMemo(() => (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean), []);
    const isAdmin = mounted && !!(userEmail && adminEmails.includes(userEmail));

    const MenuList=[
        {
            name:'Dashboard',
            icon:LayoutDashboard,
            path:'/dashboard'
        },
        {
            name:'Explore Courses',
            icon:Compass,
            path:'/dashboard/explore'
        },
        {
            name:'Leaderboard',
            icon:Trophy,
            path:'/dashboard/leaderboard'
        },
        {
            name:'Progress',
            icon:TrendingUp,
            path:'/dashboard/progress'
        },
        {
            name:'My Grades',
            icon:GraduationCap,
            path:'/grades'
        },
        {
            name:'Instructor GradeBook',
            icon:BarChart3,
            path:'/instructor-gradebook'
        },
        {
            name:'Certificate',
            icon:Award,
            path:'/dashboard/certificates'
        },
        {
            name:'Upgrade',
            icon:Shield,
            path:'/dashboard/upgrade'
        },
        {
            name:'Help & Support',
            icon:LifeBuoy,
            path:'/dashboard/support'
        },
        ...(isAdmin ? [
            {
                name:'Admin Dashboard',
                icon:Settings,
                path:'/dashboard/admin'
            },
            {
                name:'Analytics',
                icon:BarChart3,
                path:'/dashboard/admin/analytics'
            },
            {
                name:'Announcements',
                icon:Megaphone,
                path:'/dashboard/admin/announcements'
            },
            {
                name:'Manage Users',
                icon:Users,
                path:'/dashboard/admin/users'
            },
            {
                name:'Manage Courses',
                icon:BookOpen,
                path:'/dashboard/admin/courses'
            },
            {
                name:'Email Students',
                icon:Mail,
                path:'/dashboard/admin/email-students'
            },
            {
                name:'Credits Management',
                icon:CreditCard,
                path:'/dashboard/admin/credits'
            },
            {
                name:'Support Admin',
                icon:ShieldCheck,
                path:'/dashboard/support/admin'
            },
            {
                name:'All Submissions',
                icon:ClipboardList,
                path:'/dashboard/admin/all-submissions'
            },
            {
                name:'Assignment Unlocks',
                icon:ShieldCheck,
                path:'/dashboard/admin/assignment-unlocks'
            },
            {
                name:'Review Requests',
                icon:ClipboardCheck,
                path:'/dashboard/admin/review-requests'
            },
            {
                name:'Activity Log',
                icon:History,
                path:'/dashboard/admin/activity-log'
            }
        ] : []),
        {
            name:'Profile',
            icon:UserCircle,
            path:'/dashboard/profile'
        },

    ]

    const {totalCourse, setTotalCourse, userCredits, setUserCredits, isMember, setIsMember}=useContext(CourseCountContext);
    const path=usePathname();

    // Set mounted flag to ensure consistent hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch credits and course count ONLY on mount and user change (not on path change!)
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.primaryEmailAddress?.emailAddress) return;
            
            try {
                // Check if we should force refresh (after payment)
                const urlParams = new URLSearchParams(window.location.search);
                const forceRefresh = urlParams.has('refresh');
                
                try {
                    // Fetch courses with aggressive caching - INCREASED TIMEOUT to 30 seconds
                    // to handle database latency on first load
                    const coursesResult = await axios.post('/api/courses', {
                        createdBy: user.primaryEmailAddress.emailAddress
                    }, { timeout: 30000 });
                    const courses = coursesResult?.data?.result || [];
                    setTotalCourse(courses.length);
                } catch (courseError) {
                    console.error('Error fetching courses:', courseError?.message);
                    setTotalCourse(0);
                }
                
                try {
                    // Fetch user credits from create-user API (which returns user data)
                    // Keep this bounded so the sidebar can fall back quickly on slow cold starts.
                    const userResult = await axios.post('/api/create-user', {
                        user: {
                            fullName: user?.fullName,
                            email: user.primaryEmailAddress.emailAddress
                        },
                        forceRefresh: forceRefresh
                    }, { timeout: 8000 });
                    
                    if (userResult?.data?.result) {
                        const userData = userResult.data.result;
                        setUserCredits(userData.credits ?? 5);
                        setIsMember(userData.isMember ?? false);
                    } else {
                        // Fallback to defaults if no result
                        setUserCredits(5);
                        setIsMember(false);
                    }
                } catch (userError) {
                    const isTimeout = userError?.code === 'ECONNABORTED' || userError?.message?.includes('timeout');
                    if (!isTimeout && process.env.NODE_ENV !== 'production') {
                        console.warn('Sidebar user data fallback:', userError?.message);
                    }
                    // Fallback to defaults
                    setUserCredits(5);
                    setIsMember(false);
                }
            } catch (error) {
                console.error('Unexpected error in fetchUserData:', error);
                // Fallback: Set default values on any error
                setUserCredits(5);
                setIsMember(false);
                setTotalCourse(0);
            }
        };
        
        if (user?.primaryEmailAddress?.emailAddress && mounted) {
            fetchUserData();
        }
        // REMOVED: path dependency - don't refetch on every navigation!
    }, [user?.primaryEmailAddress?.emailAddress, mounted, setTotalCourse, setUserCredits, setIsMember]);

    return (
        <div className='h-screen shadow-md p-5 relative'>
            <div className='flex gap-2 items-center'>
                <Image src={'/logo.svg'} alt='logo' width={40} height={40}/>
                <h2 className="font-bold text-2xl">GEMINI LMS</h2>
            </div>

            <div className='mt-10 pb-32'>
                <Link href={'/create'} className="w-full block">
                    <Button 
                        className={`w-full text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg ${
                            !isMember && userCredits <= 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 animate-pulse'
                        }`}
                        disabled={!isMember && userCredits <= 0}
                        title={!isMember && userCredits <= 0 ? 'No credits available. Please upgrade or purchase credits.' : 'Create a new course'}
                    >
                        + Create New {isMember && '✨'}
                    </Button>
                </Link>

                <div className='mt-5 pb-32 overflow-y-auto max-h-[calc(100vh-250px)]'>
                    {MenuList.map((menu,index)=>(
                        <Link href={menu.path} key={index} prefetch={true} onClick={onNavigate}>
                        <div 
                        className={`flex gap-5 items-center p-3
                        hover:bg-slate-200 rounded-lg cursor-pointer mt-3
                        ${path==menu.path&&'bg-slate-200'}`}>
                            <menu.icon/>
                            <h2>{menu.name}</h2>
                        </div>
                        </Link>
                    ))}
                </div>
            </div>

                        <div className='border p-3 bg-slate-100 rounded-lg
            absolute bottom-10 w-[85%]'>
                {isMember ? (
                    <>
                        <h2 className='text-lg mb-2 text-primary font-semibold'>✨ Premium Member</h2>
                        <Progress value={100} className="bg-primary/20" />
                        <h2 className='text-sm text-gray-600'>Unlimited course creation</h2>
                    </>
                ) : (
                    <>
                        <h2 className='text-lg mb-2'>Available Credits : {userCredits}</h2>
                        <Progress value={userCredits > 0 ? ((userCredits) / (userCredits + totalCourse)) * 100 : 0} />
                        <h2 className='text-sm'>{totalCourse} Courses Created</h2>
                    </>
                )}
                
                <Link href={'/dashboard/upgrade'} className='text-primary text-xs mt-3 block'>
                    {isMember ? 'Manage subscription' : 'Upgrade to create more'}
                </Link>
            </div>
    </div>
  )
}

export default SideBar