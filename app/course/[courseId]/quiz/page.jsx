"use client"
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import StepProgress from '../_components/StepProgress'
import QuizCardItem from './_components/QuizCardItem'
import EndScreen from '../_components/EndScreen'
import { useChapter } from '../_context/ChapterContext'
import { useAdaptiveDifficulty } from '../_hooks/useAdaptiveDifficulty'
import { Zap, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function Quiz() {
    const { courseId } = useParams()
    const { user } = useUser()
    const router = useRouter()
    const { currentChapterIndex, chapters } = useChapter()
    const { difficulty, loadCurrentDifficulty } = useAdaptiveDifficulty(
        courseId,
        user?.primaryEmailAddress?.emailAddress
    )

    const [quizData, setQuizData] = useState()
    const [stepCount, setStepCount] = useState(0)
    const [isCorrectAns, setIsCorrectAnswer] = useState(null)
    const [quiz, setQuiz] = useState([])
    const [correctAns, setCorrectAns] = useState()
    const [correctCount, setCorrectCount] = useState(0)
    const [userAnswers, setUserAnswers] = useState({})
    const [topicName, setTopicName] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [retrying, setRetrying] = useState(false)
    const [errorType, setErrorType] = useState(null) // 'quota', 'generating', 'no-content', 'error'

    // Get current chapter ID from context or use course ID as fallback
    const currentChapterId = chapters[currentChapterIndex]?.chapterId || `${courseId}-quiz`

    useEffect(() => {
        GetQuiz()
    }, [courseId, user?.primaryEmailAddress?.emailAddress])

    // Load current difficulty for this chapter
    useEffect(() => {
        if (currentChapterIndex !== undefined && currentChapterId) {
            loadCurrentDifficulty(currentChapterId)
        }
    }, [currentChapterIndex, currentChapterId, loadCurrentDifficulty])

    const GetQuiz = async () => {
        try {
            setLoading(true)
            setError('')
            setErrorType(null)
            
            const result = await axios.post('/api/study-type', {
                courseId: courseId,
                studyType: 'Quiz'
            })

            const data = result.data
            
            // Check for error status (quota exceeded, generation failed)
            if (data?.status === 'Error') {
                setErrorType('quota')
                setError('Quiz generation failed due to AI service limits.')
                toast.error('⚠️ AI Quota Exceeded', {
                    description: 'Quiz generation failed. The AI service daily limit has been reached. Please try again tomorrow.',
                    duration: 8000,
                })
                return
            }
            
            // Check if still generating
            if (data?.status === 'Generating') {
                setErrorType('generating')
                setError('Quiz is still being generated...')
                return
            }
            
            // Check if no content
            if (!data || !data.content) {
                setErrorType('no-content')
                setError('No quiz available yet.')
                return
            }

            const rawContent = data?.content
            const content = typeof rawContent === 'string'
                ? JSON.parse(rawContent)
                : rawContent || {}

            setQuizData(content)
            setQuiz(content?.questions || [])
            setTopicName(content?.topic || '')
            setError('')
            setErrorType(null)
        } catch (err) {
            console.error('Failed to load quiz:', err)
            setErrorType('error')
            setError('Unable to load quiz right now. Please retry in a minute.')
            setQuiz([])
        } finally {
            setLoading(false)
        }
    }

    const retryGeneration = async () => {
        try {
            setRetrying(true)
            await axios.post('/api/study-type-content', {
                chapters: 'Quiz content',
                courseId: courseId,
                type: 'Quiz',
                createdBy: user?.primaryEmailAddress?.emailAddress
            })
            toast.info('Quiz generation started. This may take a minute...')
            setTimeout(() => {
                GetQuiz()
                setRetrying(false)
            }, 5000)
        } catch (err) {
            console.error('Retry failed:', err)
            if (err.response?.status === 429) {
                toast.error('⚠️ Rate Limited', {
                    description: 'Too many requests. Please wait a few minutes before trying again.',
                    duration: 5000,
                })
            } else {
                toast.error('Failed to regenerate quiz')
            }
            setRetrying(false)
        }
    }

    const checkAnswer = (userAnswer, currentQuestion) => {
        // Store user's answer
        setUserAnswers(prev => ({
            ...prev,
            [stepCount]: userAnswer
        }))

        if (userAnswer == currentQuestion?.answer) {
            setIsCorrectAnswer(true)
            setCorrectAns(currentQuestion?.answer)
            // Increment correct count on first correct answer to this question
            if (!userAnswers[stepCount]) {
                setCorrectCount(prev => prev + 1)
            }
            return
        }
        setIsCorrectAnswer(false)
    }

    // Handle adaptive difficulty tracking after quiz submission
    const handleQuizSubmit = async (quizScore) => {
        if (!user || !courseId) return

        const email = user.primaryEmailAddress?.emailAddress
        const topicIdValue = currentChapterId
        const topicNameValue = topicName || chapters[currentChapterIndex]?.name || quizData?.topic || 'Quiz'

        console.log('Quiz submit data:', { courseId, email, topicIdValue, topicNameValue, quizScore })

        if (!email || !topicIdValue || !topicNameValue) {
            console.error('Missing required fields for adaptive performance tracking')
            return
        }

        try {
            const response = await fetch('/api/adaptive-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    studentEmail: email,
                    topicId: topicIdValue,
                    topicName: topicNameValue,
                    score: quizScore,
                    assessmentType: 'quiz'
                })
            })

            const data = await response.json()
            const result = data.result
            if (result) {
                // Difficulty change alerts
                if (result.recommendedDifficulty !== difficulty) {
                    if (result.recommendedDifficulty === 'Hard' && difficulty === 'Medium') {
                        toast.success('🎯 Great progress! Difficulty increased to Hard', {
                            description: "You're ready for more challenging questions",
                            duration: 5000
                        })
                    } else if (result.recommendedDifficulty === 'Easy' && difficulty !== 'Easy') {
                        toast("📚 Let's build foundation. Difficulty adjusted to Easy", {
                            description: 'Focus on mastering the basics first',
                            duration: 5000
                        })
                    }
                }

                // Mastery milestones
                if (['proficient', 'expert'].includes(result.masteryLevel)) {
                    const label = result.masteryLevel === 'expert' ? 'Expert' : 'Proficient'
                    toast.success(`🏅 ${label} mastery unlocked!`, {
                        description: `Great work on ${topicName || 'this topic'} (${result.averageScore}%)`,
                        duration: 5000
                    })
                }

                // Weak topic reminder
                if (result.isWeakTopic) {
                    toast("🧭 Needs review", {
                        description: 'We recommend revisiting this topic to boost mastery.',
                        duration: 5000
                    })
                }
            }
        } catch (error) {
            console.error('Error tracking adaptive performance:', error)
        }
    }

    useEffect(() => {
        setCorrectAns(null)
        setIsCorrectAnswer(null)
    }, [stepCount])

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-500">Loading quiz...</p>
            </div>
        )
    }

    // Error state - AI quota exceeded
    if (errorType === 'quota') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-red-800 mb-2">Quiz Generation Failed</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-500 mb-4">
                        The AI service has reached its daily limit. This typically resets at midnight PST.
                    </p>
                    <Button 
                        onClick={retryGeneration}
                        disabled={retrying}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {retrying ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Retrying...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    // Still generating state
    if (errorType === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md text-center">
                    <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="font-semibold text-lg text-blue-800 mb-2">Generating Quiz</h3>
                    <p className="text-blue-600 mb-4">
                        Our AI is creating your quiz questions. This may take a minute...
                    </p>
                    <Button 
                        onClick={GetQuiz}
                        variant="outline"
                        className="mt-2"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                    </Button>
                </div>
            </div>
        )
    }

    // No content - trigger generation
    if (errorType === 'no-content') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-yellow-800 mb-2">No Quiz Yet</h3>
                    <p className="text-yellow-600 mb-4">
                        Quiz hasn't been generated for this course yet.
                    </p>
                    <Button 
                        onClick={retryGeneration}
                        disabled={retrying}
                        className="bg-yellow-600 hover:bg-yellow-700"
                    >
                        {retrying ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Quiz'
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    // General error
    if (errorType === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">Error Loading Quiz</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button 
                        onClick={GetQuiz}
                        variant="outline"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Difficulty Badge */}
            <div className='flex justify-between items-center mb-6'>
                <h2 className='font-bold text-2xl'>Quiz</h2>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-white ${
                    difficulty === 'Hard' ? 'bg-red-500' :
                    difficulty === 'Medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                }`}>
                    <Zap className='w-4 h-4' />
                    {difficulty || 'Easy'} Level
                </div>
            </div>

            {quiz && quiz.length > 0 ? (
                <>
                    <StepProgress data={quiz} stepCount={stepCount} setStepCount={(value)=>setStepCount(value)} />

                    <div>
                        <QuizCardItem quiz={quiz[stepCount]}
                        userSelectedOption={(v)=>checkAnswer(v,quiz[stepCount])}
                        />
                    </div>

                    {isCorrectAns==false&& (
                        <div className='border p-3 border-red-700 bg-red-200 rounded-lg'>
                            <h2 className='font-bold text-lg text-red-600'>Incorrect</h2>
                            <p className='text-red-600'>Correct Answer is : {correctAns}</p>
                        </div>
                    )}
                   
                    {isCorrectAns==true&& (
                        <div className='border p-3 border-green-700 bg-green-200 rounded-lg'>
                            <h2 className='font-bold text-lg text-green-600'>Correct</h2>
                            <p className='text-green-600'>Your answer is Correct</p>
                        </div>
                    )}
                   
                    <EndScreen 
                        data={quiz} 
                        stepCount={stepCount}
                        courseId={courseId}
                        chapterIndex={currentChapterIndex}
                        correctCount={correctCount}
                        contentType="quiz"
                        onQuizComplete={(quizScore) => handleQuizSubmit(quizScore)}
                    />
                </>
            ) : (
                <div className='text-center py-12'>
                    <p className='text-slate-600 text-lg'>{error || 'Quiz not ready yet. Please try again in a minute.'}</p>
                </div>
            )}
        </div>
    )
}

export default Quiz
