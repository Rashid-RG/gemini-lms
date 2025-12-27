"use client"
import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import CourseIntroCard from './_components/CourseIntroCard';
import StudyMaterialSection from './_components/StudyMaterialSection';
import ChapterList from './_components/ChapterList';
import YouTubeVideos from './_components/YouTubeVideos';
import ProgressTracker from './_components/ProgressTracker';
import CourseRating from './_components/CourseRating';

function Course() {
    const {courseId}=useParams();
    const {user}=useUser();
    const [course,setCourse]=useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(()=>{
        if(courseId) {
            GetCourse();
        }
    },[courseId])
    
    const GetCourse=useCallback(async()=>{
        try {
            setLoading(true);
            setError(null);
            const result=await axios.get('/api/courses?courseId='+courseId, {
                validateStatus: () => true
            });
            
            if (!result.data.result) {
                setError('Course data not found');
                console.error('Course not found for courseId:', courseId, 'Response:', result.data);
                return;
            }
            
            setCourse(result.data.result);
        } catch(error) {
            console.error('Error fetching course:', error);
            setError(error.message || 'Failed to load course');
        } finally {
            setLoading(false);
        }
    }, [courseId])

    if(loading)
    {
        return (
            <div className='p-10'>
                <div className='h-32 bg-slate-200 rounded-lg animate-pulse'></div>
            </div>
        );
    }
    
    if(error || !course)
    {
        return (
            <div className='p-10 text-center'>
                <div className='text-red-500 font-semibold mb-2'>Error Loading Course</div>
                <div className='text-gray-500 text-sm'>{error || 'Course not found'}</div>
                {!course?.courseLayout && (
                    <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm'>
                        <p className='font-semibold mb-1'>Course is still being generated</p>
                        <p>This can take a few moments. Please refresh the page in a moment.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className='mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
                        >
                            Refresh Now
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    if (!course.courseLayout) {
        return (
            <div className='p-10 text-center'>
                <div className='text-yellow-600 font-semibold mb-2'>Course Data Loading</div>
                <div className='text-gray-500 text-sm mb-4'>The course content is being prepared. Please wait...</div>
                <button 
                    onClick={() => GetCourse()}
                    className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
                >
                    Refresh
                </button>
            </div>
        );
    }

  return (
    <div>
     
        <div className=''> 
        {/* Course Intro  */}
            <CourseIntroCard course={course} />
        
        {/* Progress Tracker - Real-time performance tracking */}
            {user && (
                <div className="mt-8">
                    <ProgressTracker 
                        courseId={courseId} 
                        studentEmail={user?.primaryEmailAddress?.emailAddress}
                        course={course}
                    />
                </div>
            )}
        
        {/* YouTube Videos Section */}
            {course?.videos && <YouTubeVideos videos={course.videos} course={course} />}
        {/* Study Materials Options  */}
            <StudyMaterialSection  courseId={courseId} course={course} />
        {/* Chapter List  */}
            <ChapterList course={course} />
        
        {/* Course Rating & Reviews */}
            {user && (
                <div className="mt-8">
                    <CourseRating courseId={courseId} courseTopic={course?.topic} />
                </div>
            )}
        </div>
        
    </div>
  )
}

export default Course