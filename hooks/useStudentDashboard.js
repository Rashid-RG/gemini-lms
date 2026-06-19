import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';

/**
 * Custom hook to manage student dashboard state and data loading
 */
export function useStudentDashboard() {
  const { user } = useUser();
  const [courses, setCourses] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  // Reminders state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const [reminderPreview, setReminderPreview] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');

  // Streak & Profile completeness state
  const [streak, setStreak] = useState({ count: 0, longest: 0, badges: [] });
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakError, setStreakError] = useState('');
  const [profileCompleteness, setProfileCompleteness] = useState({ isComplete: true, missingLabels: [] });

  const studentEmail = user?.primaryEmailAddress?.emailAddress;

  // Find active course to resume
  const activeCourse = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    return courses[0];
  }, [courses]);

  useEffect(() => {
    if (!studentEmail) return;

    // Load reminder preference from localStorage
    const saved = window.localStorage.getItem('reminderEnabled');
    if (saved) setReminderEnabled(saved === 'true');

    // Consolidated API call
    const loadDashboardData = async () => {
      try {
        setLoadingCourses(true);
        setStreakLoading(true);
        setLoadError('');
        setStreakError('');

        const res = await axios.get('/api/dashboard-data');
        const data = res?.data || {};

        // Courses
        const list = data.courses || [];
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourseId(list[0].courseId || list[0].id || '');
        }

        // Profile
        setStudentProfile(data.profile || null);
        setProfileCompleteness(data.completeness || { isComplete: true, missingLabels: [] });

        // Streak
        setStreak(data.streak || { count: 0, longest: 0, badges: [] });

      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setLoadError('Unable to load dashboard data');
        setStreakError('Unable to load streak data');
      } finally {
        setLoadingCourses(false);
        setStreakLoading(false);
      }
    };

    loadDashboardData();
  }, [studentEmail]);

  const toggleReminder = () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    window.localStorage.setItem('reminderEnabled', String(next));
  };

  const previewReminder = async () => {
    if (!selectedCourseId || !studentEmail) return;
    try {
      setReminderLoading(true);
      setReminderError('');
      setReminderPreview(null);
      const res = await axios.post('/api/progress-reminder', {
        studentEmail,
        courseId: selectedCourseId
      });
      setReminderPreview(res?.data?.result || null);
    } catch (err) {
      console.error('Failed to fetch reminder preview', err);
      setReminderError('Unable to generate reminder preview');
    } finally {
      setReminderLoading(false);
    }
  };

  const sendReminderEmail = async () => {
    if (!selectedCourseId || !studentEmail || !reminderPreview) return;
    try {
      setSendingEmail(true);
      setReminderError('');
      setSendSuccess('');
      
      const courseData = courses.find(c => c.courseId === selectedCourseId || c.id === selectedCourseId);
      const courseName = courseData?.topic || courseData?.courseName || 'Your Course';
      
      const res = await axios.post('/api/send-reminder', {
        studentEmail,
        studentName: user?.firstName || 'Student',
        courseId: selectedCourseId,
        courseName
      });
      
      if (res?.data?.result?.success) {
        setSendSuccess(`Email sent to ${studentEmail}`);
        setTimeout(() => setSendSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Failed to send email', err);
      setReminderError(err?.response?.data?.error || 'Failed to send email. Check API key.');
    } finally {
      setSendingEmail(false);
    }
  };

  return {
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
    streak,
    streakLoading,
    streakError,
    profileCompleteness,
    activeCourse,
    toggleReminder,
    previewReminder,
    sendReminderEmail
  };
}
