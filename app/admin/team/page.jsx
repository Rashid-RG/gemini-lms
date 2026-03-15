"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { toast } from 'sonner'
import { 
    Users, Plus, Shield, Eye, Edit2, Trash2, 
    UserCheck, UserX, BookOpen, Loader2, Search,
    ChevronDown, X, Check
} from 'lucide-react'

export default function TeamPage() {
    const { admin } = useAdminAuth()
    const [members, setMembers] = useState([])
    const [stats, setStats] = useState({})
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)
    const [roleFilter, setRoleFilter] = useState('')
    const [showInactive, setShowInactive] = useState(false)

    const fetchTeam = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (roleFilter) params.set('role', roleFilter)
            // Show inactive members if toggle is ON
            if (showInactive) params.set('active', 'false')
            const res = await axios.get(`/api/admin/team?${params.toString()}`)
            setMembers(res.data.members)
            setStats(res.data.stats)
        } catch (err) {
            toast.error('Failed to load team members')
        } finally {
            setLoading(false)
        }
    }, [roleFilter, showInactive])

    useEffect(() => {
        fetchTeam()
    }, [fetchTeam])

    if (admin?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Super Admin Only</h2>
                    <p className="text-gray-500 mt-2">Only super admins can manage team members.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Team</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Create tutors and admins, assign courses for review
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Team Member
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Members" value={stats.total || 0} icon={Users} color="blue" />
                <StatCard label="Super Admins" value={stats.superAdmins || 0} icon={Shield} color="purple" />
                <StatCard label="Admins" value={stats.admins || 0} icon={UserCheck} color="green" />
                <StatCard label="Tutors" value={stats.tutors || 0} icon={Eye} color="orange" />
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 items-center">
                {['', 'super_admin', 'admin', 'tutor'].map(role => (
                    <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            roleFilter === role
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {role === '' ? 'All' : role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                ))}
                
                {/* Show Inactive Toggle */}
                <button
                    onClick={() => setShowInactive(!showInactive)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-2 ${
                        showInactive
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={showInactive ? 'Showing inactive members' : 'Click to show inactive members'}
                >
                    {showInactive ? '👁️ Showing Inactive' : '👁️ Hide Inactive'}
                </button>
            </div>

            {/* Members Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : members.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No team members found</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Member</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Courses</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Login</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {members.map(member => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentAdmin={admin}
                                        onAssign={() => {
                                            setSelectedMember(member)
                                            setShowAssignModal(true)
                                        }}
                                        onToggleActive={async () => {
                                            try {
                                                await axios.put('/api/admin/team', {
                                                    memberId: member.id,
                                                    isActive: !member.isActive,
                                                })
                                                toast.success(`${member.name} ${member.isActive ? 'deactivated' : 'activated'}`)
                                                fetchTeam()
                                            } catch (err) {
                                                toast.error(err.response?.data?.error || 'Failed to update')
                                            }
                                        }}
                                        onChangeRole={async (newRole) => {
                                            try {
                                                await axios.put('/api/admin/team', {
                                                    memberId: member.id,
                                                    role: newRole,
                                                })
                                                toast.success(`${member.name} role updated to ${newRole}`)
                                                fetchTeam()
                                            } catch (err) {
                                                toast.error(err.response?.data?.error || 'Failed to update role')
                                            }
                                        }}
                                        onDelete={async () => {
                                            if (window.confirm(`Delete ${member.name} and remove from database?`)) {
                                                try {
                                                    await axios.delete('/api/admin/team', {
                                                        data: { memberId: member.id }
                                                    })
                                                    toast.success(`${member.name} deleted successfully`)
                                                    fetchTeam()
                                                } catch (err) {
                                                    toast.error(err.response?.data?.error || 'Failed to delete member')
                                                }
                                            }
                                        }}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Member Modal */}
            {showCreateModal && (
                <CreateMemberModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false)
                        fetchTeam()
                    }}
                />
            )}

            {/* Assign Courses Modal */}
            {showAssignModal && selectedMember && (
                <AssignCoursesModal
                    member={selectedMember}
                    onClose={() => {
                        setShowAssignModal(false)
                        setSelectedMember(null)
                    }}
                    onUpdated={() => {
                        fetchTeam()
                    }}
                />
            )}
        </div>
    )
}

/* ---- Sub-components ---- */

function StatCard({ label, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    }
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
            </div>
        </div>
    )
}

