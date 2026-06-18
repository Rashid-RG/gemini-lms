"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { 
    Mail,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Send,
    Users,
    CheckCircle2,
    XCircle,
    UserCheck,
    X
} from 'lucide-react'
import { toast } from 'sonner'

const EMAIL_TEMPLATES = [
    { id: 'custom', name: 'Custom Message', icon: '📧' },
    { id: 'announcement', name: 'Announcement', icon: '📢' },
    { id: 'reminder', name: 'Reminder', icon: '⏰' },
    { id: 'congratulations', name: 'Congratulations', icon: '🎉' },
]

function EmailStudentsPage() {
    const { user, isLoaded } = useUser()
    const [students, setStudents] = useState([])
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    
    // Selection state
    const [selectedStudents, setSelectedStudents] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [courseFilter, setCourseFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    
    // Email form state
    const [template, setTemplate] = useState('custom')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    
    // Results
    const [sendResults, setSendResults] = useState(null)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchStudents()
        }
    }, [isLoaded, isAdmin, courseFilter, statusFilter])

    const fetchStudents = async () => {
        try {
            setLoading(true)
            let url = '/api/admin/email-students'
            const params = new URLSearchParams()
            if (courseFilter) params.append('courseId', courseFilter)
            if (statusFilter) params.append('filter', statusFilter)
            if (params.toString()) url += '?' + params.toString()

            const response = await axios.get(url)
            setStudents(response.data.students || [])
            setCourses(response.data.courses || [])
        } catch (error) {
            console.error('Error fetching students:', error)
            toast.error('Failed to load students')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectAll = () => {
        const filtered = filteredStudents.map(s => s.email)
        if (selectedStudents.length === filtered.length) {
            setSelectedStudents([])
        } else {
            setSelectedStudents(filtered)
        }
    }

    const handleSelectStudent = (email) => {
        if (selectedStudents.includes(email)) {
            setSelectedStudents(prev => prev.filter(e => e !== email))
        } else {
            setSelectedStudents(prev => [...prev, email])
        }
    }

    const handleSendEmails = async () => {
        if (selectedStudents.length === 0) {
            toast.error('Please select at least one recipient')
            return
        }
        if (!subject.trim()) {
            toast.error('Please enter a subject')
            return
        }
        if (!message.trim()) {
            toast.error('Please enter a message')
            return
        }

        try {
            setSending(true)
            setSendResults(null)

            const response = await axios.post('/api/admin/email-students', {
                recipients: selectedStudents,
                subject,
                message,
                template,
                adminEmail: userEmail
            })

            setSendResults(response.data)
            
            if (response.data.summary.failed === 0) {
                toast.success(`Successfully sent ${response.data.summary.sent} emails!`)
                setSelectedStudents([])
                setSubject('')
                setMessage('')
            } else {
                toast.warning(`Sent ${response.data.summary.sent} emails, ${response.data.summary.failed} failed`)
            }
        } catch (error) {
            console.error('Error sending emails:', error)
            toast.error(error.response?.data?.error || 'Failed to send emails')
        } finally {
            setSending(false)
        }
    }

    // Filter students by search query
    const filteredStudents = students.filter(s => 
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <Mail className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Email Students</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Send bulk or individual email templates to enrolled student profiles</p>
                    </div>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={fetchStudents} 
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Student Selection */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 placeholder-slate-400 text-sm"
                                />
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={courseFilter}
                                    onChange={(e) => setCourseFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm min-w-[150px]"
                                >
                                    <option value="">All Courses</option>
                                    {courses.map((course) => (
                                        <option key={course.courseId} value={course.courseId}>
                                            {course.topic?.substring(0, 30)}...
                                        </option>
                                    ))}
                                </select>
                                {courseFilter && (
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="enrolled">Enrolled</option>
                                        <option value="completed">Completed</option>
                                        <option value="in-progress">In Progress</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="bg-slate-50/70 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <input
                                  type="checkbox"
                                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                  onChange={handleSelectAll}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  {selectedStudents.length} selected of {filteredStudents.length}
                              </span>
                          </div>
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-20 text-slate-500 bg-white/50">
                                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-semibold text-sm">No students found matching current filters</p>
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 bg-white/50">
                                {filteredStudents.map((student, index) => {
                                    const isSelected = selectedStudents.includes(student.email)
                                    return (
                                        <div
                                            key={student.id || `${student.email}-${index}`}
                                            className={`px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 cursor-pointer transition-colors duration-150 ${
                                                isSelected ? 'bg-indigo-50/40' : ''
                                            }`}
                                            onClick={() => handleSelectStudent(student.email)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectStudent(student.email)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">
                                                    {student.name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{student.email}</p>
                                            </div>
                                            {isSelected && (
                                                <UserCheck className="w-4 h-4 text-indigo-600" />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Compose Email */}
                <div className="space-y-4">
                    <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-5 space-y-4">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Send className="w-4.5 h-4.5 text-indigo-500" />
                            Compose Email
                        </h3>

                        {/* Template Selection */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Email Template
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {EMAIL_TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTemplate(t.id)}
                                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all duration-200 active:scale-95 ${
                                            template === t.id
                                                ? 'border-indigo-500 bg-indigo-50/80 text-indigo-600 shadow-sm shadow-indigo-500/5'
                                                : 'border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>{t.icon}</span>
                                        <span className="truncate">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Enter email subject..."
                                className="w-full px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 placeholder-slate-400 text-sm"
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Message *
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message here...&#10;&#10;Use **bold** and *italic* for styling."
                                rows={8}
                                className="w-full px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none resize-none text-slate-800 placeholder-slate-400 text-sm"
                            />
                            <p className="text-[10px] text-slate-400 font-semibold italic">
                                Markdown format is supported (**bold**, *italic*)
                            </p>
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSendEmails}
                            disabled={sending || selectedStudents.length === 0}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin text-white" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-slate-400 text-center font-semibold">
                            Maximum 50 recipients per batch limit applies
                        </p>
                    </div>

                    {/* Results */}
                    {sendResults && (
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-5 animate-in fade-in duration-300">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">Send Results</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <div>
                                        <p className="text-lg font-extrabold text-emerald-700">
                                            {sendResults.summary.sent}
                                        </p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Sent</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200/50 rounded-xl">
                                    <XCircle className="w-5 h-5 text-rose-600" />
                                    <div>
                                        <p className="text-lg font-extrabold text-rose-700">
                                            {sendResults.summary.failed}
                                        </p>
                                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wide">Failed</p>
                                    </div>
                                </div>
                            </div>
                            
                            {sendResults.results.failed.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <p className="text-xs font-bold text-rose-600 mb-1.5">Failed Recipient Errors:</p>
                                    <div className="max-h-[120px] overflow-y-auto text-xs space-y-1 divide-y divide-slate-50">
                                        {sendResults.results.failed.map((f, i) => (
                                            <div key={i} className="text-rose-500 py-1 font-medium">
                                                {f.email}: <span className="font-normal text-slate-500">{f.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EmailStudentsPage
