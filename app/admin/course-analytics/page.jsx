"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  CheckCircle,
  Loader2,
  ChevronLeft,
  Filter,
  Download
} from 'lucide-react';
import axios from 'axios';
import { useAdminAuth } from '@/app/_context/AdminAuthContext';

export default function CourseAnalyticsPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  
  const [courseData, setCourseData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!authLoading && admin && courseId) {
      fetchAnalyticsData();
    }
  }, [authLoading, admin, courseId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch course details
      const courseRes = await axios.get(`/api/admin/courses/${courseId}`);
      setCourseData(courseRes.data.course);
      
      // Fetch analytics data
      const analyticsRes = await axios.get(`/api/admin/course-analytics/${courseId}`);
      setAnalyticsData(analyticsRes.data.analytics);
      
      // Fetch enrollments
      const enrollmentsRes = await axios.get(`/api/admin/course-enrollments/${courseId}`);
      setEnrollments(enrollmentsRes.data.enrollments || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const data = {
      courseName: courseData?.topic,
      totalEnrollments: analyticsData?.totalEnrollments,
      completionRate: analyticsData?.totalEnrollments > 0 
        ? ((analyticsData?.totalCompleted / analyticsData?.totalEnrollments) * 100).toFixed(2) + '%'
        : 'N/A',
      dropoutRate: analyticsData?.totalEnrollments > 0
        ? ((analyticsData?.totalDropped / analyticsData?.totalEnrollments) * 100).toFixed(2) + '%'
        : 'N/A',
      averageScore: analyticsData?.averageScore?.toFixed(2),
      totalRevenue: analyticsData?.totalRevenue,
      currency: courseData?.currency || 'usd'
    };

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
    element.setAttribute('download', `${courseData?.topic}-analytics.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success('Report downloaded');
  };

  if (authLoading) {
    return <div className="text-center pt-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!admin || admin.role !== 'tutor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only tutors can view course analytics.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No course selected</p>
          <button
            onClick={() => router.push('/admin/courses')}
            className="px-6 py-2 bg-primary text-white rounded-lg"
          >
            View Courses
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completionRate = analyticsData?.totalEnrollments > 0
    ? ((analyticsData.totalCompleted / analyticsData.totalEnrollments) * 100).toFixed(1)
    : 0;
  const dropoutRate = analyticsData?.totalEnrollments > 0
    ? ((analyticsData.totalDropped / analyticsData.totalEnrollments) * 100).toFixed(1)
    : 0;

  const filteredEnrollments = filterStatus === 'all'
    ? enrollments
    : enrollments.filter(e => e.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📊 Course Analytics</h1>
            <p className="text-gray-600 mt-1">{courseData?.topic}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button onClick={downloadReport} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-3xl font-bold mt-2">{analyticsData?.totalEnrollments || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold mt-2">{completionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{analyticsData?.totalCompleted || 0} completed</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Dropout Rate</p>
                <p className="text-3xl font-bold mt-2">{dropoutRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{analyticsData?.totalDropped || 0} dropped</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-3xl font-bold mt-2">{analyticsData?.averageScore?.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {courseData?.price > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  {courseData?.currency?.toUpperCase()} {analyticsData?.totalRevenue?.toFixed(2) || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        )}

        {/* Enrollments Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">Student Enrollments</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Enrolled Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Completion %</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Time Spent</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.length > 0 ? (
                  filteredEnrollments.map((enrollment, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{enrollment.studentEmail}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          enrollment.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                          enrollment.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{enrollment.completionPercentage}%</td>
                      <td className="px-6 py-4 text-sm">{enrollment.performanceScore?.toFixed(1) || 'N/A'}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{enrollment.totalTimeSpent} mins</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No enrollments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