function MemberRow({ member, currentAdmin, onAssign, onToggleActive, onChangeRole, onDelete }) {
    const [showRoleMenu, setShowRoleMenu] = useState(false)
    const isSelf = currentAdmin?.email === member.email

    const roleColors = {
        super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        tutor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-6 py-4">
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="relative">
                    <button
                        onClick={() => !isSelf && setShowRoleMenu(!showRoleMenu)}
                        disabled={isSelf}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[member.role] || 'bg-gray-100 text-gray-600'} ${isSelf ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                    >
                        {member.role === 'super_admin' ? 'Super Admin' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        {!isSelf && <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showRoleMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowRoleMenu(false)} />
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                                {['tutor', 'admin', 'super_admin'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            onChangeRole(role)
                                            setShowRoleMenu(false)
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                            member.role === role ? 'font-medium text-primary' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                                        {member.role === role && <Check className="inline h-3 w-3 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <button
                    onClick={onAssign}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    <BookOpen className="h-4 w-4" />
                    {member.assignmentCount} course{member.assignmentCount !== 1 ? 's' : ''}
                </button>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    member.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {!isSelf && (
                        <>
                            <button
                                onClick={onToggleActive}
                                className={`p-2 rounded-lg transition-colors ${
                                    member.isActive
                                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                }`}
                                title={member.isActive ? 'Deactivate' : 'Activate'}
                            >
                                {member.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete member"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    )
}

function CreateMemberModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ email: '', name: '', password: '', role: 'tutor' })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await axios.post('/api/admin/team', form)
            toast.success(`${form.role === 'tutor' ? 'Tutor' : 'Admin'} "${form.name}" created!`)
            onCreated()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create member')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Team Member</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="tutor@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Min 8 characters"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select
                            value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="tutor">Tutor (review assigned courses)</option>
                            <option value="admin">Admin (full access)</option>
                        </select>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        {form.role === 'tutor'
                            ? '🎓 Tutors can review & edit content only for courses assigned to them.'
                            : '🔑 Admins have full access to all courses and admin features.'}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function AssignCoursesModal({ member, onClose, onUpdated }) {
    const [courses, setCourses] = useState([])
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [member.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [coursesRes, assignRes] = await Promise.all([
                axios.get('/api/admin/courses'),
                axios.get(`/api/admin/team/assignments?adminId=${member.id}`),
            ])
            setCourses(coursesRes.data.courses || coursesRes.data.result || [])
            setAssignments(assignRes.data.assignments || [])
        } catch (err) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const assignedCourseIds = new Set(assignments.map(a => a.courseId))

    const filteredCourses = courses.filter(c =>
        (c.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.courseId || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleAssign = async (courseId) => {
        setSaving(true)
        try {
            await axios.post('/api/admin/team/assignments', {
                adminId: member.id,
                courseIds: [courseId],
            })
            toast.success('Course assigned')
            await loadData()
            onUpdated()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign')
        } finally {
            setSaving(false)
        }
    }

    const handleRemove = async (assignmentId) => {
        try {
            await axios.delete('/api/admin/team/assignments', {
                data: { assignmentId },
            })
            toast.success('Assignment removed')
            await loadData()
            onUpdated()
        } catch (err) {
            toast.error('Failed to remove assignment')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Assign Courses — {member.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {member.role === 'tutor' ? 'Tutor' : 'Admin'} • {member.email}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Current Assignments */}
                            {assignments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Assigned Courses ({assignments.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {assignments.map(a => (
                                            <div
                                                key={a.id}
                                                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {a.courseTopic || 'Unknown Course'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {a.courseType} • {a.courseId?.substring(0, 8)}...
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemove(a.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                    title="Remove assignment"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Available Courses */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Available Courses
                                </h3>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search courses..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {filteredCourses.length === 0 ? (
                                        <p className="text-center text-sm text-gray-400 py-4">No courses found</p>
                                    ) : (
                                        filteredCourses.map(course => {
                                            const isAssigned = assignedCourseIds.has(course.courseId)
                                            return (
                                                <div
                                                    key={course.courseId}
                                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                                        isAssigned
                                                            ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 opacity-60'
                                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                            {course.topic || 'Untitled'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {course.courseType} • by {course.createdBy?.split('@')[0]}
                                                        </p>
                                                    </div>
                                                    {isAssigned ? (
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                                                            Assigned
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAssign(course.courseId)}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
                                                        >
                                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                                            Assign
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
