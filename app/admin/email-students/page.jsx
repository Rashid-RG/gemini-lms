"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
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
    const { admin, loading: authLoading } = useAdminAuth()
    const [students, setStudents] = useState([])
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    
    const userEmail = admin?.email

    // Selection state
    const [selectedStudents, setSelectedStudents] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [courseFilter, setCourseFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    
    // Email form state
    const [template, setTemplate] = useState('custom')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [signature, setSignature] = useState('founder')
    
    // Results
    const [sendResults, setSendResults] = useState(null)

    // Load cursive font for live signature preview
    useEffect(() => {
        const link = document.createElement('link')
        link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        return () => {
            document.head.removeChild(link)
        }
    }, [])

    useEffect(() => {
        if (!authLoading && admin) {
            fetchStudents()
        }
    }, [authLoading, admin, courseFilter, statusFilter])

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
                signature,
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

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Email Students</h1>
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
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex flex-col gap-4">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <select
                                    value={courseFilter}
                                    onChange={(e) => setCourseFilter(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="all">All Students</option>
                                        <option value="enrolled">Enrolled</option>
                                        <option value="completed">Completed</option>
                                        <option value="in-progress">In Progress</option>
                                    </select>
                                )}
                            </div>
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
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                                <span className="font-medium text-gray-700 text-sm">
                                    {selectedStudents.length} selected ({filteredStudents.length})
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
                                {filteredStudents.map((student, index) => (
                                    <div
                                        key={student.id || `${student.email}-${index}`}
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
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate text-sm">
                                                {student.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
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

                {/* Middle Panel - Compose Email */}
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
                                        type="button"
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
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary resize-none outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Supports **bold** and *italic* formatting
                            </p>
                        </div>

                        {/* Signature Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Signature
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'founder', name: 'MSF Sajeefa', icon: '✍️' },
                                    { id: 'admin', name: 'LMS Admin', icon: '🏢' },
                                    { id: 'none', name: 'None', icon: '❌' }
                                ].map((sig) => (
                                    <button
                                        key={sig.id}
                                        type="button"
                                        onClick={() => setSignature(sig.id)}
                                        className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                                            signature === sig.id
                                                ? 'border-primary bg-primary/5 text-primary font-semibold'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-sm">{sig.icon}</span>
                                        <span className="truncate text-[10px]">{sig.name}</span>
                                    </button>
                                ))}
                            </div>
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

                {/* Right Panel - Live Preview */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border p-4 space-y-4">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2 border-b pb-3">
                            <Mail className="w-5 h-5 text-primary" />
                            Live Email Preview
                        </h3>
                        <div className="border rounded-2xl overflow-hidden bg-slate-50/50 p-3 max-h-[550px] overflow-y-auto">
                            <div className="max-w-[340px] mx-auto bg-white rounded-2xl shadow-md border border-slate-150 overflow-hidden text-left">
                                {/* Header */}
                                <div className={`p-4 text-center text-white ${
                                    template === 'announcement' ? 'bg-gradient-to-r from-emerald-600 to-teal-500' :
                                    template === 'reminder' ? 'bg-gradient-to-r from-amber-600 to-orange-500' :
                                    template === 'congratulations' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' :
                                    'bg-gradient-to-r from-indigo-600 to-violet-500'
                                }`}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-85 mb-1">Gemini LMS</div>
                                    <div className="text-xl mb-1">
                                        {template === 'announcement' ? '📢' :
                                         template === 'reminder' ? '⏰' :
                                         template === 'congratulations' ? '🎉' :
                                         '📧'}
                                    </div>
                                    <h4 className="font-bold text-sm line-clamp-2">
                                        {subject || 'No Subject'}
                                    </h4>
                                </div>

                                {/* Body */}
                                <div className="p-4 text-slate-700 text-xs space-y-3">
                                    <div className="whitespace-pre-line leading-relaxed min-h-[60px]">
                                        {message ? (
                                            message
                                                .split('\n')
                                                .map((line, idx) => {
                                                    let rendered = line;
                                                    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                                    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
                                                    return (
                                                        <p key={idx} dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }} className="mb-1.5" />
                                                    );
                                                })
                                        ) : (
                                            <span className="text-slate-400 italic">No message written yet...</span>
                                        )}
                                    </div>

                                    {/* Signature */}
                                    {signature === 'founder' && (
                                        <div className="pt-3 border-t border-slate-100 font-sans">
                                            <p className="text-[10px] text-slate-400 italic mb-1">With warm regards,</p>
                                            <div className="text-xl text-primary font-medium mb-1" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}>
                                                M. S. F. Sajeefa
                                            </div>
                                            <p className="font-bold text-slate-800 text-[11px] m-0">M.S.F. Sajeefa</p>
                                            <p className="text-primary text-[9px] font-semibold uppercase tracking-wider m-0">Founder, Gemini LMS</p>
                                            <p className="text-[8px] text-slate-400 m-0">Transforming Education through AI Personalization</p>
                                        </div>
                                    )}

                                    {signature === 'admin' && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <p className="text-[10px] text-slate-400 italic mb-1">Best regards,</p>
                                            <p className="font-bold text-slate-800 text-[11px] m-0">Gemini LMS Administration</p>
                                            <p className="text-slate-400 text-[9px] m-0">Academic & Teammate Operations</p>
                                        </div>
                                    )}

                                    {/* Button */}
                                    <div className="text-center pt-3">
                                        <span className={`inline-block text-white text-[9px] font-bold px-4 py-2 rounded-lg shadow-sm ${
                                            template === 'announcement' ? 'bg-emerald-600' :
                                            template === 'reminder' ? 'bg-amber-600' :
                                            template === 'congratulations' ? 'bg-violet-600' :
                                            'bg-primary'
                                        }`}>
                                            Go to Dashboard
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-slate-50/50 p-3 border-t border-slate-100 text-center text-[9px] text-slate-400 space-y-1">
                                    <p>© {new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
                                    <p className="text-primary font-medium">Visit Website | Support</p>
                                </div>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
        </div>
    )
}

export default EmailStudentsPage
