"use client"
import { CourseCountContext } from '@/app/_context/CourseCountContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LayoutDashboard, Shield, UserCircle, TrendingUp, Award, Compass, Trophy, LifeBuoy, ShieldCheck, ClipboardCheck, ClipboardList, Users, Settings, CreditCard, BarChart3, Mail, BookOpen, Megaphone, History } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useContext, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'

function SideBar({ onNavigate }) {
    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const adminEmails = useMemo(() => (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean), []);
    const isAdmin = !!(userEmail && adminEmails.includes(userEmail));

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

    // Fetch credits and course count when sidebar mounts, user changes, or path changes
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.primaryEmailAddress?.emailAddress) return;
            
            try {
                // Check if we should force refresh (after payment)
                const urlParams = new URLSearchParams(window.location.search);
                const forceRefresh = urlParams.has('refresh');
                
                // Fetch courses
                const coursesResult = await axios.post('/api/courses', {
                    createdBy: user.primaryEmailAddress.emailAddress
                });
                const courses = coursesResult?.data?.result || [];
                setTotalCourse(courses.length);
                
                // Fetch user credits from create-user API (which returns user data)
                const userResult = await axios.post('/api/create-user', {
                    user: {
                        fullName: user?.fullName,
                        email: user.primaryEmailAddress.emailAddress
                    },
                    forceRefresh: forceRefresh
                });
                
                if (userResult?.data?.result) {
                    const userData = userResult.data.result;
                    setUserCredits(userData.credits ?? 5);
                    setIsMember(userData.isMember ?? false);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        
        if (user?.primaryEmailAddress?.emailAddress) {
            fetchUserData();
        }
    }, [user?.primaryEmailAddress?.emailAddress, path, setTotalCourse, setUserCredits, setIsMember]);

    return (
        <div className='h-screen shadow-md p-5 relative'>
            <div className='flex gap-2 items-center'>
                <Image src={'/logo.svg'} alt='logo' width={40} height={40}/>
                <h2 className="font-bold text-2xl">GEMINI LMS</h2>
            </div>

            <div className='mt-10 pb-32'>
                <Link href={'/create'} className="w-full">
                <Button className="w-full" disabled={totalCourse>=5}>+ Create New</Button>
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
                        <Progress value={userCredits > 0 ? Math.min((totalCourse / userCredits) * 100, 100) : 100} />
                        <h2 className='text-sm'>{totalCourse} Out of {userCredits} Credits Used</h2>
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