'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getGradeLabel, getGradeColor } from '@/lib/gradingSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';

export default function InstructorGradeBookPage() {
  const { user } = useUser();
  const [myCourses, setMyCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseGrades, setCourseGrades] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('grade'); // grade, email, progress

  // Fetch user's courses
  useEffect(() => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          '/api/courses',
          { createdBy: user.primaryEmailAddress.emailAddress },
          { timeout: 30000 }
        );
        const userCourses = response.data.result || [];
        setMyCourses(userCourses);
        if (userCourses.length > 0) {
          setSelectedCourse(userCourses[0].courseId);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
        setError('Failed to load your courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  // Fetch grades for selected course
  useEffect(() => {
    if (!selectedCourse) return;

    const fetchGrades = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/grades/instructor?courseId=${selectedCourse}`, {
          timeout: 30000,
        });
        setCourseGrades(response.data.result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch grades:', err);
        setError(err.response?.data?.error || 'Failed to load grades');
        setCourseGrades(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [selectedCourse]);

  // Sort students
  let sortedStudents = courseGrades?.students || [];
  if (sortBy === 'grade') {
    sortedStudents.sort((a, b) => b.finalGrade - a.finalGrade);
  } else if (sortBy === 'email') {
    sortedStudents.sort((a, b) => a.studentEmail.localeCompare(b.studentEmail));
  } else if (sortBy === 'progress') {
    sortedStudents.sort((a, b) => b.progressPercentage - a.progressPercentage);
  }

  // Prepare chart data
  const gradeData = sortedStudents.map((s) => ({
    email: s.studentEmail.split('@')[0],
    grade: s.finalGrade,
  }));

  const handlePrintStudentReport = async (student) => {
    if (!courseGrades?.course || !student) return;

    let exportHost = null;

    const gradeLabel = getGradeLabel(student.finalGrade || 0);
    const statusTone = student.status === 'Completed' ? '#15803d' : '#1d4ed8';

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const reportMarkup = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; width: 820px; padding: 28px;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%); color: white; border-radius: 24px; padding: 28px;">
            <h1 style="margin: 0 0 8px; font-size: 30px;">Student Grade Report</h1>
            <p style="margin: 4px 0;"><strong>Course:</strong> ${courseGrades.course.courseName}</p>
            <p style="margin: 4px 0;"><strong>Student:</strong> ${student.studentEmail}</p>
            <p style="margin: 4px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 22px;">
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e2e8f0;"><div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Final Grade</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${student.finalGrade || 0}%</div><div>${gradeLabel}</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e2e8f0;"><div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Progress</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${student.progressPercentage || 0}%</div><div>Course completion</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e2e8f0;"><div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Quiz Average</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${student.quizAverage || 0}%</div><div>${student.quizCount || 0} graded items</div></div>
            <div style="background: white; border-radius: 18px; padding: 18px; border: 1px solid #e2e8f0;"><div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Assignment Average</div><div style="margin-top: 8px; font-size: 28px; font-weight: 700;">${student.assignmentAverage || 0}%</div><div>${student.assignmentSubmitted || 0}/${student.assignmentCount || 0} submitted</div></div>
          </div>
          <div style="margin-top: 22px; background: white; border-radius: 22px; padding: 22px; border: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">Performance Details</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px;">
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>MCQ Average:</strong> ${student.mcqAverage || 0}% (${student.mcqCount || 0} items)</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Status:</strong><div style="display: inline-block; margin-top: 8px; padding: 6px 12px; border-radius: 999px; color: white; background: ${statusTone}; font-size: 12px; font-weight: 700;">${student.status || 'In Progress'}</div></div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Started:</strong> ${student.startedAt ? new Date(student.startedAt).toLocaleDateString() : 'Not available'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Last Activity:</strong> ${student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString() : 'Never'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Completed:</strong> ${student.completedAt ? new Date(student.completedAt).toLocaleDateString() : 'Not completed'}</div>
              <div style="padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Course Type:</strong> ${courseGrades.course.courseType || 'Unknown'}</div>
            </div>
            <div style="margin-top: 18px; font-size: 12px; color: #64748b;">This report is available only to the course instructor and authorized admins/tutors.</div>
          </div>
        </div>
      `;

      exportHost = document.createElement('div');
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.style.position = 'fixed';
      exportHost.style.left = '0';
      exportHost.style.top = '0';
      exportHost.style.width = '820px';
      exportHost.style.padding = '24px';
      exportHost.style.background = '#ffffff';
      exportHost.style.zIndex = '-1';
      exportHost.style.pointerEvents = 'none';
      exportHost.innerHTML = reportMarkup;
      document.body.appendChild(exportHost);

      await html2pdf()
        .set({
          margin: 0.35,
          filename: `${courseGrades.course.courseName.replace(/\s+/g, '_').toLowerCase()}_${student.studentEmail.split('@')[0]}_report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(exportHost.firstElementChild)
        .save();

      toast.success('Student report downloaded');
    } catch (error) {
      console.error('Student report export failed:', error);
      toast.error('Failed to download student report');
    } finally {
      if (exportHost?.parentNode) {
        exportHost.parentNode.removeChild(exportHost);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">👨‍🏫 Instructor GradeBook</h1>
          <p className="text-gray-600">Manage and monitor your students' grades</p>
        </div>

        {/* Course Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Course</CardTitle>
          </CardHeader>
          <CardContent>
            {myCourses.length === 0 ? (
              <p className="text-gray-600">You haven't created any courses yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCourses.map((course) => (
                  <button
                    key={course.courseId}
                    onClick={() => setSelectedCourse(course.courseId)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedCourse === course.courseId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{course.topic}</p>
                    <p className="text-sm text-gray-600 mt-1">{course.courseType}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {course.totalStudents || 0} students
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCourse && courseGrades && (
          <>
            {/* Class Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {courseGrades.statistics.totalStudents}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Class Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-bold ${getGradeColor(courseGrades.statistics.classAverage)}`}>
                      {getGradeLabel(courseGrades.statistics.classAverage)}
                    </span>
                    <p className="text-2xl font-semibold text-gray-700">
                      {courseGrades.statistics.classAverage}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Highest Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      {getGradeLabel(courseGrades.statistics.highestGrade)}
                    </span>
                    <p className="text-2xl font-semibold text-gray-700">
                      {courseGrades.statistics.highestGrade}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Lowest Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-red-600">
                      {getGradeLabel(courseGrades.statistics.lowestGrade)}
                    </span>
                    <p className="text-2xl font-semibold text-gray-700">
                      {courseGrades.statistics.lowestGrade}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {courseGrades.statistics.completedStudents}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Grade Distribution Chart */}
            {gradeData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="email" angle={-45} textAnchor="end" height={100} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="grade" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Sort Controls */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="grade">Highest Grade</option>
                <option value="progress">Progress %</option>
                <option value="email">Email</option>
              </select>
            </div>

            {/* Students Table */}
            <Card>
              <CardHeader>
                <CardTitle>Students ({sortedStudents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Email</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Progress</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Quiz</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Assignment</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">MCQ</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Final Grade</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Last Activity</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Report</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((student) => (
                          <tr key={student.studentEmail} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{student.studentEmail}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${student.progressPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600 w-10 text-right">
                                  {student.progressPercentage}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-semibold">{student.quizAverage}%</span>
                              <p className="text-xs text-gray-500">({student.quizCount})</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-semibold">{student.assignmentAverage}%</span>
                              <p className="text-xs text-gray-500">({student.assignmentSubmitted}/{student.assignmentCount})</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-semibold">{student.mcqAverage}%</span>
                              <p className="text-xs text-gray-500">({student.mcqCount})</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`text-lg font-bold ${getGradeColor(student.finalGrade)}`}>
                                  {getGradeLabel(student.finalGrade)}
                                </span>
                                <span className="text-sm font-semibold text-gray-700">{student.finalGrade}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                student.status === 'Completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs text-gray-600">
                              {student.lastActivityAt 
                                ? new Date(student.lastActivityAt).toLocaleDateString()
                                : 'Never'
                              }
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handlePrintStudentReport(student)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Student Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
