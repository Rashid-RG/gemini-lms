
"use client"
import React, { useEffect, useState } from 'react'
import WelcomeBanner from './_components/WelcomeBanner'
import CourseList from './_components/CourseList'
import AdaptiveInsights from '@/components/AdaptiveInsights'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function Dashboard() {
  const { user } = useUser()
  const [courses, setCourses] = useState([])
  const [studentProfile, setStudentProfile] = useState(null)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const [reminderPreview, setReminderPreview] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendSuccess, setSendSuccess] = useState('')
  const [streak, setStreak] = useState({ count: 0, longest: 0, badges: [] })
  const [streakLoading, setStreakLoading] = useState(false)
  const [streakError, setStreakError] = useState('')
  const [profileCompleteness, setProfileCompleteness] = useState({ isComplete: true, missingLabels: [] })
  const studentEmail = user?.primaryEmailAddress?.emailAddress

  useEffect(() => {
    if (!studentEmail) return

    // load reminder preference from localStorage
    const saved = window.localStorage.getItem('reminderEnabled')
    if (saved) {
      setReminderEnabled(saved === 'true')
    }

    const loadCourses = async () => {
      try {
        setLoadingCourses(true)
        setLoadError('')
        const res = await axios.post('/api/courses', { createdBy: studentEmail })
        const list = res?.data?.result || []
        setCourses(list)
        if (list.length > 0) {
          setSelectedCourseId(list[0].courseId || list[0].id || '')
        }
      } catch (err) {
        console.error('Failed to load courses', err)
        setLoadError('Unable to load courses')
      } finally {
        setLoadingCourses(false)
      }
    }

    loadCourses()

    const loadProfileCompleteness = async () => {
      try {
        const res = await axios.get('/api/user/profile')
        setStudentProfile(res?.data?.result || null)
        setProfileCompleteness(res?.data?.completeness || { isComplete: true, missingLabels: [] })
      } catch (err) {
        console.error('Failed to load profile completeness', err)
      }
    }

    loadProfileCompleteness()
  }, [studentEmail])

  useEffect(() => {
    const fetchStreak = async () => {
      if (!studentEmail) return
      try {
        setStreakLoading(true)
        setStreakError('')
        // Fetch global user streak across all courses
        const res = await axios.get(`/api/user-streak?studentEmail=${studentEmail}`)
        const data = res?.data?.result || {}
        const badges = Array.isArray(data.badges) ? data.badges : JSON.parse(data.badges || '[]')
        setStreak({
          count: data.streakCount || 0,
          longest: data.longestStreak || 0,
          badges,
        })
      } catch (err) {
        console.error('Failed to fetch streak', err)
        setStreakError('Unable to load streak data')
      } finally {
        setStreakLoading(false)
      }
    }

    fetchStreak()
  }, [studentEmail])

  const toggleReminder = () => {
    const next = !reminderEnabled
    setReminderEnabled(next)
    window.localStorage.setItem('reminderEnabled', String(next))
  }

  const previewReminder = async () => {
    if (!selectedCourseId || !studentEmail) return
    try {
      setReminderLoading(true)
      setReminderError('')
      setReminderPreview(null)
      const res = await axios.post('/api/progress-reminder', {
        studentEmail,
        courseId: selectedCourseId
      })
      setReminderPreview(res?.data?.result || null)
    } catch (err) {
      console.error('Failed to fetch reminder preview', err)
      setReminderError('Unable to generate reminder preview')
    } finally {
      setReminderLoading(false)
    }
  }

  const sendReminderEmail = async () => {
    if (!selectedCourseId || !studentEmail || !reminderPreview) return
    try {
      setSendingEmail(true)
      setReminderError('')
      setSendSuccess('')
      
      const courseData = courses.find(c => c.courseId === selectedCourseId || c.id === selectedCourseId)
      const courseName = courseData?.topic || courseData?.courseName || 'Your Course'
      
      const res = await axios.post('/api/send-reminder', {
        studentEmail,
        studentName: user?.firstName || 'Student',
        courseId: selectedCourseId,
        courseName
      })
      
      if (res?.data?.result?.success) {
        setSendSuccess(`Email sent to ${studentEmail}`)
        setTimeout(() => setSendSuccess(''), 5000)
      }
    } catch (err) {
      console.error('Failed to send email', err)
      setReminderError(err?.response?.data?.error || 'Failed to send email. Check API key.')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
        {!profileCompleteness.isComplete && (
          <div className="relative overflow-hidden backdrop-blur-md bg-amber-50/70 border border-amber-200/50 shadow-sm rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Complete your student profile
              </p>
              <p className="mt-1 text-slate-600 text-xs leading-relaxed max-w-2xl">
                You need to complete your profile details before enrolling in new courses or appearing in official grade and admin audit reports.
              </p>
              <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-100/40 border border-amber-200/30 px-2.5 py-1 rounded-lg w-fit">
                Missing details: {profileCompleteness.missingLabels.join(', ')}
              </p>
            </div>
            <Link 
              href="/dashboard/profile?focus=student-details" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/10 active:scale-[0.98] transition-all duration-200 self-start sm:self-center"
            >
              Complete Profile
            </Link>
          </div>
        )}

        <WelcomeBanner studentIdentifier={studentProfile?.studentIdentifier} />

        {studentProfile?.studentIdentifier && (
          <div className="relative overflow-hidden backdrop-blur-md bg-gradient-to-br from-indigo-50/80 to-violet-50/80 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Official Student ID</p>
              <p className="mt-1 break-all text-xl font-extrabold text-indigo-950 sm:text-2xl tracking-tight">{studentProfile.studentIdentifier}</p>
              <p className="mt-1 text-xs text-slate-500">Use this ID for academic records, grade lookup, and admin reports.</p>
            </div>
            <Link 
              href="/dashboard/profile" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all duration-200 self-start sm:self-center"
            >
              View Full Profile
            </Link>
          </div>
        )}

        <CourseList/>

        {/* Adaptive Insights section */}
        <div className="mt-10 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-slate-50/40 p-4 rounded-2xl border border-slate-200/30">
            <div>
              <p className="text-base font-bold text-slate-800">Adaptive Insights</p>
              <p className="text-xs text-slate-500 mt-0.5">Track topic mastery levels, weak performance areas, and personalized difficulties.</p>
            </div>
            <div className="w-full lg:w-64">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={loadingCourses || courses.length === 0}>
                <SelectTrigger className="rounded-xl border-slate-200/80 bg-white/80 shadow-sm font-medium text-xs h-10">
                  <SelectValue placeholder={loadingCourses ? 'Loading courses...' : 'Select course'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {courses.map(course => (
                    <SelectItem key={course.id || course.courseId} value={course.courseId || course.id} className="text-xs">
                      {course.topic || course.courseName || 'Untitled course'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadError ? (
            <div className="flex items-center gap-3 p-4 border border-rose-200/50 bg-rose-50/70 rounded-xl text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              {loadError}
            </div>
          ) : selectedCourseId && studentEmail ? (
            <AdaptiveInsights courseId={selectedCourseId} studentEmail={studentEmail} />
          ) : (
            <div className="flex items-center gap-3 p-6 border border-slate-200/50 bg-slate-50/50 rounded-xl text-slate-500 text-xs font-semibold justify-center text-center">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              {courses.length === 0 ? 'No courses enrolled yet. Enroll in a course to see insights.' : 'Select a course above to view insights.'}
            </div>
          )}
        </div>

        {/* Progress Reminders section */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mt-8 space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between relative z-10">
            <div>
              <p className="text-base font-bold text-slate-800">Progress Reminders</p>
              <p className="text-xs text-slate-500 mt-0.5">Automate weekly course summary emails featuring weak topics and next actions.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={reminderEnabled} 
                  onChange={toggleReminder} 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer" 
                />
                Enable weekly notifications
              </label>
              <button 
                disabled={!reminderEnabled || reminderLoading || !selectedCourseId} 
                onClick={previewReminder}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {reminderLoading ? 'Loading Preview...' : 'Preview email'}
              </button>
              <button 
                disabled={!reminderEnabled || sendingEmail || !selectedCourseId || !reminderPreview} 
                onClick={sendReminderEmail}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {sendingEmail ? 'Sending...' : 'Send email'}
              </button>
            </div>
          </div>

          {reminderError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50/70 border border-rose-200/50 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500" /> {reminderError}
            </div>
          )}

          {sendSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/70 border border-emerald-200/50 rounded-xl px-4 py-2.5">
              <span>✓</span> {sendSuccess}
            </div>
          )}

          {reminderPreview && (
            <div className="border border-slate-200/60 rounded-xl p-4 bg-slate-50/40 backdrop-blur-sm text-xs text-slate-600 space-y-3 animate-in fade-in duration-200">
              <div className="font-bold text-slate-800 text-sm border-b border-slate-200/40 pb-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" /> Reminder Preview Content
              </div>
              {reminderPreview.totalTopics === 0 ? (
                <div className="text-slate-400 py-2">No performance data yet. Complete at least one quiz to generate insights for reminders.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg border border-slate-100">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Overall mastery</p>
                    <p className="text-lg font-extrabold text-slate-700 mt-0.5">{reminderPreview.summary?.overallMastery || 0}%</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg border border-slate-100">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Topics Mastered</p>
                    <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{reminderPreview.summary?.topicsMastered || 0}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg border border-slate-100">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Topics Needing Work</p>
                    <p className="text-lg font-extrabold text-rose-600 mt-0.5">{reminderPreview.summary?.topicsNeedingWork || 0}</p>
                  </div>
                  {reminderPreview.nextAction ? (
                    <div className="bg-white/60 p-3 rounded-lg border border-indigo-100 md:col-span-1">
                      <p className="text-indigo-500 text-[10px] uppercase font-bold tracking-wider">Next Action</p>
                      <p className="text-slate-700 text-xs font-bold mt-0.5 truncate">Review: {reminderPreview.nextAction.topicName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{reminderPreview.nextAction.averageScore}% score ({reminderPreview.nextAction.recommendedDifficulty})</p>
                    </div>
                  ) : (
                    <div className="bg-white/60 p-3 rounded-lg border border-slate-100 flex items-center text-slate-400 text-xs font-medium">
                      No next action available.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )
}

export default Dashboard