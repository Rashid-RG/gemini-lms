'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { BellRing, Download, ExternalLink, MessageSquareText, Trophy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getGradeLabel, getGradeColor, getGradeBgColor, GRADING_SCALE } from '@/lib/gradingSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { arrayToCSV, downloadCSV, getExportFilename } from '@/lib/csvExport';

const COLORS = ['#0f766e', '#ca8a04', '#0284c7'];
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

export default function StudentGradeBookPage() {
  const { user } = useUser();
  const [grades, setGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');
  const [notificationSummary, setNotificationSummary] = useState({ notifications: [], unreadCount: 0 });
  const [exportingPdf, setExportingPdf] = useState(false);
  const pdfReportRef = useRef(null);

  useEffect(() => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    const fetchGrades = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        const response = await axios.get('/api/grades/student', { timeout: 30000 });
        setGrades(response.data.result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch grades:', err);
        setError(err.response?.data?.error || 'Failed to load grades');
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    };

    fetchGrades(true);
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGrades(false);
      }
    }, GRADEBOOK_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (!grades?.studentEmail) return;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/api/grades/notifications', {
          params: {
            studentEmail: grades.studentEmail,
            unreadOnly: true,
            limit: 100,
          },
          timeout: 30000,
        });
        setNotificationSummary(response.data?.result || { notifications: [], unreadCount: 0 });
      } catch (err) {
        console.error('Failed to load grade notifications:', err);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, GRADEBOOK_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [grades?.studentEmail]);

  useEffect(() => {
    if (!grades?.courses?.length) {
      setSelectedCourseId('');
      return;
    }

    setSelectedCourseId((current) => {
      if (current && grades.courses.some((course) => course.courseId === current)) {
        return current;
      }
      return grades.courses[0].courseId;
    });
  }, [grades]);

  useEffect(() => {
    if (!selectedCourseId || !grades?.studentEmail) {
      setTrendData(null);
      return;
    }

    const fetchTrends = async () => {
      try {
        setTrendLoading(true);
        setTrendError('');
        const response = await axios.get('/api/grades/trends', {
          params: {
            courseId: selectedCourseId,
            studentEmail: grades.studentEmail,
            days: 180,
          },
          timeout: 30000,
        });
        setTrendData(response.data.result || null);
      } catch (err) {
        console.error('Failed to fetch trends:', err);
        setTrendError(err.response?.data?.error || 'Failed to load grade history');
        setTrendData(null);
      } finally {
        setTrendLoading(false);
      }
    };

    fetchTrends();
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTrends();
      }
    }, GRADEBOOK_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [selectedCourseId, grades?.studentEmail]);

  const filteredCourses = useMemo(() => {
    const courses = [...(grades?.courses || [])];
    const filtered = filterStatus === 'all'
      ? courses
      : courses.filter((course) => filterStatus === 'completed' ? course.status === 'Completed' : course.status === 'In Progress');

    if (sortBy === 'grade') {
      filtered.sort((a, b) => b.finalGrade - a.finalGrade);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.courseName.localeCompare(b.courseName));
    }

    return filtered;
  }, [grades?.courses, filterStatus, sortBy]);

  const selectedCourse = useMemo(() => {
    return filteredCourses.find((course) => course.courseId === selectedCourseId)
      || grades?.courses?.find((course) => course.courseId === selectedCourseId)
      || null;
  }, [filteredCourses, grades?.courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse || !notificationSummary.notifications?.length) return;

    const unreadCourseNotifications = notificationSummary.notifications.filter(
      (notification) => notification.courseId === selectedCourse.courseId && notification.notificationType === 'comment_added'
    );

    if (!unreadCourseNotifications.length) return;

    const markRead = async () => {
      try {
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
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    };

    markRead();
  }, [selectedCourse, notificationSummary.notifications]);

  const unreadCommentNotifications = useMemo(() => {
    return (notificationSummary.notifications || []).filter((notification) => notification.notificationType === 'comment_added');
  }, [notificationSummary.notifications]);

  const unreadNotificationsByCourse = useMemo(() => {
    return unreadCommentNotifications.reduce((accumulator, notification) => {
      const courseId = notification.courseId;
      accumulator[courseId] = (accumulator[courseId] || 0) + 1;
      return accumulator;
    }, {});
  }, [unreadCommentNotifications]);

  const gradeDistribution = filteredCourses.map((course) => ({
    name: course.courseName.substring(0, 15),
    grade: course.finalGrade,
  }));

  const gradesByType = [
    { name: 'Quiz Avg', value: Math.round(filteredCourses.reduce((sum, course) => sum + course.quizAverage, 0) / (filteredCourses.length || 1)) },
    { name: 'Assignment Avg', value: Math.round(filteredCourses.reduce((sum, course) => sum + course.assignmentAverage, 0) / (filteredCourses.length || 1)) },
    { name: 'MCQ Avg', value: Math.round(filteredCourses.reduce((sum, course) => sum + course.mcqAverage, 0) / (filteredCourses.length || 1)) },
  ];

  const trendHistory = (trendData?.history || []).map((entry, index) => ({
    index: index + 1,
    score: entry.newScore,
    label: entry.assessmentType || `Change ${index + 1}`,
    date: formatDate(entry.createdAt),
  }));

  const handleDownloadCsv = () => {
    if (!grades?.courses?.length) return;

    const rows = grades.courses.map((course) => ({
      courseName: course.courseName,
      courseType: course.courseType,
      category: course.category,
      progressPercentage: course.progressPercentage,
      quizAverage: course.quizAverage,
      quizCount: course.quizCount,
      assignmentAverage: course.assignmentAverage,
      assignmentCount: course.assignmentCount,
      assignmentSubmitted: course.assignmentSubmitted,
      mcqAverage: course.mcqAverage,
      mcqCount: course.mcqCount,
      finalGrade: course.finalGrade,
      gradeLetter: getGradeLabel(course.finalGrade),
      resultStatus: course.resultStatus,
      classRank: course.classRank || '',
      classSize: course.classSize || '',
      feedbackCount: course.feedbackCount || 0,
      startedAt: formatDate(course.startedAt),
      completedAt: formatDate(course.completedAt),
      lastActivityAt: formatDate(course.lastActivityAt),
    }));

    const csv = arrayToCSV(rows, [
      { key: 'courseName', header: 'Course' },
      { key: 'courseType', header: 'Course Type' },
      { key: 'category', header: 'Category' },
      { key: 'progressPercentage', header: 'Progress %' },
      { key: 'quizAverage', header: 'Quiz Average %' },
      { key: 'quizCount', header: 'Quiz Count' },
      { key: 'assignmentAverage', header: 'Assignment Average %' },
      { key: 'assignmentCount', header: 'Assignment Count' },
      { key: 'assignmentSubmitted', header: 'Assignments Submitted' },
      { key: 'mcqAverage', header: 'MCQ Average %' },
      { key: 'mcqCount', header: 'MCQ Count' },
      { key: 'finalGrade', header: 'Final Grade %' },
      { key: 'gradeLetter', header: 'Grade Letter' },
      { key: 'resultStatus', header: 'Pass / Fail' },
      { key: 'classRank', header: 'Class Rank' },
      { key: 'classSize', header: 'Class Size' },
      { key: 'feedbackCount', header: 'Feedback Count' },
      { key: 'startedAt', header: 'Started At' },
      { key: 'completedAt', header: 'Completed At' },
      { key: 'lastActivityAt', header: 'Last Activity' },
    ]);

    downloadCSV(csv, getExportFilename('my_gradebook'));
  };

  const handleExportPdf = async () => {
    if (!grades?.courses?.length || !pdfReportRef.current) return;

    let exportHost = null;

    try {
      setExportingPdf(true);
      const html2pdf = (await import('html2pdf.js')).default;
      const reportClone = pdfReportRef.current.cloneNode(true);

      exportHost = document.createElement('div');
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.style.position = 'fixed';
      exportHost.style.left = '0';
      exportHost.style.top = '0';
      exportHost.style.width = '820px';
      exportHost.style.padding = '24px';
      exportHost.style.background = '#ffffff';
      exportHost.style.zIndex = '-1';
      exportHost.style.opacity = '1';
      exportHost.style.pointerEvents = 'none';
      exportHost.appendChild(reportClone);
      document.body.appendChild(exportHost);

      await html2pdf()
        .set({
          margin: 0.35,
          filename: `gradebook-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(reportClone)
        .save();

      toast.success('GradeBook PDF downloaded');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export GradeBook PDF');
    } finally {
      if (exportHost?.parentNode) {
        exportHost.parentNode.removeChild(exportHost);
      }
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your grades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdf4,_#eff6ff_55%,_#f8fafc)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Student GradeBook</h1>
            <p className="text-slate-600">Track performance, review staff feedback, and export your academic report.</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Live updates every 20 seconds</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
              <BellRing className="h-4 w-4" />
              {notificationSummary.unreadCount || 0} unread feedback alerts
            </div>
            <button onClick={handleExportPdf} disabled={exportingPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" />
              {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
            </button>
            <button onClick={handleDownloadCsv} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Overall Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${getGradeColor(grades?.statistics?.overallGrade || 0)}`}>
                  {getGradeLabel(grades?.statistics?.overallGrade || 0)}
                </div>
                <div>
                  <p className="text-2xl font-semibold">{grades?.statistics?.overallGrade || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-sky-700">{grades?.statistics?.totalCourses || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{grades?.statistics?.completedCourses || 0} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Average Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">{grades?.statistics?.averageProgress || 0}%</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${grades?.statistics?.averageProgress || 0}%` }}></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pass / Fail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-700 font-semibold">Passed: {grades?.statistics?.passedCourses || 0}</p>
              <p className="text-sm text-rose-700 font-semibold mt-1">Failed: {grades?.statistics?.failedCourses || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Selected Course Rank</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{selectedCourse?.classRank ? `#${selectedCourse.classRank}` : 'N/A'}</p>
              <p className="text-xs text-slate-500 mt-1">{selectedCourse?.classSize ? `out of ${selectedCourse.classSize} students` : 'Select a course below'}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 border-sky-200 bg-sky-50/60">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Student Name</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.name || 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Student ID</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.studentIdentifier || 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Email</p>
                <p className="mt-1 font-semibold text-slate-900 break-all">{grades?.studentProfile?.email || grades?.studentEmail || 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Phone</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.phoneNumber || 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4 xl:col-span-2">
                <p className="text-slate-500">Address</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.address || 'Not available'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Date of Birth</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDate(grades?.studentProfile?.dateOfBirth)}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4">
                <p className="text-slate-500">Joined Platform</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDate(grades?.studentProfile?.joinedAt)}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4 xl:col-span-2">
                <p className="text-slate-500">Emergency Contact</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.emergencyContactName || 'Not available'}</p>
                <p className="mt-1 text-xs text-slate-500">{grades?.studentProfile?.emergencyContactPhone || 'No phone provided'}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white p-4 xl:col-span-2">
                <p className="text-slate-500">Guardian</p>
                <p className="mt-1 font-semibold text-slate-900">{grades?.studentProfile?.guardianRelationship || 'Not available'}</p>
                <p className="mt-1 text-xs text-slate-500 break-all">{grades?.studentProfile?.guardianEmail || 'No email provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution by Course</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="grade" fill="#0f766e" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average by Assessment Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={gradesByType} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={85} dataKey="value">
                      {gradesByType.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sky-600" />
                Grade Trend for {selectedCourse?.courseName || 'Selected Course'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <p className="text-sm text-slate-500">Loading grade history...</p>
              ) : trendError ? (
                <p className="text-sm text-rose-600">{trendError}</p>
              ) : trendHistory.length > 0 ? (
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
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No recorded grade history yet for this course. Trend points will appear when grade changes are saved into grade history.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Course Spotlight
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCourse ? (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 ${getGradeBgColor(selectedCourse.finalGrade)}`}>
                    <p className="text-sm text-slate-600">Final Grade</p>
                    <p className={`text-3xl font-bold ${getGradeColor(selectedCourse.finalGrade)}`}>{selectedCourse.finalGrade}%</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">{getGradeLabel(selectedCourse.finalGrade)} grade</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Rank</p>
                      <p className="font-semibold text-slate-900">{selectedCourse.classRank ? `#${selectedCourse.classRank} / ${selectedCourse.classSize}` : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Result</p>
                      <span className={`inline-flex rounded-full px-3 py-1 mt-1 text-xs font-semibold ${getResultClasses(selectedCourse.resultStatus)}`}>{selectedCourse.resultStatus}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Feedback</p>
                      <p className="font-semibold text-slate-900">{selectedCourse.feedbackCount || 0} comments</p>
                      {(unreadNotificationsByCourse[selectedCourse.courseId] || 0) > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-700">{unreadNotificationsByCourse[selectedCourse.courseId]} new</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Last Activity</p>
                      <p className="font-semibold text-slate-900">{formatDate(selectedCourse.lastActivityAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a course to see detailed insights.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Grading Scale Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {GRADING_SCALE.map((scale) => (
                <div key={scale.grade} className={`p-3 rounded-lg border-2 ${scale.borderColor} ${scale.bgColor}`}>
                  <div className={`text-lg font-bold ${scale.color}`}>{scale.grade}</div>
                  <div className="text-xs text-gray-600 mt-1">{scale.min}-{scale.max}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mb-6 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent">
              <option value="recent">Most Recent</option>
              <option value="grade">Highest Grade</option>
              <option value="name">Course Name</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter By:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent">
              <option value="all">All Courses</option>
              <option value="completed">Completed</option>
              <option value="inProgress">In Progress</option>
            </select>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Courses ({filteredCourses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No courses found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Course</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Progress</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Quiz</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Assignment</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">MCQ</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Final Grade</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Pass / Fail</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Rank</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Feedback</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course.courseId} onClick={() => setSelectedCourseId(course.courseId)} className={`border-b border-gray-100 cursor-pointer transition-colors ${selectedCourseId === course.courseId ? 'bg-sky-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{course.courseName}</p>
                            <p className="text-xs text-gray-500">{course.courseType}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-sky-600 h-2 rounded-full" style={{ width: `${course.progressPercentage}%` }}></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{course.progressPercentage}%</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold">{course.quizAverage}%</span>
                          <p className="text-xs text-gray-500">({course.quizCount})</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold">{course.assignmentAverage}%</span>
                          <p className="text-xs text-gray-500">({course.assignmentCount})</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold">{course.mcqAverage}%</span>
                          <p className="text-xs text-gray-500">({course.mcqCount})</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-lg font-bold ${getGradeColor(course.finalGrade)}`}>{getGradeLabel(course.finalGrade)}</span>
                            <span className="text-sm font-semibold text-gray-700">{course.finalGrade}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getResultClasses(course.resultStatus)}`}>{course.resultStatus}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{course.classRank ? `#${course.classRank}` : 'N/A'}</td>
                        <td className="py-3 px-4 text-center text-slate-700">
                          <div className="inline-flex items-center gap-2">
                            <span>{course.feedbackCount || 0}</span>
                            {(unreadNotificationsByCourse[course.courseId] || 0) > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                {unreadNotificationsByCourse[course.courseId]} new
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/grades/${course.courseId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-emerald-600" />
              Staff Feedback {selectedCourse ? `for ${selectedCourse.courseName}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCourse ? (
              <p className="text-sm text-slate-500">Select a course to read feedback.</p>
            ) : selectedCourse.feedbackComments?.length ? (
              <div className="space-y-4">
                {selectedCourse.feedbackComments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 uppercase">{comment.assessmentType}</span>
                      {comment.isPinned && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Pinned</span>}
                      <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No instructor comments are available for this course yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="absolute -left-[9999px] top-0">
          <div ref={pdfReportRef} className="w-[820px] bg-white p-8 text-slate-900">
            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#0f766e)] p-8 text-white">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-100">Gemini LMS</p>
              <h2 className="mt-3 text-4xl font-bold">Student GradeBook Report</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-100">A branded academic summary with course performance, rank position, progress, and staff feedback highlights.</p>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-emerald-100">Student Name</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.name || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Student ID</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.studentIdentifier || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Email</p>
                    <p className="mt-1 font-semibold text-white break-all">{grades?.studentProfile?.email || grades?.studentEmail || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Phone</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.phoneNumber || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Address</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.address || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Date of Birth</p>
                    <p className="mt-1 font-semibold text-white">{formatDate(grades?.studentProfile?.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Emergency Contact</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.emergencyContactName || 'Not available'}</p>
                    <p className="text-xs text-emerald-100">{grades?.studentProfile?.emergencyContactPhone || 'No phone provided'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100">Guardian</p>
                    <p className="mt-1 font-semibold text-white">{grades?.studentProfile?.guardianRelationship || 'Not available'}</p>
                    <p className="text-xs text-emerald-100 break-all">{grades?.studentProfile?.guardianEmail || 'No email provided'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-emerald-100">Overall Grade</p>
                  <p className="mt-2 text-2xl font-bold">{grades?.statistics?.overallGrade || 0}%</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-emerald-100">Courses</p>
                  <p className="mt-2 text-2xl font-bold">{grades?.statistics?.totalCourses || 0}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-emerald-100">Passed</p>
                  <p className="mt-2 text-2xl font-bold">{grades?.statistics?.passedCourses || 0}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-emerald-100">Generated</p>
                  <p className="mt-2 text-lg font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              {grades?.courses?.map((course) => (
                <div key={`pdf-${course.courseId}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 break-inside-avoid">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{course.courseName}</h3>
                      <p className="mt-1 text-sm text-slate-600">{course.courseType} • {course.category}</p>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-sm font-semibold ${getResultClasses(course.resultStatus)}`}>
                      {course.resultStatus}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-slate-500">Final Grade</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{course.finalGrade}%</p>
                      <p className="text-xs text-slate-500">{getGradeLabel(course.finalGrade)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-slate-500">Rank</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{course.classRank ? `#${course.classRank}` : 'N/A'}</p>
                      <p className="text-xs text-slate-500">{course.classSize ? `of ${course.classSize}` : 'No class data'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-slate-500">Progress</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{course.progressPercentage}%</p>
                      <p className="text-xs text-slate-500">Learning completion</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-slate-500">Feedback</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{course.feedbackCount || 0}</p>
                      <p className="text-xs text-slate-500">Instructor comments</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-slate-500">Quiz Average</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{course.quizAverage}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-slate-500">Assignment Average</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{course.assignmentAverage}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-slate-500">MCQ Average</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{course.mcqAverage}%</p>
                    </div>
                  </div>

                  {course.feedbackComments?.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-900">Latest feedback</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-950">{course.feedbackComments[0].comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
