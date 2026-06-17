'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { ArrowLeft, BellRing, Download, MessageSquareText, TrendingUp } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGradeBgColor, getGradeColor, getGradeLabel } from '@/lib/gradingSystem';
import { arrayToCSV, downloadCSV, getExportFilename } from '@/lib/csvExport';

const GRADEBOOK_REFRESH_MS = 20000;

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString();
}

function getResultClasses(status) {
  return status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
}

export default function StudentCourseGradeDetailPage() {
  const { user } = useUser();
  const params = useParams();
  const courseId = params?.courseId;

  const [grades, setGrades] = useState(null);
  const [course, setCourse] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [notificationSummary, setNotificationSummary] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.primaryEmailAddress?.emailAddress || !courseId) return;

    const fetchData = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        const gradesResponse = await axios.get('/api/grades/student', { timeout: 30000 });
        const result = gradesResponse.data?.result;
        const matchedCourse = result?.courses?.find((entry) => entry.courseId === courseId);

        if (!matchedCourse) {
          setError('Course grade details not found');
          setLoading(false);
          return;
        }

        setGrades(result);
        setCourse(matchedCourse);

        const [trendsResponse, notificationsResponse] = await Promise.all([
          axios.get('/api/grades/trends', {
            params: {
              courseId,
              studentEmail: result.studentEmail,
              days: 180,
            },
            timeout: 30000,
          }),
          axios.get('/api/grades/notifications', {
            params: {
              studentEmail: result.studentEmail,
              unreadOnly: true,
              limit: 100,
            },
            timeout: 30000,
          }),
        ]);

        const notifications = notificationsResponse.data?.result || { notifications: [], unreadCount: 0 };
        setTrendData(trendsResponse.data?.result || null);
        setNotificationSummary(notifications);

        const unreadCourseNotifications = (notifications.notifications || []).filter(
          (notification) => notification.courseId === courseId && notification.notificationType === 'comment_added'
        );

        if (unreadCourseNotifications.length > 0) {
          await Promise.all(
            unreadCourseNotifications.map((notification) =>
              axios.put(`/api/grades/notifications?id=${notification.id}`, {}, { timeout: 30000 })
            )
          );

          setNotificationSummary((current) => ({
            unreadCount: Math.max(0, (current.unreadCount || 0) - unreadCourseNotifications.length),
            notifications: (current.notifications || []).filter(
              (notification) => !unreadCourseNotifications.some((item) => item.id === notification.id)
            ),
          }));
        }

        setError('');
      } catch (err) {
        console.error('Failed to fetch course grade details:', err);
        setError(err.response?.data?.error || 'Failed to load course grade details');
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    };

    fetchData(true);
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    }, GRADEBOOK_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [courseId, user]);

  const trendHistory = useMemo(() => {
    return (trendData?.history || []).map((entry, index) => ({
      index: index + 1,
      score: entry.newScore,
      date: formatDate(entry.createdAt),
      reason: entry.reason || entry.assessmentType,
    }));
  }, [trendData]);

  const assessmentBreakdown = useMemo(() => {
    if (!course) return [];
    return [
      { name: 'Quiz', value: course.quizAverage || 0 },
      { name: 'Assignment', value: course.assignmentAverage || 0 },
      { name: 'MCQ', value: course.mcqAverage || 0 },
    ];
  }, [course]);

  const unreadCourseCount = useMemo(() => {
    return (notificationSummary.notifications || []).filter(
      (notification) => notification.courseId === courseId && notification.notificationType === 'comment_added'
    ).length;
  }, [courseId, notificationSummary.notifications]);

  const handleDownloadCourseCsv = () => {
    if (!course) return;

    const csv = arrayToCSV([
      {
        courseName: course.courseName,
        courseType: course.courseType,
        category: course.category,
        progressPercentage: course.progressPercentage,
        quizAverage: course.quizAverage,
        assignmentAverage: course.assignmentAverage,
        assignmentSubmitted: course.assignmentSubmitted,
        mcqAverage: course.mcqAverage,
        finalGrade: course.finalGrade,
        gradeLabel: getGradeLabel(course.finalGrade),
        resultStatus: course.resultStatus,
        classRank: course.classRank || '',
        classSize: course.classSize || '',
        feedbackCount: course.feedbackCount || 0,
        lastActivityAt: formatDate(course.lastActivityAt),
      },
    ], [
      { key: 'courseName', header: 'Course' },
      { key: 'courseType', header: 'Type' },
      { key: 'category', header: 'Category' },
      { key: 'progressPercentage', header: 'Progress %' },
      { key: 'quizAverage', header: 'Quiz Average %' },
      { key: 'assignmentAverage', header: 'Assignment Average %' },
      { key: 'assignmentSubmitted', header: 'Assignments Submitted' },
      { key: 'mcqAverage', header: 'MCQ Average %' },
      { key: 'finalGrade', header: 'Final Grade %' },
      { key: 'gradeLabel', header: 'Grade' },
      { key: 'resultStatus', header: 'Pass / Fail' },
      { key: 'classRank', header: 'Class Rank' },
      { key: 'classSize', header: 'Class Size' },
      { key: 'feedbackCount', header: 'Feedback Count' },
      { key: 'lastActivityAt', header: 'Last Activity' },
    ]);

    downloadCSV(csv, getExportFilename(`grade_detail_${course.courseName.replace(/\s+/g, '_').toLowerCase()}`));
    toast.success('Course breakdown exported');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-slate-600">Loading course breakdown...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8">
        <Link href="/grades" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to GradeBook
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error || 'Course not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff,_#eff6ff_50%,_#f8fafc)] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/grades" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Back to GradeBook
            </Link>
            <h1 className="text-4xl font-bold text-slate-900">{course.courseName}</h1>
            <p className="mt-2 text-slate-600">Detailed course-level GradeBook view with assessment breakdown, trend history, and staff feedback.</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Live updates every 20 seconds</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
              <BellRing className="h-4 w-4" />
              {unreadCourseCount} unread alerts
            </div>
            <button onClick={handleDownloadCourseCsv} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Download className="h-4 w-4" />
              Export Course CSV
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Final Grade</CardTitle></CardHeader>
            <CardContent>
              <div className={`rounded-2xl p-4 ${getGradeBgColor(course.finalGrade)}`}>
                <p className={`text-3xl font-bold ${getGradeColor(course.finalGrade)}`}>{course.finalGrade}%</p>
                <p className="mt-1 text-sm text-slate-700">{getGradeLabel(course.finalGrade)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Progress</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-sky-700">{course.progressPercentage}%</p>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-sky-600" style={{ width: `${course.progressPercentage}%` }}></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Rank</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{course.classRank ? `#${course.classRank}` : 'N/A'}</p>
              <p className="mt-1 text-xs text-slate-500">{course.classSize ? `out of ${course.classSize}` : 'No class size available'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Result</CardTitle></CardHeader>
            <CardContent>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getResultClasses(course.resultStatus)}`}>{course.resultStatus}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Feedback</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">{course.feedbackCount || 0}</p>
              <p className="mt-1 text-xs text-slate-500">Instructor comments</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-sky-600" /> Grade Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trendHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Score']} labelFormatter={(value) => `Update ${value}`} />
                    <Line type="monotone" dataKey="score" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No grade history has been recorded for this course yet.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assessment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={assessmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Average']} />
                  <Bar dataKey="value" fill="#0f766e" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Quiz Performance</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{course.quizAverage}%</p>
              <p className="mt-1 text-sm text-slate-500">Across {course.quizCount} quiz items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Assignment Performance</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{course.assignmentAverage}%</p>
              <p className="mt-1 text-sm text-slate-500">{course.assignmentSubmitted || 0} graded submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">MCQ Performance</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{course.mcqAverage}%</p>
              <p className="mt-1 text-sm text-slate-500">Across {course.mcqCount} MCQ items</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-emerald-600" /> Staff Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {course.feedbackComments?.length ? (
              <div className="space-y-4">
                {course.feedbackComments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">{comment.assessmentType}</span>
                      {comment.isPinned && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pinned</span>}
                      <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No staff feedback has been added for this course yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}