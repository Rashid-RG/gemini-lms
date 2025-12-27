"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { 
    X,
    Info,
    AlertTriangle,
    CheckCircle,
    Sparkles,
    Wrench,
    ChevronDown,
    ChevronUp
} from 'lucide-react'

const TYPE_CONFIG = {
    info: { 
        icon: Info, 
        bgColor: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-500'
    },
    warning: { 
        icon: AlertTriangle, 
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-500'
    },
    success: { 
        icon: CheckCircle, 
        bgColor: 'bg-green-50 border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-500'
    },
    update: { 
        icon: Sparkles, 
        bgColor: 'bg-purple-50 border-purple-200',
        textColor: 'text-purple-800',
        iconColor: 'text-purple-500'
    },
    maintenance: { 
        icon: Wrench, 
        bgColor: 'bg-gray-100 border-gray-300',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-500'
    }
}

const PRIORITY_STYLES = {
    urgent: 'ring-2 ring-red-400 animate-pulse',
    high: 'ring-1 ring-orange-300',
    normal: '',
    low: 'opacity-90'
}

function AnnouncementBanner() {
    const { user, isLoaded } = useUser()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)
    const [dismissedIds, setDismissedIds] = useState([])

    const userEmail = user?.primaryEmailAddress?.emailAddress

    useEffect(() => {
        if (isLoaded) {
            fetchAnnouncements()
        }
    }, [isLoaded, userEmail])

    const fetchAnnouncements = async () => {
        try {
            setLoading(true)
            const url = userEmail 
                ? `/api/admin/announcements?userEmail=${encodeURIComponent(userEmail)}`
                : '/api/admin/announcements'
            console.log('Fetching announcements from:', url)
            const response = await axios.get(url)
            console.log('Announcements response:', response.data)
            const fetchedAnnouncements = response.data.announcements || []
            setAnnouncements(fetchedAnnouncements)
        } catch (error) {
            console.error('Error fetching announcements:', error)
            setAnnouncements([])
        } finally {
            setLoading(false)
        }
    }

    const handleDismiss = async (id) => {
        // Optimistically remove from UI
        setDismissedIds(prev => [...prev, id])

        // Persist dismissal if user is logged in
        if (userEmail) {
            try {
                await axios.put('/api/admin/announcements', {
                    id,
                    action: 'dismiss',
                    userEmail
                })
            } catch (error) {
                console.error('Error dismissing announcement:', error)
            }
        }
    }

    // Filter out dismissed announcements
    const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id))

    if (loading || visibleAnnouncements.length === 0) {
        return null
    }

    // Show only the first announcement, or all if expanded
    const displayedAnnouncements = expanded 
        ? visibleAnnouncements 
        : visibleAnnouncements.slice(0, 1)

    return (
        <div className="w-full space-y-2 mb-4">
            {displayedAnnouncements.map((announcement) => {
                const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info
                const TypeIcon = config.icon
                const priorityStyle = PRIORITY_STYLES[announcement.priority] || ''

                return (
                    <div 
                        key={announcement.id}
                        className={`relative flex items-start gap-3 px-4 py-3 rounded-lg border ${config.bgColor} ${priorityStyle} transition-all`}
                    >
                        <TypeIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium ${config.textColor}`}>
                                {announcement.title}
                            </p>
                            <p className={`text-sm mt-0.5 ${config.textColor} opacity-80 line-clamp-2`}>
                                {announcement.content}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDismiss(announcement.id)}
                            className={`p-1 rounded hover:bg-white/50 ${config.textColor} opacity-60 hover:opacity-100 flex-shrink-0`}
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            })}

            {/* Show more/less toggle */}
            {visibleAnnouncements.length > 1 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-4 h-4" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" />
                            {visibleAnnouncements.length - 1} more announcement{visibleAnnouncements.length > 2 ? 's' : ''}
                        </>
                    )}
                </button>
            )}
        </div>
    )
}

export default AnnouncementBanner
