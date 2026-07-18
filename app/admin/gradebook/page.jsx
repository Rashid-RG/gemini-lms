"use client"
import React, { useState, useEffect } from 'react'
import { Users, BookOpen, TrendingUp, Award, Search, ChevronRight, AlertTriangle, CheckCircle, Clock, BarChart3, Download, RefreshCw, GraduationCap, Sparkles, X, PanelRightOpen } from 'lucide-react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { arrayToCSV, downloadCSV, getExportFilename } from '@/lib/csvExport'
import { Button } from '@/components/ui/button'
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'
import { toast } from 'sonner'

const GRADEBOOK_REFRESH_MS = 20000

const GRADE_COLORS = {
  'A+': '#22c55e', 'A': '#16a34a', 'A-': '#4ade80',
  'B+': '#3b82f6', 'B': '#2563eb', 'B-': '#60a5fa',
  'C+': '#eab308', 'C': '#ca8a04', 'C-': '#facc15',
  'D': '#f97316', 'F': '#ef4444'
}

const RISK_CONFIG = {
  low: { label: 'Low Risk', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  medium: { label: 'Medium Risk', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  high: { label: 'High Risk', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle }
}

const PLATFORM_STAT_STYLES = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-300',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconText: 'text-green-600 dark:text-green-300',
  },
  yellow: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconText: 'text-yellow-600 dark:text-yellow-300',
  },
}

const COURSE_STAT_STYLES = {
  blue: {
    card: 'bg-blue-50 dark:bg-blue-900/20',
    value: 'text-blue-600 dark:text-blue-300',
    sub: 'text-blue-500 dark:text-blue-300',
  },
  purple: {
    card: 'bg-purple-50 dark:bg-purple-900/20',
    value: 'text-purple-600 dark:text-purple-300',
    sub: 'text-purple-500 dark:text-purple-300',
  },
  green: {
    card: 'bg-green-50 dark:bg-green-900/20',
    value: 'text-green-600 dark:text-green-300',
    sub: 'text-green-500 dark:text-green-300',
  },
  emerald: {
    card: 'bg-emerald-50 dark:bg-emerald-900/20',
    value: 'text-emerald-600 dark:text-emerald-300',
    sub: 'text-emerald-500 dark:text-emerald-300',
  },
}

const cardClassName = 'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'

