"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Megaphone,
    AlertCircle,
    Loader2,
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    Pin,
    PinOff,
    Eye,
    EyeOff,
    X,
    Info,
    AlertTriangle,
    CheckCircle,
    Sparkles,
    Wrench
} from 'lucide-react'
import { toast } from 'sonner'

const TYPE_CONFIG = {
    info: { icon: Info, color: 'bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50', label: 'Info' },
    warning: { icon: AlertTriangle, color: 'bg-amber-50/80 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50', label: 'Warning' },
    success: { icon: CheckCircle, color: 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50', label: 'Success' },
    update: { icon: Sparkles, color: 'bg-violet-50/80 text-violet-700 border border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/50', label: 'Update' },
    maintenance: { icon: Wrench, color: 'bg-slate-100/80 text-slate-700 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50', label: 'Maintenance' }
}

const PRIORITY_CONFIG = {
    low: { color: 'text-slate-500 bg-slate-100/60 border border-slate-200/50 px-2.5 py-0.5 rounded-full text-xs font-medium', label: 'Low' },
    normal: { color: 'text-indigo-500 bg-indigo-50/60 border border-indigo-200/50 px-2.5 py-0.5 rounded-full text-xs font-medium', label: 'Normal' },
    high: { color: 'text-orange-600 bg-orange-50/60 border border-orange-200/50 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm shadow-orange-500/10', label: 'High' },
    urgent: { color: 'text-rose-600 bg-rose-50/60 border border-rose-200/50 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse shadow-sm shadow-rose-500/10', label: 'Urgent' }
}

const SIGNATURE_PRESETS = {
    my_profile: { name: '', role: '', label: 'Logged-in Admin (Default)' },
    help_desk: { name: 'Help Desk Team', role: 'help_desk', label: 'Help Desk Team' },
    academic_support: { name: 'Academic Support Team', role: 'academic_support', label: 'Academic Support Team' },
    system_admin: { name: 'System Admin Team', role: 'system_admin', label: 'System Admin Team' },
    custom: { name: '', role: '', label: 'Custom Signature...' }
}

function AnnouncementsPage() {
    const { user, isLoaded } = useUser()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingAnnouncement, setEditingAnnouncement] = useState(null)
    const [actionLoading, setActionLoading] = useState({})
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'info',
        priority: 'normal',
        targetAudience: 'all',
        isPinned: false,
        expiresAt: '',
        signaturePreset: 'my_profile',
        creatorName: '',
        creatorRole: ''
    })

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchAnnouncements()
        }
    }, [isLoaded, isAdmin])

    const fetchAnnouncements = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/announcements?admin=true')
            setAnnouncements(response.data.announcements || [])
        } catch (error) {
            console.error('Error fetching announcements:', error)
            toast.error('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement)
            
            // Determine preset
            let presetKey = 'my_profile'
            if (announcement.creatorName || announcement.creatorRole) {
                const match = Object.entries(SIGNATURE_PRESETS).find(([key, preset]) => 
                    preset.name === announcement.creatorName && preset.role === announcement.creatorRole
                )
                if (match) {
                    presetKey = match[0]
                } else {
                    presetKey = 'custom'
                }
            }

            setFormData({
                title: announcement.title,
                content: announcement.content,
                type: announcement.type,
                priority: announcement.priority,
                targetAudience: announcement.targetAudience,
                isPinned: announcement.isPinned,
                expiresAt: announcement.expiresAt 
                    ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
                    : '',
                signaturePreset: presetKey,
                creatorName: announcement.creatorName || '',
                creatorRole: announcement.creatorRole || ''
            })
        } else {
            setEditingAnnouncement(null)
            setFormData({
                title: '',
                content: '',
                type: 'info',
                priority: 'normal',
                targetAudience: 'all',
                isPinned: false,
                expiresAt: '',
                signaturePreset: 'my_profile',
                creatorName: '',
                creatorRole: ''
            })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('Title and content are required')
            return
        }

        let finalName = null
        let finalRole = null
        if (formData.signaturePreset === 'custom') {
            finalName = formData.creatorName.trim()
            finalRole = formData.creatorRole.trim()
        } else if (formData.signaturePreset !== 'my_profile') {
            const preset = SIGNATURE_PRESETS[formData.signaturePreset]
            if (preset) {
                finalName = preset.name
                finalRole = preset.role
            }
        }

        const payload = {
            title: formData.title,
            content: formData.content,
            type: formData.type,
            priority: formData.priority,
            targetAudience: formData.targetAudience,
            isPinned: formData.isPinned,
            expiresAt: formData.expiresAt || null,
            creatorName: finalName,
            creatorRole: finalRole
        }

        try {
            setActionLoading(prev => ({ ...prev, submit: true }))
            
            if (editingAnnouncement) {
                // Update existing
                await axios.put('/api/admin/announcements', {
                    id: editingAnnouncement.id,
                    updates: payload,
                    adminEmail: userEmail
                })
                toast.success('Announcement updated')
            } else {
                // Create new
                await axios.post('/api/admin/announcements', {
                    ...payload,
                    adminEmail: userEmail
                })
                toast.success('Announcement created')
            }

            setShowModal(false)
            fetchAnnouncements()
        } catch (error) {
            console.error('Error saving announcement:', error)
            toast.error('Failed to save announcement')
        } finally {
            setActionLoading(prev => ({ ...prev, submit: false }))
        }
    }

    const handleToggleActive = async (id, isActive) => {
        try {
            setActionLoading(prev => ({ ...prev, [id]: 'active' }))
            await axios.put('/api/admin/announcements', {
                id,
                updates: { isActive: !isActive },
                adminEmail: userEmail
            })
            toast.success(isActive ? 'Announcement deactivated' : 'Announcement activated')
            setAnnouncements(prev => prev.map(a => 
                a.id === id ? { ...a, isActive: !isActive } : a
            ))
        } catch (error) {
            toast.error('Failed to update announcement')
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: null }))
        }
    }

    const handleTogglePin = async (id, isPinned) => {
        try {
            setActionLoading(prev => ({ ...prev, [id]: 'pin' }))
            await axios.put('/api/admin/announcements', {
                id,
                updates: { isPinned: !isPinned },
                adminEmail: userEmail
            })
            toast.success(isPinned ? 'Announcement unpinned' : 'Announcement pinned')
            setAnnouncements(prev => prev.map(a => 
                a.id === id ? { ...a, isPinned: !isPinned } : a
            ))
        } catch (error) {
            toast.error('Failed to update announcement')
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: null }))
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return

        try {
            setActionLoading(prev => ({ ...prev, [id]: 'delete' }))
            await axios.delete(`/api/admin/announcements?id=${id}&adminEmail=${userEmail}`)
            toast.success('Announcement deleted')
            setAnnouncements(prev => prev.filter(a => a.id !== id))
        } catch (error) {
            toast.error('Failed to delete announcement')
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: null }))
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never'
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="p-10 text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
                <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
            </div>
        )
    }

    const prioritySidebar = {
        low: 'border-l-4 border-l-slate-400/80 bg-white/60',
        normal: 'border-l-4 border-l-indigo-400/80 bg-white/70',
        high: 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-500/5 via-white/70 to-white/70',
        urgent: 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/5 via-white/70 to-white/70 shadow-sm shadow-rose-500/5'
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <Megaphone className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Announcements</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Manage and schedule platform-wide alerts</p>
                    </div>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={fetchAnnouncements} 
                        disabled={loading} 
                        className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Announcement
                    </button>
                </div>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm">
                        <div className="p-4 bg-slate-50 w-fit rounded-full mx-auto mb-4 border border-slate-100">
                            <Megaphone className="w-10 h-10 mx-auto text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-700 text-lg">No announcements yet</h3>
                        <p className="text-slate-500 mt-1 text-sm max-w-sm mx-auto">Create platform updates, maintenance schedules or custom alerts here.</p>
                        <button 
                            className="mt-6 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
                            onClick={() => handleOpenModal()}
                        >
                            Create First Announcement
                        </button>
                    </div>
                ) : (
                    announcements.map((announcement) => {
                        const TypeIcon = TYPE_CONFIG[announcement.type]?.icon || Info
                        const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info
                        
                        return (
                            <div 
                                key={announcement.id} 
                                className={`backdrop-blur-md border border-slate-200/50 shadow-sm rounded-xl p-5 hover:shadow-md hover:border-indigo-500/20 transition-all duration-300 hover:translate-y-[-2px] relative overflow-hidden ${
                                    !announcement.isActive ? 'opacity-60 bg-slate-50/40' : ''
                                } ${prioritySidebar[announcement.priority] || 'border-l-4 border-l-slate-300'}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`p-2.5 rounded-xl border ${typeConfig.color} shadow-sm`}>
                                            <TypeIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <h3 className="font-bold text-slate-800 text-base">
                                                    {announcement.title}
                                                </h3>
                                                {announcement.isPinned && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                                                        <Pin className="w-3 h-3 fill-indigo-600" /> Pinned
                                                    </span>
                                                )}
                                                {!announcement.isActive && (
                                                    <span className="text-xs bg-slate-100/80 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded-md font-medium">
                                                        Draft / Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                {announcement.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400 font-medium">
                                                <span className={PRIORITY_CONFIG[announcement.priority]?.color}>
                                                    {PRIORITY_CONFIG[announcement.priority]?.label} Priority
                                                </span>
                                                <span className="bg-slate-50 border border-slate-200/50 px-2.5 py-0.5 rounded-full text-slate-500 capitalize">
                                                    Target: {announcement.targetAudience}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    Created: {formatDate(announcement.createdAt)}
                                                </span>
                                                {announcement.expiresAt && (
                                                    <span className="text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-md border border-amber-200/40">
                                                        Expires: {formatDate(announcement.expiresAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 self-center bg-slate-50/50 p-1.5 rounded-xl border border-slate-100 md:self-start">
                                        <button
                                            onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                                            disabled={actionLoading[announcement.id]}
                                            className={`p-2 rounded-lg transition-all duration-200 hover:bg-white active:scale-95 ${
                                                announcement.isPinned ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                            title={announcement.isPinned ? 'Unpin' : 'Pin'}
                                        >
                                            {actionLoading[announcement.id] === 'pin' ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                            ) : announcement.isPinned ? (
                                                <PinOff className="w-4 h-4" />
                                            ) : (
                                                <Pin className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                                            disabled={actionLoading[announcement.id]}
                                            className={`p-2 rounded-lg transition-all duration-200 hover:bg-white active:scale-95 ${
                                                announcement.isActive ? 'text-emerald-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                            title={announcement.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            {actionLoading[announcement.id] === 'active' ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                            ) : announcement.isActive ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(announcement)}
                                            className="p-2 rounded-lg transition-all duration-200 hover:bg-white active:scale-95 text-slate-400 hover:text-indigo-600"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(announcement.id)}
                                            disabled={actionLoading[announcement.id]}
                                            className="p-2 rounded-lg transition-all duration-200 hover:bg-rose-500 hover:text-white active:scale-95 text-slate-400 hover:shadow-sm"
                                            title="Delete"
                                        >
                                            {actionLoading[announcement.id] === 'delete' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl w-full max-w-lg border border-slate-200/60 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 placeholder-slate-400 text-sm"
                                    placeholder="Announcement title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Content *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none resize-none text-slate-800 placeholder-slate-400 text-sm"
                                    rows={4}
                                    placeholder="Write your announcement content here..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                    >
                                        {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Audience</label>
                                    <select
                                        value={formData.targetAudience}
                                        onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="students">Students Only</option>
                                        <option value="creators">Creators Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expires At</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.expiresAt}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 py-2">
                                <input
                                    type="checkbox"
                                    id="isPinned"
                                    checked={formData.isPinned}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 transition-all cursor-pointer"
                                />
                                <label htmlFor="isPinned" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    Pin this announcement to the top
                                </label>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Announcement Signature</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preset Signature</label>
                                        <select
                                            value={formData.signaturePreset}
                                            onChange={(e) => {
                                                const presetVal = e.target.value
                                                setFormData(prev => ({
                                                    ...prev,
                                                    signaturePreset: presetVal,
                                                    creatorName: SIGNATURE_PRESETS[presetVal]?.name || '',
                                                    creatorRole: SIGNATURE_PRESETS[presetVal]?.role || ''
                                                }))
                                            }}
                                            className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                        >
                                            {Object.entries(SIGNATURE_PRESETS).map(([key, val]) => (
                                                <option key={key} value={key}>{val.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {formData.signaturePreset === 'custom' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Custom Sender Name *</label>
                                                <input
                                                    type="text"
                                                    value={formData.creatorName}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, creatorName: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                                    placeholder="e.g. Help Desk Team"
                                                    required={formData.signaturePreset === 'custom'}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Custom Role/Title *</label>
                                                <input
                                                    type="text"
                                                    value={formData.creatorRole}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, creatorRole: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                                    placeholder="e.g. Help Desk"
                                                    required={formData.signaturePreset === 'custom'}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading.submit}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all font-medium text-sm flex items-center justify-center min-w-[90px] disabled:opacity-50"
                                >
                                    {actionLoading.submit ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingAnnouncement ? 'Update' : 'Create'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AnnouncementsPage
