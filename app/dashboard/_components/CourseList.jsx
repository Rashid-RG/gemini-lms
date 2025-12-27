"use client"
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import React, { useContext, useEffect, useState, useCallback, useRef } from 'react'
import CourseCardItem from './CourseCardItem';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { CourseCountContext } from '@/app/_context/CourseCountContext';

// Simple in-memory cache for instant loading
const courseCache = {
    data: null,
    email: null,
    timestamp: 0,
    isValid(email) {
        return this.email === email && 
               this.data && 
               (Date.now() - this.timestamp) < 5 * 60 * 1000; // 5 min cache
    }
};

function CourseList() {

    const {user}=useUser();
    const [courseList,setCourseList]=useState(() => courseCache.data || []);
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState(null);
    const {totalCourse,setTotalCourse}=useContext(CourseCountContext);
    const fetchedRef = useRef(false);
    
    const GetCourseList = useCallback(async (forceRefresh = false, retryCount = 0) => {
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return;
        
        // Use cache if valid and not forcing refresh
        if (!forceRefresh && courseCache.isValid(email)) {
            setCourseList(courseCache.data);
            setTotalCourse(courseCache.data.length);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);

            const result = await axios.post('/api/courses',
                {createdBy: email},
                { 
                    timeout: 30000, // Reduced timeout
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                }
            );
            const courses = result.data.result || [];
            setCourseList(courses);
            setTotalCourse(courses.length);
            
            // Update cache
            courseCache.data = courses;
            courseCache.email = email;
            courseCache.timestamp = Date.now();
        } catch(err) {
            console.error('Error fetching courses:', err);
            
            // Retry once on timeout
            if (err.code === 'ECONNABORTED' && retryCount < 1) {
                return GetCourseList(forceRefresh, retryCount + 1);
            }
            
            setError('Failed to load courses. Click Refresh to try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.primaryEmailAddress?.emailAddress, setTotalCourse]);

    // Initial load - only once
    useEffect(()=>{
        const email = user?.primaryEmailAddress?.emailAddress;
        if(email && !fetchedRef.current) {
            fetchedRef.current = true;
            GetCourseList(false);
        }
    },[user?.primaryEmailAddress?.emailAddress, GetCourseList])

    // Handle course deletion
    const handleCourseDelete = (deletedCourseId) => {
        setCourseList(prev => {
            const updated = prev.filter(c => c.courseId !== deletedCourseId);
            courseCache.data = updated;
            return updated;
        });
        setTotalCourse(prev => Math.max(0, prev - 1));
    };

  return (
    <div className='mt-10'>
        <h2 className='font-bold text-2xl flex justify-between items-center'>Your Study Material 
            <Button variant="outline" 
            onClick={() => GetCourseList(true)}
            disabled={loading}
            className="border-primary text-primary"> <RefreshCw className={loading ? 'animate-spin' : ''}/> {loading ? 'Loading...' : 'Refresh'}</Button>
        </h2>
        
        {error && (
            <div className='mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm'>
                {error}
            </div>
        )}
   
        <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-5'>
            {!loading && courseList?.length > 0 ? courseList?.map((course,index)=>(
               <CourseCardItem 
                 course={course} 
                 key={course?.courseId || index}
                 userEmail={user?.primaryEmailAddress?.emailAddress}
                 onDelete={handleCourseDelete}
               /> 
            ))
            : loading ? [1,2,3,4,5,6].map((item,index)=>(
                <div key={index} className='h-56 w-full bg-slate-200 rounded-lg animate-pulse'>
                </div>
            ))
            : (
                <div className='col-span-3 text-center py-10 text-gray-500'>
                    No courses found. Create one to get started!
                </div>
            )
        }
        </div>
    </div>
  )
}

export default CourseList