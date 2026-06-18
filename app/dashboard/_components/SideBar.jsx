"use client"
import { CourseCountContext } from '@/app/_context/CourseCountContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LayoutDashboard, Shield, UserCircle, TrendingUp, Award, Compass, Trophy, LifeBuoy, ShieldCheck, ClipboardCheck, ClipboardList, Users, Settings, CreditCard, BarChart3, Mail, BookOpen, Megaphone, History, GraduationCap, Code, ChevronLeft, HelpCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useContext, useMemo, useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'

function SideBar({ onNavigate, onCollapseToggle }) {
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
            name:'Code Playground',
            icon:Code,
            path:'/dashboard/playground'
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
        {
            name:'How to Use',
            icon:HelpCircle,
            path:'/dashboard/guide'
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

    const fetchUserData = useCallback(async (forceRefresh = false) => {
        if (!user?.primaryEmailAddress?.emailAddress) return;
        
        try {
            // Fetch courses
            let coursesResult;
            try {
                coursesResult = await axios.post('/api/courses', {
                    createdBy: user.primaryEmailAddress.emailAddress
                }, { timeout: 45000 });
            } catch (firstErr) {
                if (firstErr?.code === 'ECONNABORTED' || firstErr?.message?.includes('timeout')) {
                    coursesResult = await axios.post('/api/courses', {
                        createdBy: user.primaryEmailAddress.emailAddress
                    }, { timeout: 45000 });
                } else {
                    throw firstErr;
                }
            }
            const courses = coursesResult?.data?.result || [];
            setTotalCourse(courses.length);
        } catch (courseError) {
            console.error('Error fetching courses:', courseError?.message);
            setTotalCourse(0);
        }
        
        try {
            // Fetch user credits
            const userResult = await axios.post('/api/create-user', {
                user: {
                    fullName: user?.fullName,
                    email: user.primaryEmailAddress.emailAddress
                },
                forceRefresh
            }, { timeout: 8000 });
            
            if (userResult?.data?.result) {
                const userData = userResult.data.result;
                setUserCredits(userData.credits ?? 5);
                setIsMember(userData.isMember ?? false);
            } else {
                setUserCredits(5);
                setIsMember(false);
            }
        } catch (userError) {
            setUserCredits(5);
            setIsMember(false);
        }
    }, [user, setTotalCourse, setUserCredits, setIsMember]);

    // Load data on user change
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && mounted) {
            fetchUserData(false);
        }
    }, [user?.primaryEmailAddress?.emailAddress, mounted, fetchUserData]);

    // Dynamic refetch when returning to the dashboard page to ensure real-time credit updates
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && mounted && path === '/dashboard') {
            fetchUserData(true);
        }
    }, [path, user?.primaryEmailAddress?.emailAddress, mounted, fetchUserData]);

    return (
        <div className='h-screen border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between relative shadow-sm'>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <div className='flex gap-2 items-center px-2 py-1 justify-between w-full'>
                    <div className='flex gap-2 items-center'>
                        <Image src={'/logo.svg'} alt='logo' width={32} height={32}/>
                        <h2 className="font-black text-xl tracking-tight text-slate-800 dark:text-white">GEMINI LMS</h2>
                    </div>
                    {onCollapseToggle && (
                        <button
                            onClick={onCollapseToggle}
                            className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                            aria-label="Collapse Sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className='mt-8 flex-1 flex flex-col overflow-hidden'>
                    <Link href={'/create'} className="w-full block px-1">
                        <Button 
                            className={`w-full text-white font-bold transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg ${
                                !isMember && userCredits <= 0
                                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                                    : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-200'
                            }`}
                            disabled={!isMember && userCredits <= 0}
                            title={!isMember && userCredits <= 0 ? 'No credits available. Please upgrade or purchase credits.' : 'Create a new course'}
                        >
                            + Create New {isMember && '✨'}
                        </Button>
                    </Link>

                    <div className='mt-6 pr-1 overflow-y-auto flex-1 space-y-1'>
                        {MenuList.map((menu, index) => {
                            const isActive = path === menu.path;
                            return (
                                <Link href={menu.path} key={index} prefetch={true} onClick={onNavigate} className="block">
                                    <div className={`
                                        flex gap-4 items-center px-4 py-3 rounded-xl cursor-pointer
                                        transition-all duration-200 group relative
                                        ${isActive 
                                            ? 'bg-indigo-50/75 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' 
                                            : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                                        }
                                    `}>
                                        {isActive && (
                                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-md" />
                                        )}
                                        <menu.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                        <span className="text-sm tracking-wide">{menu.name}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className='border border-slate-100 dark:border-slate-800 p-4 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/30 rounded-2xl w-full shadow-sm flex flex-col gap-2 mt-auto mb-2'>
                {isMember ? (
                    <>
                        <h2 className='text-xs font-black text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5'>
                            ✨ Premium Member
                        </h2>
                        <Progress value={100} className="h-1.5 bg-indigo-100 [&>div]:bg-indigo-600" />
                        <h2 className='text-[10px] text-slate-500 dark:text-slate-400 font-medium'>Unlimited course creation enabled</h2>
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Available Credits</span>
                            <span className="font-black text-indigo-600">{userCredits} / 5</span>
                        </div>
                        <Progress value={userCredits > 0 ? (userCredits / 5) * 100 : 0} className="h-1.5 bg-indigo-50 [&>div]:bg-indigo-600" />
                        <h2 className='text-[10px] text-slate-500 dark:text-slate-400 font-medium'>{totalCourse} Courses Created</h2>
                    </>
                )}
                
                <Link href={'/dashboard/upgrade'} className='text-indigo-600 hover:text-indigo-700 text-xs font-bold mt-1 transition-colors hover:underline block'>
                    {isMember ? 'Manage subscription' : 'Upgrade for more credits →'}
                </Link>
            </div>
        </div>
    )
}

export default SideBar