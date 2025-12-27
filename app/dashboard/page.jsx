
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

function Dashboard() {
  const { user } = useUser()
  const [courses, setCourses] = useState([])
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
    <div>
        <WelcomeBanner/>

        <CourseList/>

        <div className='mt-10 space-y-4'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='text-lg font-semibold text-slate-800'>Adaptive Insights</p>
              <p className='text-sm text-slate-500'>Track mastery, weak topics, and recommended difficulty per course.</p>
            </div>
            <div className='w-64'>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={loadingCourses || courses.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCourses ? 'Loading courses...' : 'Select course'} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id || course.courseId} value={course.courseId || course.id}>
                      {course.topic || course.courseName || 'Untitled course'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadError ? (
            <div className='flex items-center gap-3 p-4 border border-rose-200 bg-rose-50 rounded-lg text-rose-700'>
              <AlertCircle className='w-5 h-5' />
              {loadError}
            </div>
          ) : selectedCourseId && studentEmail ? (
            <AdaptiveInsights courseId={selectedCourseId} studentEmail={studentEmail} />
          ) : (
            <div className='flex items-center gap-3 p-4 border border-slate-200 rounded-lg text-slate-600'>
              <AlertCircle className='w-5 h-5 text-slate-500' />
              {courses.length === 0 ? 'No courses yet. Create a course to see insights.' : 'Select a course to view insights.'}
            </div>
          )}
        </div>

        <div className='mt-8 space-y-3 border border-slate-200 rounded-lg p-4 bg-white'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-base font-semibold text-slate-800'>Progress Reminders</p>
              <p className='text-sm text-slate-500'>Send weekly summaries with weak topics and next steps.</p>
            </div>
            <div className='flex items-center gap-3'>
              <label className='flex items-center gap-2 text-sm text-slate-700'>
                <input type='checkbox' checked={reminderEnabled} onChange={toggleReminder} className='h-4 w-4 accent-blue-600' />
                Enable reminders
              </label>
              <Button size='sm' variant='outline' disabled={!reminderEnabled || reminderLoading || !selectedCourseId} onClick={previewReminder}>
                {reminderLoading ? 'Loading...' : 'Preview email'}
              </Button>
              <Button 
                size='sm' 
                disabled={!reminderEnabled || sendingEmail || !selectedCourseId || !reminderPreview} 
                onClick={sendReminderEmail}
                className='bg-blue-600 hover:bg-blue-700'
              >
                {sendingEmail ? 'Sending...' : 'Send email'}
              </Button>
            </div>
          </div>

          {reminderError && (
            <div className='flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2'>
              <AlertCircle className='w-4 h-4' /> {reminderError}
            </div>
          )}

          {sendSuccess && (
            <div className='flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-3 py-2'>
              ✓ {sendSuccess}
            </div>
          )}

          {reminderPreview && (
            <div className='border border-slate-200 rounded p-3 bg-slate-50 text-sm text-slate-700 space-y-2'>
              <div className='font-semibold text-slate-900'>Reminder preview</div>
              {reminderPreview.totalTopics === 0 ? (
                <div className='text-slate-500'>No performance data yet. Complete a quiz to generate insights for reminders.</div>
              ) : (
                <>
                  <div>Overall mastery: {reminderPreview.summary?.overallMastery || 0}%</div>
                  <div>Topics mastered: {reminderPreview.summary?.topicsMastered || 0}</div>
                  <div>Topics needing work: {reminderPreview.summary?.topicsNeedingWork || 0}</div>
                  {reminderPreview.nextAction ? (
                    <div className='text-slate-800'>Next action: Review {reminderPreview.nextAction.topicName} ({reminderPreview.nextAction.averageScore}% - {reminderPreview.nextAction.recommendedDifficulty})</div>
                  ) : (
                    <div className='text-slate-500'>No next action available yet.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </div>
  )
}

export default Dashboard