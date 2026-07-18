
"use client"
import React from 'react'
import WelcomeBanner from './_components/WelcomeBanner'
import CourseList from './_components/CourseList'
import AnnouncementFeed from './_components/AnnouncementFeed'
import AdaptiveInsights from '@/components/AdaptiveInsights'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import AIStudyCoach from './_components/AIStudyCoach'

function Dashboard() {
  const {
    user,
    studentEmail,
    courses,
    studentProfile,
    selectedCourseId,
    setSelectedCourseId,
    loadingCourses,
    loadError,
    reminderEnabled,
    reminderLoading,
    reminderError,
    reminderPreview,
    sendingEmail,
    sendSuccess,
    profileCompleteness,
    activeCourse,
    toggleReminder,
    previewReminder,
    sendReminderEmail
  } = useStudentDashboard()

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

        <AnnouncementFeed />

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

        {activeCourse && (
          <div className="relative overflow-hidden mb-8 backdrop-blur-md bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group hover:shadow-md transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none transition-transform group-hover:scale-110 duration-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Continue Learning</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl tracking-tight leading-tight">{activeCourse.topic || activeCourse.courseName}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick up right where you left off</p>
            </div>
            <Link 
              href={`/course/${activeCourse.courseId || activeCourse.id}`} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all duration-200 self-start sm:self-center z-10"
            >
              Resume Course
            </Link>
          </div>
        )}

        {activeCourse && studentEmail && (
          <AIStudyCoach courseId={activeCourse.courseId || activeCourse.id} studentEmail={studentEmail} />
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