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
    info: { icon: Info, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Info' },
    warning: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Warning' },
    success: { icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200', label: 'Success' },
    update: { icon: Sparkles, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Update' },
    maintenance: { icon: Wrench, color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Maintenance' }
}

const PRIORITY_CONFIG = {
    low: { color: 'text-gray-500', label: 'Low' },
    normal: { color: 'text-blue-500', label: 'Normal' },
    high: { color: 'text-orange-500', label: 'High' },
    urgent: { color: 'text-red-500 font-bold', label: 'Urgent' }
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
        expiresAt: ''
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
            setFormData({
                title: announcement.title,
                content: announcement.content,
                type: announcement.type,
                priority: announcement.priority,
                targetAudience: announcement.targetAudience,
                isPinned: announcement.isPinned,
                expiresAt: announcement.expiresAt 
                    ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
                    : ''
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
                expiresAt: ''
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

        try {
            setActionLoading(prev => ({ ...prev, submit: true }))
            
            if (editingAnnouncement) {
                // Update existing
                await axios.put('/api/admin/announcements', {
                    id: editingAnnouncement.id,
                    updates: formData,
                    adminEmail: userEmail
                })
                toast.success('Announcement updated')
            } else {
                // Create new
                await axios.post('/api/admin/announcements', {
                    ...formData,
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

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Megaphone className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
                        <p className="text-gray-500">Manage platform-wide announcements</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchAnnouncements} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Announcement
                    </Button>
                </div>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border">
                        <Megaphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No announcements yet</p>
                        <Button className="mt-4" onClick={() => handleOpenModal()}>
                            Create First Announcement
                        </Button>
                    </div>
                ) : (
                    announcements.map((announcement) => {
                        const TypeIcon = TYPE_CONFIG[announcement.type]?.icon || Info
                        const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info
                        
                        return (
                            <div 
                                key={announcement.id} 
                                className={`bg-white rounded-xl border p-5 ${
                                    !announcement.isActive ? 'opacity-60' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                                            <TypeIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-800">
                                                    {announcement.title}
                                                </h3>
                                                {announcement.isPinned && (
                                                    <Pin className="w-4 h-4 text-primary" />
                                                )}
                                                {!announcement.isActive && (
                                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {announcement.content}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                <span className={PRIORITY_CONFIG[announcement.priority]?.color}>
                                                    {PRIORITY_CONFIG[announcement.priority]?.label} Priority
                                                </span>
                                                <span>Target: {announcement.targetAudience}</span>
                                                <span>Created: {formatDate(announcement.createdAt)}</span>
                                                {announcement.expiresAt && (
                                                    <span>Expires: {formatDate(announcement.expiresAt)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                                            disabled={actionLoading[announcement.id]}
                                            className={`p-2 rounded-lg hover:bg-gray-100 ${
                                                announcement.isPinned ? 'text-primary' : 'text-gray-400'
                                            }`}
                                            title={announcement.isPinned ? 'Unpin' : 'Pin'}
                                        >
                                            {actionLoading[announcement.id] === 'pin' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : announcement.isPinned ? (
                                                <PinOff className="w-4 h-4" />
                                            ) : (
                                                <Pin className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                                            disabled={actionLoading[announcement.id]}
                                            className={`p-2 rounded-lg hover:bg-gray-100 ${
                                                announcement.isActive ? 'text-green-600' : 'text-gray-400'
                                            }`}
                                            title={announcement.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            {actionLoading[announcement.id] === 'active' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : announcement.isActive ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(announcement)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(announcement.id)}
                                            disabled={actionLoading[announcement.id]}
                                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">
                                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Announcement title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Content *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                                    rows={4}
                                    placeholder="Announcement content..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    >
                                        {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Target Audience</label>
                                    <select
                                        value={formData.targetAudience}
                                        onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="students">Students Only</option>
                                        <option value="creators">Creators Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Expires At</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.expiresAt}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPinned"
                                    checked={formData.isPinned}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isPinned" className="text-sm font-medium">
                                    Pin this announcement (shows at top)
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={actionLoading.submit}>
                                    {actionLoading.submit ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingAnnouncement ? 'Update' : 'Create'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AnnouncementsPage
