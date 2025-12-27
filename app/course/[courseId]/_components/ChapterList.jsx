import React, { useState, useEffect, useCallback } from 'react'
import { useChapter } from '../_context/ChapterContext'
import { useUser } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Shared cache object with ProgressTracker
const chapterCache = {
    data: null,
    timestamp: 0,
    isLoading: false,
    CACHE_DURATION: 60000 // Cache for 60 seconds to reduce API calls
}

function ChapterList({course}) {
    const CHAPTERS=course?.courseLayout?.chapters
    const { currentChapterIndex, setCurrentChapterIndex } = useChapter()
    const { user } = useUser()
    const { courseId } = useParams()
    const [completedChapters, setCompletedChapters] = useState([])
    const [marking, setMarking] = useState(null)
    const retryCountRef = React.useRef(0)
    const MAX_RETRIES = 3

    useEffect(() => {
        if (user && courseId) {
            fetchCompletedChapters()
        }
    }, [user, courseId])

    const fetchCompletedChapters = useCallback(async (isRetry = false) => {
        const now = Date.now()
        
        // Use cache if valid and not a retry - show stale data immediately
        if (chapterCache.data && (now - chapterCache.timestamp) < chapterCache.CACHE_DURATION) {
            const chapters = Array.isArray(chapterCache.data)
                ? chapterCache.data
                : JSON.parse(chapterCache.data || '[]')
            setCompletedChapters(chapters)
            if (!isRetry) return // Only skip fetch if not a retry and cache is valid
        }
        
        // Prevent concurrent requests
        if (chapterCache.isLoading && !isRetry) {
            return
        }

        try {
            chapterCache.isLoading = true
            const res = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`,
                { timeout: 30000 } // Increased to 30s for slow DB connections
            )
            const progress = res.data.result
            const chapters = Array.isArray(progress.completedChapters)
                ? progress.completedChapters
                : JSON.parse(progress.completedChapters || '[]')
            setCompletedChapters(chapters)
            chapterCache.data = chapters
            chapterCache.timestamp = now
            retryCountRef.current = 0
        } catch (error) {
            // Silently handle errors - use cached data if available
            if (chapterCache.data) {
                console.log('Using cached data due to fetch error')
            }
            
            // Retry logic for timeout errors with exponential backoff
            if (error.code === 'ECONNABORTED' && retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1
                const delay = 2000 * retryCountRef.current // 2s, 4s, 6s
                console.log(`Retrying chapter fetch (attempt ${retryCountRef.current}) in ${delay}ms...`)
                setTimeout(() => fetchCompletedChapters(true), delay)
            }
        } finally {
            chapterCache.isLoading = false
        }
    }, [courseId, user?.primaryEmailAddress?.emailAddress])

    const handleMarkComplete = async (e, chapterIndex, retryCount = 0) => {
        e.stopPropagation()
        if (!user || !courseId || marking === chapterIndex) return

        try {
            setMarking(chapterIndex)
            const res = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`,
                { timeout: 30000 }
            )
            const progress = res.data.result
            let chapters = Array.isArray(progress.completedChapters)
                ? progress.completedChapters
                : JSON.parse(progress.completedChapters || '[]')

            if (!chapters.includes(chapterIndex)) {
                chapters.push(chapterIndex)
            }

            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters: chapters,
                quizScores: progress.quizScores || {},
                assignmentScores: progress.assignmentScores || {},
                mcqScores: progress.mcqScores || {},
                progressPercentage: Math.round((chapters.length / progress.totalChapters) * 100),
            }, { timeout: 30000 })

            setCompletedChapters(chapters)
            chapterCache.data = chapters // Update cache with new data
            chapterCache.timestamp = Date.now()
            
            // Show success toast
            toast.success(`Chapter ${chapterIndex + 1} Completed! 🎉`, {
                description: `Great job! You've completed chapter ${chapterIndex + 1}. Progress updated.`,
                duration: 4000,
                position: 'top-center'
            });
        } catch (error) {
            console.error('Error marking chapter complete:', error)
            
            // Retry logic for timeout errors with exponential backoff
            if (error.code === 'ECONNABORTED' && retryCount < MAX_RETRIES) {
                const delay = 2000 * (retryCount + 1)
                console.log(`Retrying mark complete (attempt ${retryCount + 1}) in ${delay}ms...`)
                setTimeout(() => {
                    const syntheticEvent = { stopPropagation: () => {} }
                    handleMarkComplete(syntheticEvent, chapterIndex, retryCount + 1)
                }, delay)
            } else if (error.code !== 'ECONNABORTED') {
                // Only show error for non-timeout errors
                toast.error('Failed to Mark Chapter Complete', {
                    description: 'Please try again or contact support.',
                    duration: 4000,
                    position: 'top-center'
                });
            }
        } finally {
            setMarking(null)
        }
    }

  return (
    <div className='mt-5'>
        <h2 className='font-medium text-xl'>Chapters</h2>

        <div className='mt-3'>
            {CHAPTERS?.map((chapter,index)=>{
                // Check if chapter is locked: unlock chapter 0 by default, others need previous chapter completed
                const isLocked = index > 0 && !completedChapters.includes(index - 1);
                const isPreviousCompleted = index === 0 || completedChapters.includes(index - 1);
                const isCompleted = completedChapters.includes(index);

                return (
                <div 
                    key={index} 
                    onClick={() => !isLocked && setCurrentChapterIndex(index)}
                    className={`flex gap-5 items-center p-4 border shadow-md mb-2 rounded-lg transition-all ${
                        isLocked 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300' 
                            : `cursor-pointer ${currentChapterIndex === index ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`
                    } ${isCompleted ? 'border-green-500 bg-green-50' : ''}`}
                    title={isLocked ? 'Complete the previous chapter to unlock this one' : ''}
                >
                    <h2 className='text-2xl'>
                        {isLocked ? '🔒' : chapter?.emoji}
                    </h2>
                    <div className='flex-1'>
                        <h2 className='font-medium'>{chapter?.chapter_title||chapter?.chapterTitle}</h2>
                        <p className='text-gray-400 text-sm'>{chapter?.summary}</p>
                        {isLocked && (
                            <p className='text-yellow-600 text-xs font-semibold mt-1'>
                                ⚠️ Complete Chapter {index} to unlock
                            </p>
                        )}
                    </div>
                    <div className='flex gap-2 items-center'>
                        {isCompleted ? (
                            <div className='flex items-center gap-2'>
                                <span className='text-green-600 text-sm font-semibold'>✓ Complete</span>
                            </div>
                        ) : isLocked ? (
                            <div className='flex items-center gap-2'>
                                <span className='text-gray-500 text-sm font-semibold'>🔒 Locked</span>
                            </div>
                        ) : (
                            <Button
                                onClick={(e) => handleMarkComplete(e, index)}
                                disabled={marking === index || !user}
                                size="sm"
                                className='bg-green-600 hover:bg-green-700 text-white text-xs'
                            >
                                {marking === index ? 'Marking...' : 'Mark Done'}
                            </Button>
                        )}
                        {currentChapterIndex === index && !isLocked && (
                            <div className='text-blue-500 font-bold text-sm'>📍 Selected</div>
                        )}
                    </div>
                </div>
                );
            })}
        </div>
    </div>
  )
}

export default ChapterList