"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Megaphone, X, Pin, AlertTriangle, Info, CheckCircle2, AlertOctagon, HelpCircle, Loader2 } from 'lucide-react'

// Configurations for types
const TYPE_CONFIG = {
    info: {
        icon: Info,
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/30',
        label: 'Info'
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100/50 dark:border-amber-900/30',
        label: 'Alert'
    },
    success: {
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-900/30',
        label: 'Update'
    },
    update: {
        icon: Megaphone,
        color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100/50 dark:border-indigo-900/30',
        label: 'Update'
    },
    maintenance: {
        icon: AlertOctagon,
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100/50 dark:border-rose-900/30',
        label: 'System'
    }
};

// Configurations for priorities
const PRIORITY_CONFIG = {
    low: {
        borderColor: 'border-l-indigo-400 dark:border-l-indigo-600',
        badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
    },
    normal: {
        borderColor: 'border-l-blue-500 dark:border-l-blue-600',
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    },
    high: {
        borderColor: 'border-l-amber-500 dark:border-l-amber-600',
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    },
    urgent: {
        borderColor: 'border-l-rose-500 dark:border-l-rose-600',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse'
    }
};

const formatRole = (role) => {
    if (!role) return 'Help Desk / Admin';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'tutor') return 'Academic Tutor';
    if (role === 'admin') return 'Administrator';
    if (role === 'help_desk') return 'Help Desk Team';
    if (role === 'academic_support') return 'Academic Support';
    if (role === 'system_admin') return 'System Admin';
    return role.split(/[_-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getRoleTheme = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('help') || r.includes('support') || r.includes('desk')) {
        return {
            avatar: 'bg-teal-50 dark:bg-teal-950/40 text-teal-650 dark:text-teal-400 border-teal-100/30 dark:border-teal-900/20',
            badge: 'text-teal-650 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/20 border-teal-100/30 dark:border-teal-900/20'
        };
    }
    if (r.includes('super') || r.includes('system') || r.includes('director')) {
        return {
            avatar: 'bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border-violet-100/30 dark:border-violet-900/20',
            badge: 'text-violet-650 dark:text-violet-400 bg-violet-50/80 dark:bg-violet-950/20 border-violet-100/30 dark:border-violet-900/20'
        };
    }
    if (r.includes('tutor') || r.includes('academic') || r.includes('teacher') || r.includes('instructor')) {
        return {
            avatar: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 border-emerald-100/30 dark:border-emerald-900/20',
            badge: 'text-emerald-650 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100/30 dark:border-emerald-900/20'
        };
    }
    return {
        avatar: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/20',
        badge: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-100/30 dark:border-indigo-900/20'
    };
};

const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

function AnnouncementFeed() {
    const { user, isLoaded } = useUser();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dismissingId, setDismissingId] = useState(null);

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

    useEffect(() => {
        if (!userEmail) return;

        const fetchAnnouncements = async () => {
            try {
                const response = await axios.get(`/api/admin/announcements?userEmail=${encodeURIComponent(userEmail)}`);
                setAnnouncements(response.data.announcements || []);
            } catch (err) {
                console.error('Error fetching announcements:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [userEmail]);

    const handleDismiss = async (id) => {
        if (!userEmail) return;
        setDismissingId(id);

        try {
            // Trigger animation and call API to dismiss
            await axios.put('/api/admin/announcements', {
                id,
                userEmail,
                action: 'dismiss'
            });

            // Fade out locally
            setTimeout(() => {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            }, 300);
        } catch (err) {
            console.error('Error dismissing announcement:', err);
            setDismissingId(null);
        }
    };

    if (!isLoaded || loading) {
        return null; // Don't show anything during loader to maintain clean interface
    }

    if (announcements.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Platform Announcements</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3.5">
                {announcements.map((a) => {
                    const typeConfig = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
                    const priorityConfig = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
                    const TypeIcon = typeConfig.icon;
                    const isDismissing = dismissingId === a.id;

                    return (
                        <div
                            key={a.id}
                            className={`
                                relative overflow-hidden backdrop-blur-xl bg-white/85 dark:bg-slate-900/80 
                                border border-slate-200/50 dark:border-slate-800/60 shadow-sm rounded-2xl p-4 sm:p-5
                                flex flex-col sm:flex-row gap-4 items-start justify-between
                                transition-all duration-300 hover:shadow-md hover:scale-[1.005]
                                border-l-4 ${priorityConfig.borderColor}
                                ${isDismissing ? 'opacity-0 scale-95 duration-300' : 'animate-in fade-in slide-in-from-top-2 duration-300'}
                            `}
                        >
                            {/* Decorative background blur glow for pinned or urgent */}
                            {(a.isPinned || a.priority === 'urgent') && (
                                <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                            )}

                            <div className="flex gap-4 items-start flex-1 min-w-0">
                                {/* Type icon round badge */}
                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${typeConfig.color}`}>
                                    <TypeIcon className="h-5 w-5" />
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug tracking-tight truncate">
                                            {a.title}
                                        </h3>
                                        
                                        {/* Status / Priority Badges */}
                                        <div className="flex gap-1.5 items-center">
                                            {a.isPinned && (
                                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                                                    <Pin className="h-2.5 w-2.5 rotate-45 text-indigo-500" />
                                                    Pinned
                                                </span>
                                            )}
                                            {a.priority !== 'normal' && (
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityConfig.badge}`}>
                                                    {a.priority}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {a.content}
                                    </p>
                                    
                                    <p className="text-[10px] text-slate-400 font-bold tracking-wide">
                                        Posted on {new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>

                                    {/* Creator Signature Block */}
                                    {(a.creatorName || a.createdBy) && (() => {
                                        const theme = getRoleTheme(a.creatorRole);
                                        return (
                                            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center gap-2.5 w-full">
                                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black tracking-tighter uppercase shadow-sm border ${theme.avatar}`}>
                                                    {getInitials(a.creatorName)}
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350">
                                                        {a.creatorName || 'Administrator'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">•</span>
                                                    <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${theme.badge}`}>
                                                        {formatRole(a.creatorRole)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Dismiss Close Button */}
                            <button
                                onClick={() => handleDismiss(a.id)}
                                disabled={isDismissing}
                                className="
                                    h-9 w-9 rounded-xl border border-slate-200/50 dark:border-slate-800/40 
                                    bg-white/80 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 
                                    hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm
                                    transition-all duration-200 hover:scale-105 active:scale-95
                                    self-end sm:self-start
                                "
                                title="Dismiss announcement"
                                aria-label="Dismiss Announcement"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AnnouncementFeed;