function PlatformStatCard({ label, value, icon: Icon, color }) {
  const palette = PLATFORM_STAT_STYLES[color]

  return (
    <div className={cardClassName}>
      <div className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${palette.iconBg}`}>
          <Icon className={`h-5 w-5 ${palette.iconText}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function CourseStatCard({ label, value, sub, color }) {
  const palette = COURSE_STAT_STYLES[color]

  return (
    <div className={`rounded-lg p-3 text-center ${palette.card}`}>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${palette.value}`}>{value}</p>
      {sub ? <p className={`text-xs font-medium ${palette.sub}`}>{sub}</p> : null}
    </div>
  )
}

function getGradeLabel(score) {
  if (score >= 85) return 'A+'
  if (score >= 75) return 'A'
  if (score >= 70) return 'A-'
  if (score >= 65) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 55) return 'B-'
  if (score >= 50) return 'C+'
  if (score >= 46) return 'C'
  if (score >= 40) return 'C-'
  if (score >= 35) return 'D'
  return 'F'
}

function getGradeColor(score) {
  if (score >= 85) return 'text-green-600 bg-green-100'
  if (score >= 70) return 'text-blue-600 bg-blue-100'
  if (score >= 50) return 'text-yellow-600 bg-yellow-100'
  if (score >= 35) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

export default function AdminGradeBookPage() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courseGrades, setCourseGrades] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courseLoading, setCourseLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterRisk, setFilterRisk] = useState('all')
  const [studentSearch, setStudentSearch] = useState('')
  const [activeStudentEmail, setActiveStudentEmail] = useState(null)
  const [platformStats, setPlatformStats] = useState(null)
  const [studentComments, setStudentComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentPrivacy, setCommentPrivacy] = useState({})
  const [commentSaving, setCommentSaving] = useState({})
  const [commentErrors, setCommentErrors] = useState({})
  const [commentGenerating, setCommentGenerating] = useState({})
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAllCourses(false)
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllCourses(true)
        if (selectedCourse?.courseId) {
          fetchCourseGrades(selectedCourse.courseId, true)
        }
      }
    }, GRADEBOOK_REFRESH_MS)

    return () => clearInterval(intervalId)
  }, [selectedCourse?.courseId])

  const fetchAllCourses = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      // Fetch all courses via admin API (uses admin session cookie)
      const res = await axios.get('/api/admin/courses?limit=200', { timeout: 30000 })
      const allCourses = res.data?.courses || res.data?.result || []
      setCourses(allCourses)

      if (selectedCourse?.courseId) {
        const refreshedSelectedCourse = allCourses.find((course) => course.courseId === selectedCourse.courseId)
        if (refreshedSelectedCourse) {
          setSelectedCourse(refreshedSelectedCourse)
        }
      }

      // Compute platform-wide stats from courses
      setPlatformStats({
        totalCourses: res.data?.totalCount || allCourses.length,
        totalStudents: res.data?.platformStats?.totalStudents ?? allCourses.reduce((sum, c) => sum + (c.totalStudents || 0), 0),
        activeGradebookStudents: res.data?.platformStats?.activeGradebookStudents ?? 0,
        avgRating: allCourses.length
          ? (allCourses.reduce((sum, c) => sum + (parseFloat(c.averageRating) || 0), 0) / allCourses.length).toFixed(1)
          : 0,
      })
    } catch (err) {
      console.error('Failed to load courses:', err)
      if (!silent) {
        setCourses([])
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const fetchCourseGrades = async (courseId, silent = false) => {
    try {
      if (!silent) {
        setCourseLoading(true)
      }
      // Use admin-specific endpoint (no Clerk auth needed)
      const res = await axios.get(`/api/admin/gradebook?courseId=${courseId}`, { timeout: 30000 })
      setCourseGrades(res.data)
    } catch (err) {
      console.error('Failed to load grades:', err)
      if (!silent) {
        setCourseGrades(null)
      }
    } finally {
      if (!silent) {
        setCourseLoading(false)
      }
    }
  }

  const handleSelectCourse = (course) => {
    setSelectedCourse(course)
    setActiveStudentEmail(null)
    setStudentComments({})
    setCommentDrafts({})
    setCommentPrivacy({})
    setCommentSaving({})
    setCommentErrors({})
    setCommentGenerating({})
    fetchCourseGrades(course.courseId, false)
  }

  const loadStudentComments = async (studentEmail) => {
    if (!selectedCourse?.courseId || !studentEmail) return

    try {
      const res = await axios.get(`/api/grades/comments?courseId=${selectedCourse.courseId}&studentEmail=${encodeURIComponent(studentEmail)}`, {
        timeout: 30000,
      })
      setStudentComments((current) => ({
        ...current,
        [studentEmail]: res.data?.result || [],
      }))
    } catch (err) {
      console.error('Failed to load student comments:', err)
      setCommentErrors((current) => ({
        ...current,
        [studentEmail]: err.response?.data?.error || 'Failed to load feedback comments',
      }))
    }
  }

  const handleOpenStudentPanel = async (studentEmail) => {
    setActiveStudentEmail(studentEmail)

    if (studentEmail && !studentComments[studentEmail]) {
      await loadStudentComments(studentEmail)
    }
  }

  const handleCloseStudentPanel = () => {
    setActiveStudentEmail(null)
  }

  const handleRevokeCertificate = async (certificateId, studentEmail) => {
    if (!certificateId) return;
    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke the certificate (ID: ${certificateId}) for student ${studentEmail}?\n\nThis will delete the certificate record and reset the student's status to In Progress.`
    );
    if (!confirmRevoke) return;

    try {
      setActionLoading(true);
      const res = await axios.delete(`/api/admin/certificates?certificateId=${certificateId}`);
      if (res.data.success) {
        toast.success(`Certificate ${certificateId} revoked successfully`);
        // Refresh gradebook data
        if (selectedCourse?.courseId) {
          await fetchCourseGrades(selectedCourse.courseId, true);
        }
      }
    } catch (err) {
      console.error('Failed to revoke certificate:', err);
      toast.error(err.response?.data?.error || 'Failed to revoke certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueCertificate = async (student) => {
    if (!selectedCourse?.courseId || !student?.studentEmail) return;

    let isForced = false;
    if (!student.isEligibleForCertificate) {
      const confirmForce = window.confirm(
        `Warning: Student ${student.studentName || student.studentEmail} has not met the default passing criteria for this course.\n\nForce-issuing a certificate will bypass these criteria. Do you want to proceed?`
      );
      if (!confirmForce) return;
      isForced = true;
    } else {
      const confirmIssue = window.confirm(
        `Are you sure you want to issue a completion certificate for ${student.studentName || student.studentEmail}?`
      );
      if (!confirmIssue) return;
    }

    try {
      setActionLoading(true);
      const res = await axios.post('/api/admin/certificates', {
        courseId: selectedCourse.courseId,
        studentEmail: student.studentEmail,
        studentName: student.studentName,
        force: isForced
      });
      if (res.data.success) {
        toast.success(`Certificate issued successfully! ID: ${res.data.certificate?.certificateId}`);
        // Refresh gradebook data
        if (selectedCourse?.courseId) {
          await fetchCourseGrades(selectedCourse.courseId, true);
        }
      }
    } catch (err) {
      console.error('Failed to issue certificate:', err);
      toast.error(err.response?.data?.error || 'Failed to issue certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitComment = async (student) => {
    if (!selectedCourse?.courseId || !student?.studentEmail) return

    const studentEmail = student.studentEmail
    const comment = (commentDrafts[studentEmail] || '').trim()
    if (!comment) {
      setCommentErrors((current) => ({
        ...current,
        [studentEmail]: 'Enter a feedback comment before sending.',
      }))
      return
    }

    try {
      setCommentSaving((current) => ({ ...current, [studentEmail]: true }))
      setCommentErrors((current) => ({ ...current, [studentEmail]: '' }))

      await axios.post('/api/grades/comments', {
        courseId: selectedCourse.courseId,
        studentEmail,
        assessmentType: 'overall',
        assessmentId: selectedCourse.courseId,
        comment,
        isPrivate: Boolean(commentPrivacy[studentEmail]),
      }, { timeout: 30000 })

      setCommentDrafts((current) => ({ ...current, [studentEmail]: '' }))
      setCommentPrivacy((current) => ({ ...current, [studentEmail]: false }))
      await loadStudentComments(studentEmail)
    } catch (err) {
      console.error('Failed to save comment:', err)
      setCommentErrors((current) => ({
        ...current,
        [studentEmail]: err.response?.data?.error || 'Failed to save feedback comment',
      }))
    } finally {
      setCommentSaving((current) => ({ ...current, [studentEmail]: false }))
    }
  }

  const handleGenerateAiComment = async (student) => {
    if (!selectedCourse?.topic || !student?.studentEmail) return

    const score = student.finalGrade || 0
    const riskLevel = score >= 75 ? 'low' : score >= 60 ? 'medium' : score >= 35 ? 'high' : 'critical'

    try {
      setCommentGenerating((current) => ({ ...current, [student.studentEmail]: true }))
      setCommentErrors((current) => ({ ...current, [student.studentEmail]: '' }))

      const res = await axios.post('/api/admin/gradebook/ai-feedback', {
        courseName: selectedCourse.topic,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        progressPercentage: student.progressPercentage,
        quizAverage: student.quizAverage,
        assignmentAverage: student.assignmentAverage,
        finalGrade: student.finalGrade,
        riskLevel,
        status: student.status,
        feedbackCount: (studentComments[student.studentEmail] || []).length,
      }, { timeout: 45000 })

      const generatedText = res.data?.result?.composedFeedback || ''
      setCommentDrafts((current) => ({
        ...current,
        [student.studentEmail]: generatedText,
      }))
    } catch (err) {
      console.error('Failed to generate AI feedback:', err)
      setCommentErrors((current) => ({
        ...current,
        [student.studentEmail]: err.response?.data?.error || 'Failed to generate AI feedback',
      }))
    } finally {
      setCommentGenerating((current) => ({ ...current, [student.studentEmail]: false }))
    }
  }

  const handleExportCSV = async () => {
    if (!selectedCourse) return
    try {
      if (!courseGrades?.students?.length) return

      const getRiskLevel = (score) => {
        if (score >= 75) return 'Low Risk'
        if (score >= 60) return 'Medium Risk'
        if (score >= 35) return 'High Risk'
        return 'Critical'
      }

      const getRecommendation = (student) => {
        if ((student.finalGrade || 0) < 35) return 'Immediate support and intervention required'
        if ((student.finalGrade || 0) < 60) return 'Follow up with tutor and remedial work'
        if ((student.progressPercentage || 0) < 50) return 'Encourage progress completion and check engagement'
        if ((student.finalGrade || 0) >= 85) return 'Top performer; suitable for advanced work'
        return 'Stable performance; continue monitoring'
      }

      const reportRows = courseGrades.students.map((student, index) => ({
        rank: index + 1,
        studentId: student.studentId || '',
        studentName: student.studentName || '',
        studentEmail: student.studentEmail,
        address: student.address || 'Not available',
        phone: student.phone || 'Not available',
        isMember: student.isMember ? 'Yes' : 'No',
        status: student.status || 'In Progress',
        joinedAt: student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : '',
        enrolledAt: student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : '',
        progressPercentage: student.progressPercentage || 0,
        quizAverage: Math.round(student.quizAverage || 0),
        quizCount: student.quizCount || 0,
        assignmentAverage: Math.round(student.assignmentAverage || 0),
        assignmentCount: student.assignmentCount || 0,
        assignmentSubmitted: student.assignmentSubmitted || 0,
        finalGrade: student.finalGrade || 0,
        gradeLetter: getGradeLabel(student.finalGrade || 0),
        riskLevel: getRiskLevel(student.finalGrade || 0),
        totalTimeSpent: student.totalTimeSpent || 0,
        certificateIssued: student.certificateIssued ? 'Yes' : 'No',
        startedAt: student.startedAt ? new Date(student.startedAt).toLocaleDateString() : '',
        completedAt: student.completedAt ? new Date(student.completedAt).toLocaleDateString() : '',
        lastActivityAt: student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString() : '',
        recommendation: getRecommendation(student),
      }))

      const csv = arrayToCSV(reportRows, [
        { key: 'rank', header: 'Rank' },
        { key: 'studentId', header: 'Student ID' },
        { key: 'studentName', header: 'Student Name' },
        { key: 'studentEmail', header: 'Student Email' },
        { key: 'address', header: 'Address' },
        { key: 'phone', header: 'Phone' },
        { key: 'isMember', header: 'Premium Member' },
        { key: 'status', header: 'Status' },
        { key: 'joinedAt', header: 'Joined Platform' },
        { key: 'enrolledAt', header: 'Enrolled In Course' },
        { key: 'progressPercentage', header: 'Progress %' },
        { key: 'quizAverage', header: 'Quiz Average %' },
        { key: 'quizCount', header: 'Quiz Count' },
        { key: 'assignmentAverage', header: 'Assignment Average %' },
        { key: 'assignmentCount', header: 'Assignment Count' },
        { key: 'assignmentSubmitted', header: 'Assignments Submitted' },
        { key: 'finalGrade', header: 'Final Grade %' },
        { key: 'gradeLetter', header: 'Grade Letter' },
        { key: 'riskLevel', header: 'Risk Level' },
        { key: 'totalTimeSpent', header: 'Total Time Spent (min)' },
        { key: 'certificateIssued', header: 'Certificate Issued' },
        { key: 'startedAt', header: 'Started At' },
        { key: 'completedAt', header: 'Completed At' },
        { key: 'lastActivityAt', header: 'Last Activity' },
        { key: 'recommendation', header: 'Admin Recommendation' },
      ])

      const courseHeader = [
        `Course,${selectedCourse.topic}`,
        `Course ID,${selectedCourse.courseId}`,
        `Created By,${selectedCourse.createdBy}`,
        `Total Students,${courseGrades.statistics?.totalStudents || 0}`,
        `Class Average,${courseGrades.statistics?.classAverage || 0}%`,
        `Highest Grade,${courseGrades.statistics?.highestGrade || 0}%`,
        `Completed Students,${courseGrades.statistics?.completedStudents || 0}`,
        `Export Date,${new Date().toISOString()}`,
        ''
      ].join('\n')

      downloadCSV(`${courseHeader}\n${csv}`, getExportFilename(`gradebook_${selectedCourse.topic.replace(/\s+/g, '_').toLowerCase()}`))
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handlePrintReport = () => {
    if (!selectedCourse || !courseGrades?.students?.length) return

    const getRiskLevel = (score) => {
      if (score >= 75) return 'Low Risk'
      if (score >= 60) return 'Medium Risk'
      if (score >= 35) return 'High Risk'
      return 'Critical'
    }

    const reportWindow = window.open('', '_blank', 'width=1280,height=900')
    if (!reportWindow) return

    const rowsHtml = courseGrades.students.map((student, index) => {
      const score = student.finalGrade || 0
      const grade = getGradeLabel(score)
      const risk = getRiskLevel(score)
      const recommendation = score < 35
        ? 'Immediate intervention required.'
        : score < 60
          ? 'Needs close academic follow-up.'
          : score >= 85
            ? 'Excellent performer; keep challenged.'
            : 'Progress is acceptable; continue monitoring.'

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="student-name">${student.studentName || 'Student'}</div>
            <div class="muted">ID: ${student.studentId || 'N/A'}</div>
          </td>
          <td>
            <div>${student.studentEmail || 'N/A'}</div>
            <div class="muted">Address: ${student.address || 'Not available'}</div>
          </td>
          <td>
            <div>Joined: ${student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : 'N/A'}</div>
            <div class="muted">Enrolled: ${student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : 'N/A'}</div>
          </td>
          <td>${student.progressPercentage || 0}%</td>
          <td>${Math.round(student.quizAverage || 0)}%</td>
          <td>${Math.round(student.assignmentAverage || 0)}%</td>
          <td>
            <span class="grade-chip">${grade} (${score}%)</span>
          </td>
          <td>
            <div>${risk}</div>
            <div class="muted">${recommendation}</div>
          </td>
        </tr>
      `
    }).join('')

    reportWindow.document.write(`
      <html>
        <head>
          <title>${selectedCourse.topic} Student Performance Report</title>
          <style>
            body { font-family: 'Georgia', 'Segoe UI', serif; margin: 0; background: #f6f3ee; color: #1f2937; }
            .page { padding: 36px; }
            .hero {
              background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #14b8a6 100%);
              color: white; border-radius: 24px; padding: 28px 32px; margin-bottom: 24px;
              box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
            }
            .hero h1 { margin: 0 0 8px; font-size: 32px; }
            .hero p { margin: 4px 0; opacity: 0.92; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .stat-card { background: white; border-radius: 18px; padding: 18px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e5e7eb; }
            .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .stat-value { font-size: 28px; font-weight: 700; margin-top: 8px; color: #0f172a; }
            .section { background: white; border-radius: 22px; padding: 24px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e5e7eb; }
            .section h2 { margin: 0 0 8px; font-size: 22px; color: #0f172a; }
            .section p { margin: 0 0 18px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; background: #eff6ff; color: #1d4ed8; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
            td { padding: 12px; border-top: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) td { background: #fafaf9; }
            .student-name { font-weight: 700; color: #111827; }
            .muted { color: #6b7280; font-size: 12px; margin-top: 4px; }
            .grade-chip { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-weight: 700; }
            .footer { margin-top: 18px; color: #6b7280; font-size: 12px; }
            @media print {
              body { background: white; }
              .page { padding: 16px; }
              .hero, .stat-card, .section { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="hero">
              <h1>Student Performance Report</h1>
              <p><strong>Course:</strong> ${selectedCourse.topic}</p>
              <p><strong>Instructor:</strong> ${selectedCourse.createdBy}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="stats">
              <div class="stat-card"><div class="stat-label">Students</div><div class="stat-value">${courseGrades.statistics?.totalStudents || 0}</div></div>
              <div class="stat-card"><div class="stat-label">Class Average</div><div class="stat-value">${courseGrades.statistics?.classAverage || 0}%</div></div>
              <div class="stat-card"><div class="stat-label">Highest Grade</div><div class="stat-value">${courseGrades.statistics?.highestGrade || 0}%</div></div>
              <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${courseGrades.statistics?.completedStudents || 0}</div></div>
            </div>
            <div class="section">
              <h2>Full Student Details</h2>
              <p>This report includes every stored student detail currently available in the platform. Fields like address and phone are shown as not available because the current database does not store them yet.</p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Contact Details</th>
                    <th>Platform Details</th>
                    <th>Progress</th>
                    <th>Quiz</th>
                    <th>Assignment</th>
                    <th>Grade</th>
                    <th>Performance Note</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
              <div class="footer">Generated from Admin GradeBook. Use the browser print dialog to save as PDF.</div>
            </div>
          </div>
        </body>
      </html>
    `)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }

  const handlePrintStudentReport = async (student) => {
    if (!selectedCourse || !student) return

    let exportHost = null

    const score = student.finalGrade || 0
    const grade = getGradeLabel(score)
    const risk = score >= 75 ? 'Low Risk' : score >= 60 ? 'Medium Risk' : score >= 35 ? 'High Risk' : 'Critical'
    const feedback = studentComments[student.studentEmail] || []
    const feedbackHtml = feedback.length
      ? feedback.map((entry) => `
          <div class="feedback-item">
            <div class="feedback-header">
              <span>${entry.assessmentType || 'overall'}</span>
              <span>${entry.isPrivate ? 'Private' : 'Public'} • ${entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown date'}</span>
            </div>
            <p>${entry.comment}</p>
          </div>
        `).join('')
      : '<p class="muted">No feedback comments yet.</p>'


    try {
      const html2pdf = (await import('html2pdf.js')).default
      const reportMarkup = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #ffffff; width: 820px; padding: 28px;">
          <div style="background: linear-gradient(135deg, #111827 0%, #7c3aed 55%, #22c55e 100%); color: white; border-radius: 24px; padding: 28px;">
            <h1 style="margin: 0 0 8px; font-size: 30px;">Individual Student Grade Report</h1>
            <p style="margin: 4px 0;"><strong>Course:</strong> ${selectedCourse.topic}</p>
            <p style="margin: 4px 0;"><strong>Student:</strong> ${student.studentName || 'Student'} (${student.studentEmail})</p>
            <p style="margin: 4px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 22px;">
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e5e7eb;"><div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Final Grade</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${score}%</div><div>${grade}</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e5e7eb;"><div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Progress</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${student.progressPercentage || 0}%</div><div>Status: ${student.status || 'In Progress'}</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e5e7eb;"><div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Risk Level</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${risk}</div><div>Monitoring summary</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e5e7eb;"><div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Feedback</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${feedback.length}</div><div>Reviewer comments</div></div>
          </div>
          <div style="margin-top: 22px; background: white; border-radius: 22px; padding: 22px; border: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">Student Details</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px;">
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Name:</strong> ${student.studentName || 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Student ID:</strong> ${student.studentId || 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Email:</strong> ${student.studentEmail || 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Phone:</strong> ${student.phone || 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Address:</strong> ${student.address || 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Member:</strong> ${student.isMember ? 'Yes' : 'No'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Started:</strong> ${student.startedAt ? new Date(student.startedAt).toLocaleDateString() : 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Last Active:</strong> ${student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString() : 'Never'}</div>
            </div>
          </div>
          <div style="margin-top: 22px; background: white; border-radius: 22px; padding: 22px; border: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">Assessment Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px;">
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Quiz Average:</strong> ${Math.round(student.quizAverage || 0)}% (${student.quizCount || 0} taken)</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Assignment Average:</strong> ${Math.round(student.assignmentAverage || 0)}% (${student.assignmentSubmitted || 0}/${student.assignmentCount || 0} submitted)</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e5e7eb;"><strong>Certificate:</strong> ${student.certificateIssued ? 'Issued' : 'Not issued'}</div>
            </div>
          </div>
          <div style="margin-top: 22px; background: white; border-radius: 22px; padding: 22px; border: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">Staff Feedback</h2>
            ${feedbackHtml}
            <div style="margin-top: 18px; font-size: 12px; color: #6b7280;">Available to admin, tutor, and authorized reviewers only.</div>
          </div>
        </div>
      `

      exportHost = document.createElement('div')
      exportHost.setAttribute('aria-hidden', 'true')
      exportHost.style.position = 'fixed'
      exportHost.style.left = '0'
      exportHost.style.top = '0'
      exportHost.style.width = '820px'
      exportHost.style.padding = '24px'
      exportHost.style.background = '#ffffff'
      exportHost.style.zIndex = '-1'
      exportHost.style.pointerEvents = 'none'
      exportHost.innerHTML = reportMarkup
      document.body.appendChild(exportHost)

      await html2pdf()
        .set({
          margin: 0.35,
          filename: `${selectedCourse.topic.replace(/\s+/g, '_').toLowerCase()}_${student.studentEmail.split('@')[0]}_student_report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(exportHost.firstElementChild)
        .save()

      toast.success('Student report downloaded')
    } catch (error) {
      console.error('Student report export failed:', error)
      toast.error('Failed to download student report')
    } finally {
      if (exportHost?.parentNode) {
        exportHost.parentNode.removeChild(exportHost)
      }
    }
  }

  // Filter + sort courses
  const filteredCourses = courses
    .filter(c => c.topic?.toLowerCase().includes(searchQuery.toLowerCase()) || c.createdBy?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.topic?.localeCompare(b.topic)
      if (sortBy === 'students') return (b.totalStudents || 0) - (a.totalStudents || 0)
      if (sortBy === 'rating') return (parseFloat(b.averageRating) || 0) - (parseFloat(a.averageRating) || 0)
      return 0
    })

  // Filter students by risk
  const filteredStudents = courseGrades?.students?.filter(s => {
    if (filterRisk === 'all') return true
    const score = s.finalGrade || 0
    const risk = score >= 75 ? 'low' : score >= 60 ? 'medium' : score >= 35 ? 'high' : 'critical'
    return risk === filterRisk
  }).filter((student) => {
    if (!studentSearch.trim()) return true
    return student.studentEmail?.toLowerCase().includes(studentSearch.toLowerCase())
  }) || []

  // Chart data
  const gradeDistData = courseGrades?.students
    ? ['A+','A','A-','B+','B','B-','C+','C','C-','D','F'].map(g => ({
        grade: g,
        count: courseGrades.students.filter(s => getGradeLabel(s.finalGrade || 0) === g).length
      })).filter(d => d.count > 0)
    : []

  const riskData = courseGrades?.students
    ? [
        { name: 'Low Risk (≥75)', value: courseGrades.students.filter(s => (s.finalGrade || 0) >= 75).length, color: '#22c55e' },
        { name: 'Medium (60-74)', value: courseGrades.students.filter(s => (s.finalGrade || 0) >= 60 && (s.finalGrade || 0) < 75).length, color: '#eab308' },
        { name: 'High (35-59)', value: courseGrades.students.filter(s => (s.finalGrade || 0) >= 35 && (s.finalGrade || 0) < 60).length, color: '#f97316' },
        { name: 'Critical (<35)', value: courseGrades.students.filter(s => (s.finalGrade || 0) < 35).length, color: '#ef4444' },
      ].filter(d => d.value > 0)
    : []

  const activeStudent = filteredStudents.find((student) => student.studentEmail === activeStudentEmail) || null
  const activeStudentScore = activeStudent?.finalGrade || 0
  const activeStudentRisk = activeStudent
    ? activeStudentScore >= 75 ? 'low' : activeStudentScore >= 60 ? 'medium' : activeStudentScore >= 35 ? 'high' : 'critical'
    : null
  const activeStudentRiskConfig = activeStudentRisk ? RISK_CONFIG[activeStudentRisk] : null

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 dark:bg-gray-900 sm:px-4 lg:px-5 xl:px-6">
      <AdminPageShell size="full" className="space-y-6">
        <AdminPageHeader
          title="Admin GradeBook"
          description="Platform-wide grade management and analytics"
          icon={GraduationCap}
          actions={
            <>
              <Button variant="outline" onClick={() => {
                fetchAllCourses(false)
                if (selectedCourse?.courseId) {
                  fetchCourseGrades(selectedCourse.courseId, false)
                }
              }}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              {selectedCourse && (
                <>
                  <Button variant="outline" onClick={handlePrintReport}>
                    <Download className="h-4 w-4" />
                    Print Report
                  </Button>
                  <Button onClick={handleExportCSV}>
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </>
              )}
            </>
          }
        />
        <p className="-mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Live updates every 20 seconds</p>

        {/* Platform Summary Cards */}
        {platformStats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: 'Total Courses', value: platformStats.totalCourses, icon: BookOpen, color: 'blue' },
                { label: 'Total Students', value: platformStats.totalStudents, icon: Users, color: 'green' },
                { label: 'Avg Rating', value: `${platformStats.avgRating} ⭐`, icon: Award, color: 'yellow' },
              ].map((stat) => (
                <PlatformStatCard key={stat.label} {...stat} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active in GradeBook: {platformStats.activeGradebookStudents || 0}</p>
          </>
        )}

        <div className={`grid grid-cols-1 gap-6 ${activeStudent ? 'xl:grid-cols-[300px_minmax(0,1fr)_360px] 2xl:grid-cols-[340px_minmax(0,1fr)_420px]' : 'xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]'}`}>
          {/* Course List - Left Panel */}
          <div>
            <AdminSurface>
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h2 className="mb-3 font-semibold text-gray-800 dark:text-white">All Courses</h2>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="name">Sort by Name</option>
                  <option value="students">Sort by Students</option>
                  <option value="rating">Sort by Rating</option>
                </select>
              </div>
              <div className="max-h-[680px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No courses found</p>
                ) : (
                  filteredCourses.map(course => (
                    <button
                      key={course.courseId}
                      onClick={() => handleSelectCourse(course)}
                      className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-purple-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                        selectedCourse?.courseId === course.courseId ? 'border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{course.topic}</p>
                          <p className="truncate text-xs text-gray-400">{course.createdBy}</p>
                        </div>
                        <div className="ml-2 flex flex-col items-end">
                          <span className="text-xs text-gray-500">{course.totalStudents || 0} students</span>
                          <span className={`mt-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                            course.status === 'Ready' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>{course.status}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </AdminSurface>
          </div>

          {/* Grade Details - Right Panel */}
          <div className="min-w-0">
          {!selectedCourse ? (
            <AdminSurface className="flex h-64 items-center justify-center">
              <div className="text-center text-gray-400">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Select a course to view grades</p>
                <p className="text-sm mt-1">Click any course from the list</p>
              </div>
            </AdminSurface>
          ) : courseLoading ? (
            <AdminSurface className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
            </AdminSurface>
          ) : courseGrades ? (
            <div className="space-y-6">
              {/* Course Header */}
              <AdminSurface className="p-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCourse.topic}</h2>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Created by {selectedCourse.createdBy}</p>
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Performance Overview</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{(courseGrades.statistics?.classAverage || 0) >= 75 ? 'Strong class performance' : (courseGrades.statistics?.classAverage || 0) >= 60 ? 'Moderate class performance' : 'Needs academic support'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Risk Watch</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{courseGrades.students?.filter((student) => (student.finalGrade || 0) < 60).length || 0} students below 60%</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Completion Health</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{courseGrades.statistics?.completedStudents || 0} completed, {courseGrades.statistics?.inProgressStudents || 0} in progress</p>
                  </div>
                </div>

                {/* Stats Cards */}
                {courseGrades.statistics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Students', value: courseGrades.statistics.totalStudents, color: 'blue' },
                      { label: 'Class Avg', value: `${courseGrades.statistics.classAverage || 0}%`, sub: getGradeLabel(courseGrades.statistics.classAverage || 0), color: 'purple' },
                      { label: 'Highest', value: `${courseGrades.statistics.highestGrade || 0}%`, sub: getGradeLabel(courseGrades.statistics.highestGrade || 0), color: 'green' },
                      { label: 'Completed', value: courseGrades.statistics.completedStudents, color: 'emerald' },
                    ].map(stat => (
                      <CourseStatCard key={stat.label} {...stat} />
                    ))}
                  </div>
                )}
              </AdminSurface>

              {/* Charts Row */}
              {(gradeDistData.length > 0 || riskData.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gradeDistData.length > 0 && (
                    <AdminSurface className="p-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Grade Distribution</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={gradeDistData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[3,3,0,0]}>
                            {gradeDistData.map((entry, i) => (
                              <Cell key={i} fill={GRADE_COLORS[entry.grade] || '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </AdminSurface>
                  )}
                  {riskData.length > 0 && (
                    <AdminSurface className="p-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Student Risk Levels</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                            {riskData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </AdminSurface>
                  )}
                </div>
              )}

              {/* Student Table */}
              <AdminSurface>
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Student Performance Report</h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student..."
                        className="rounded-lg border border-gray-300 bg-white py-1.5 pl-7 pr-2 text-xs text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <select
                      value={filterRisk}
                      onChange={e => setFilterRisk(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">All Students</option>
                      <option value="critical">🔴 Critical (&lt;35)</option>
                      <option value="high">🟠 High Risk (35-59)</option>
                      <option value="medium">🟡 Medium (60-74)</option>
                      <option value="low">🟢 On Track (75+)</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Student</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Progress</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Quiz</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Assignment</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Final Grade</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Risk</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Certificate</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400">No students found</td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, idx) => {
                          const score = student.finalGrade || 0
                          const risk = score >= 75 ? 'low' : score >= 60 ? 'medium' : score >= 35 ? 'high' : 'critical'
                          const riskCfg = RISK_CONFIG[risk]
                          const isExpanded = activeStudentEmail === student.studentEmail

                          return (
                            <React.Fragment key={idx}>
                              <tr className={`border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 ${isExpanded ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-800 dark:text-white text-xs truncate max-w-[160px]">{student.studentName || student.studentEmail}</p>
                                  <p className="text-xs text-gray-500 truncate max-w-[160px]">{student.studentEmail}</p>
                                  <p className="text-xs text-gray-400">ID: {student.studentId || 'N/A'} • {student.status}</p>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{student.progressPercentage || 0}%</span>
                                    <div className="w-14 h-1.5 bg-gray-200 rounded-full mt-1">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${student.progressPercentage || 0}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-300">{student.quizAverage ? `${Math.round(student.quizAverage)}%` : '–'}</td>
                                <td className="px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-300">{student.assignmentAverage ? `${Math.round(student.assignmentAverage)}%` : '–'}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getGradeColor(score)}`}>
                                    {getGradeLabel(score)} ({score}%)
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${riskCfg.color}`}>
                                    {riskCfg.label}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {student.certificateIssued ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 font-medium">
                                      Earned
                                    </span>
                                  ) : student.isEligibleForCertificate ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-medium">
                                      Eligible
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 font-medium">
                                      In Progress
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={activeStudentEmail === student.studentEmail ? 'secondary' : 'outline'}
                                    onClick={() => handleOpenStudentPanel(student.studentEmail)}
                                  >
                                    <PanelRightOpen className="h-4 w-4" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            </React.Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </AdminSurface>
            </div>
          ) : (
            <AdminSurface className="flex h-64 items-center justify-center">
              <p className="text-gray-400">No grade data available for this course</p>
            </AdminSurface>
          )}
        </div>

        {activeStudent ? (
          <AdminSurface className="h-fit xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Student Detail Panel</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Focused review for {activeStudent.studentName || activeStudent.studentEmail}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={handleCloseStudentPanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4 text-xs">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Student Details</p>
                <div className="space-y-1 text-gray-700 dark:text-gray-300">
                  <p>Name: {activeStudent.studentName || 'Not available'}</p>
                  <p>Student ID: {activeStudent.studentId || 'Not available'}</p>
                  <p>Email: {activeStudent.studentEmail || 'Not available'}</p>
                  <p>Address: {activeStudent.address || 'Not available'}</p>
                  <p>Phone: {activeStudent.phone || 'Not available'}</p>
                  <p>Member: {activeStudent.isMember ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Assessment Summary</p>
                <div className="space-y-1 text-gray-700 dark:text-gray-300">
                  <p>Quiz: {activeStudent.quizAverage ? Math.round(activeStudent.quizAverage) : 0}% ({activeStudent.quizCount || 0} taken)</p>
                  <p>Assignment: {activeStudent.assignmentAverage ? Math.round(activeStudent.assignmentAverage) : 0}% ({activeStudent.assignmentCount || 0} submitted)</p>
                  <p>Final Grade: {getGradeLabel(activeStudentScore)} ({activeStudentScore}%)</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Activity</p>
                                <div className="space-y-1 text-gray-700 dark:text-gray-300">
                                  <p>Last Active: {activeStudent.lastActivityAt ? new Date(activeStudent.lastActivityAt).toLocaleDateString() : 'Never'}</p>
                                  <p>Last Accessed: {activeStudent.lastAccessedAt ? new Date(activeStudent.lastAccessedAt).toLocaleDateString() : 'Not available'}</p>
                                  <p>Started: {activeStudent.startedAt ? new Date(activeStudent.startedAt).toLocaleDateString() : '–'}</p>
                                  <p>Joined Platform: {activeStudent.joinedAt ? new Date(activeStudent.joinedAt).toLocaleDateString() : 'Not available'}</p>
                                  <p>Time Spent: {activeStudent.totalTimeSpent || 0} min</p>
                                  <p>Certificate: {activeStudent.certificateIssued ? 'Issued' : 'Not issued'}</p>
                                  {activeStudent.completedAt && <p>Completed: {new Date(activeStudent.completedAt).toLocaleDateString()}</p>}
                                </div>
                              </div>

                              {/* Certificate Management Section */}
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Certificate Control</p>
                                <div className="space-y-3">
                                  <div className="space-y-1 text-gray-700 dark:text-gray-300">
                                    <p className="flex items-center gap-1.5">
                                      Status: 
                                      {activeStudent.certificateIssued ? (
                                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold dark:bg-green-950 dark:text-green-300">Earned</span>
                                      ) : activeStudent.isEligibleForCertificate ? (
                                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300">Eligible</span>
                                      ) : (
                                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold dark:bg-gray-800 dark:text-gray-400">In Progress</span>
                                      )}
                                    </p>
                                    {activeStudent.certificateIssued && activeStudent.certificateId && (
                                      <p className="font-mono text-[10px] text-gray-500">ID: {activeStudent.certificateId}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {activeStudent.certificateIssued ? (
                                      <>
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          className="w-full text-center text-xs flex items-center justify-center gap-1 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
                                          onClick={() => {
                                            if (activeStudent.certificateId) {
                                              window.open(`/verify-certificate/${activeStudent.certificateId}`, '_blank');
                                            }
                                          }}
                                        >
                                          <BookOpen className="h-3.5 w-3.5" />
                                          View Certificate
                                        </Button>
                                        <Button 
                                          type="button" 
                                          variant="destructive" 
                                          size="sm"
                                          disabled={actionLoading}
                                          className="w-full text-center text-xs flex items-center justify-center gap-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                                          onClick={() => handleRevokeCertificate(activeStudent.certificateId, activeStudent.studentEmail)}
                                        >
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          Revoke Certificate
                                        </Button>
                                      </>
                                    ) : (
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        disabled={actionLoading}
                                        className={`w-full text-center text-xs flex items-center justify-center gap-1 ${
                                          activeStudent.isEligibleForCertificate 
                                            ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800' 
                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                        onClick={() => handleIssueCertificate(activeStudent)}
                                      >
                                        <Award className="h-3.5 w-3.5" />
                                        {activeStudent.isEligibleForCertificate ? 'Issue Certificate' : 'Force Issue Certificate'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

              {activeStudentRiskConfig ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="mb-2 font-semibold text-gray-600 dark:text-gray-400">Risk Assessment</p>
                  <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${activeStudentRiskConfig.color}`}>
                    <activeStudentRiskConfig.icon className="h-4 w-4" />
                    <span className="font-medium">{activeStudentRiskConfig.label}</span>
                  </div>
                  {activeStudentRisk === 'critical' ? <p className="mt-2 text-xs text-red-600">Immediate intervention needed</p> : null}
                  {activeStudentRisk === 'high' ? <p className="mt-2 text-xs text-orange-600">Recommend instructor follow-up</p> : null}
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-600 dark:text-gray-400">Staff Feedback</p>
                  <Button variant="outline" size="sm" onClick={() => handlePrintStudentReport(activeStudent)}>
                    Student Report
                  </Button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <textarea
                    value={commentDrafts[activeStudent.studentEmail] || ''}
                    onChange={(e) => setCommentDrafts((current) => ({ ...current, [activeStudent.studentEmail]: e.target.value }))}
                    placeholder="Add feedback for this student. Public comments will appear in the student GradeBook."
                    className="min-h-28 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(commentPrivacy[activeStudent.studentEmail])}
                      onChange={(e) => setCommentPrivacy((current) => ({ ...current, [activeStudent.studentEmail]: e.target.checked }))}
                    />
                    Save as private staff note
                  </label>
                  {commentErrors[activeStudent.studentEmail] ? (
                    <p className="mt-2 text-xs text-red-600">{commentErrors[activeStudent.studentEmail]}</p>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Public comments notify the student. Private notes stay visible only to reviewers.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateAiComment(activeStudent)}
                        disabled={Boolean(commentGenerating[activeStudent.studentEmail])}
                        className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {commentGenerating[activeStudent.studentEmail] ? 'Generating...' : 'AI Feedback'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSubmitComment(activeStudent)}
                        disabled={Boolean(commentSaving[activeStudent.studentEmail])}
                      >
                        {commentSaving[activeStudent.studentEmail] ? 'Saving...' : 'Save Comment'}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(studentComments[activeStudent.studentEmail] || []).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No feedback comments yet.</p>
                  ) : (
                    (studentComments[activeStudent.studentEmail] || []).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-300">{entry.assessmentType}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.isPrivate ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                            {entry.isPrivate ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300">{entry.comment}</p>
                        <p className="mt-2 text-[11px] text-gray-400">{entry.instructorEmail || 'Reviewer'} • {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Unknown date'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AdminSurface>
        ) : null}
      </div>
      </AdminPageShell>
    </div>
  )
}
