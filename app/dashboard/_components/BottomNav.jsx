"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Compass, Code, UserCircle } from 'lucide-react';

const BottomNav = () => {
    const path = usePathname();

    const NavItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            path: '/dashboard'
        },
        {
            name: 'Explore',
            icon: Compass,
            path: '/dashboard/explore'
        },
        {
            name: 'Playground',
            icon: Code,
            path: '/dashboard/playground'
        },
        {
            name: 'Profile',
            icon: UserCircle,
            path: '/dashboard/profile'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)]">
            <div className="flex justify-around items-center h-16 px-2">
                {NavItems.map((item, index) => {
                    const isActive = path === item.path;
                    return (
                        <Link key={index} href={item.path} className="flex-1 flex flex-col items-center justify-center h-full w-full relative">
                            <div className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full shadow-[0_2px_5px_rgba(79,70,229,0.5)]" />
                                )}
                                <item.icon className={`w-5 h-5 ${isActive ? 'animate-in zoom-in duration-300' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'font-bold' : ''}`}>
                                    {item.name}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
