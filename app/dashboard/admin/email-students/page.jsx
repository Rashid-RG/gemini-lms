"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Mail,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Send,
    Users,
    Filter,
    CheckCircle2,
    XCircle,
    UserCheck,
    ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

const EMAIL_TEMPLATES = [
    { id: 'custom', name: 'Custom Message', icon: '📧', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'announcement', name: 'Announcement', icon: '📢', color: 'bg-green-100 text-green-700' },
    { id: 'reminder', name: 'Reminder', icon: '⏰', color: 'bg-amber-100 text-amber-700' },
    { id: 'congratulations', name: 'Congratulations', icon: '🎉', color: 'bg-purple-100 text-purple-700' },
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
                // Reset form
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
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Email Students</h1>
                        <p className="text-gray-500">Send bulk or individual emails to students</p>
                    </div>
                </div>
                <Button onClick={fetchStudents} disabled={loading} variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Student Selection */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <select
                                value={courseFilter}
                                onChange={(e) => setCourseFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Courses</option>
                                {courses.map((course) => (
                                    <option key={course.courseId} value={course.courseId}>
                                        {course.topic?.substring(0, 40)}...
                                    </option>
                                ))}
                            </select>
                            {courseFilter && (
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Students</option>
                                    <option value="enrolled">Enrolled</option>
                                    <option value="completed">Completed</option>
                                    <option value="in-progress">In Progress</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="font-medium text-gray-700">
                                    {selectedStudents.length} selected of {filteredStudents.length}
                                </span>
                            </div>
                            <Users className="w-5 h-5 text-gray-400" />
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No students found</p>
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                {filteredStudents.map((student) => (
                                    <div
                                        key={student.email}
                                        className={`px-4 py-3 border-b last:border-b-0 flex items-center gap-3 hover:bg-gray-50 cursor-pointer ${
                                            selectedStudents.includes(student.email) ? 'bg-primary/5' : ''
                                        }`}
                                        onClick={() => handleSelectStudent(student.email)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.email)}
                                            onChange={() => handleSelectStudent(student.email)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate">
                                                {student.name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">{student.email}</p>
                                        </div>
                                        {selectedStudents.includes(student.email) && (
                                            <UserCheck className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Compose Email */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" />
                            Compose Email
                        </h3>

                        {/* Template Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Template
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {EMAIL_TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTemplate(t.id)}
                                        className={`p-2 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                                            template === t.id
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span>{t.icon}</span>
                                        <span className="truncate">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Enter email subject..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message *
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message here...&#10;&#10;Use **bold** and *italic* for formatting."
                                rows={8}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Supports **bold** and *italic* formatting
                            </p>
                        </div>

                        {/* Send Button */}
                        <Button
                            onClick={handleSendEmails}
                            disabled={sending || selectedStudents.length === 0}
                            className="w-full"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </Button>

                        {/* Send limit notice */}
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Maximum 50 recipients per batch
                        </p>
                    </div>

                    {/* Results */}
                    {sendResults && (
                        <div className="bg-white rounded-xl border p-4">
                            <h3 className="font-semibold text-gray-800 mb-3">Send Results</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="text-lg font-bold text-green-700">
                                            {sendResults.summary.sent}
                                        </p>
                                        <p className="text-xs text-green-600">Sent</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="text-lg font-bold text-red-700">
                                            {sendResults.summary.failed}
                                        </p>
                                        <p className="text-xs text-red-600">Failed</p>
                                    </div>
                                </div>
                            </div>
                            
                            {sendResults.results.failed.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-red-600 mb-2">Failed emails:</p>
                                    <div className="max-h-[100px] overflow-y-auto text-xs">
                                        {sendResults.results.failed.map((f, i) => (
                                            <div key={i} className="text-red-500">
                                                {f.email}: {f.error}
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
