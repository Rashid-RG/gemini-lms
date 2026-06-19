import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Custom hook to manage Admin Dashboard page logic and permissions
 */
export function useAdminDashboard() {
    const { user, isLoaded } = useUser();
    const [stats, setStats] = useState(null);
    const [recentCourses, setRecentCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchDashboardData();
        }
    }, [isLoaded, isAdmin]);

    const fetchDashboardData = async () => {
        try {
            setRefreshing(true);
            const response = await axios.get('/api/admin/dashboard');
            setStats(response.data.stats);
            setRecentCourses(response.data.recentCourses || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load admin dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    return {
        user,
        isLoaded,
        stats,
        recentCourses,
        loading,
        refreshing,
        isAdmin,
        fetchDashboardData
    };
}
