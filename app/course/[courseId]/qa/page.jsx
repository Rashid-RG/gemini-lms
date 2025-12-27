"use client"
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, HelpCircle, Eye, EyeOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

function QAPage() {
    const { courseId } = useParams()
    const { user } = useUser()
    const router = useRouter()

    const [qaData, setQAData] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showAnswer, setShowAnswer] = useState(false)
    const [userAnswer, setUserAnswer] = useState('')
    const [isCorrect, setIsCorrect] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [errorType, setErrorType] = useState(null)
    const [retrying, setRetrying] = useState(false)
    const [score, setScore] = useState(0)
    const [answeredQuestions, setAnsweredQuestions] = useState({})
    const [completed, setCompleted] = useState(false)

    useEffect(() => {
        GetQA()
    }, [courseId])

    const GetQA = async () => {
        try {
            setLoading(true)
            setError('')
            setErrorType(null)
            
            const result = await axios.post('/api/study-type', {
                courseId: courseId,
                studyType: 'qa'
            })

            const data = result.data
            
            // Check for error status (quota exceeded, generation failed)
            if (data?.status === 'Error') {
                setErrorType('quota')
                setError('Q&A generation failed due to AI service limits.')
                toast.error('⚠️ AI Quota Exceeded', {
                    description: 'Q&A generation failed. The AI service daily limit has been reached. Please try again tomorrow.',
                    duration: 8000,
                })
                return
            }
            
            // Check if still generating
            if (data?.status === 'Generating') {
                setErrorType('generating')
                setError('Q&A is still being generated...')
                return
            }
            
            // Check if no content
            if (!data || !data.content) {
                setErrorType('no-content')
                setError('No Q&A content available yet.')
                return
            }

            const rawContent = data?.content
            const content = typeof rawContent === 'string'
                ? JSON.parse(rawContent)
                : rawContent || {}

            setQAData(content)
            // Handle different response formats
            const questionList = content?.questions || content?.qa || []
            setQuestions(questionList)
            setError('')
            setErrorType(null)
        } catch (err) {
            console.error('Failed to load Q&A:', err)
            setErrorType('error')
            setError('Unable to load Q&A content. Please try again later.')
            setQuestions([])
        } finally {
            setLoading(false)
        }
    }

    const retryGeneration = async () => {
        try {
            setRetrying(true)
            await axios.post('/api/study-type-content', {
                chapters: 'Q&A content',
                courseId: courseId,
                type: 'qa',
                createdBy: user?.primaryEmailAddress?.emailAddress
            })
            toast.info('Q&A generation started. This may take a minute...')
            setTimeout(() => {
                GetQA()
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
                toast.error('Failed to regenerate Q&A')
            }
            setRetrying(false)
        }
    }

    const currentQuestion = questions[currentIndex]

    const handleCheckAnswer = () => {
        if (!userAnswer.trim()) return
        
        const correctAnswer = currentQuestion?.answer || currentQuestion?.back || ''
        const userAns = userAnswer.trim().toLowerCase()
        const correctAns = correctAnswer.toLowerCase()
        
        // Check if user answer contains key words from correct answer
        const keyWords = correctAns.split(' ').filter(w => w.length > 3)
        const matchCount = keyWords.filter(word => userAns.includes(word)).length
        const matchRatio = keyWords.length > 0 ? matchCount / keyWords.length : 0
        
        const correct = matchRatio >= 0.5 || userAns === correctAns
        setIsCorrect(correct)
        setShowAnswer(true)
        
        if (!answeredQuestions[currentIndex]) {
            setAnsweredQuestions(prev => ({ ...prev, [currentIndex]: true }))
            if (correct) {
                setScore(prev => prev + 1)
            }
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            resetQuestion()
        } else {
            setCompleted(true)
        }
    }

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            resetQuestion()
        }
    }

    const resetQuestion = () => {
        setUserAnswer('')
        setShowAnswer(false)
        setIsCorrect(null)
    }

    const handleRestart = () => {
        setCurrentIndex(0)
        setScore(0)
        setAnsweredQuestions({})
        setCompleted(false)
        resetQuestion()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-lg">Loading Q&A...</span>
            </div>
        )
    }

    // Error state - AI quota exceeded
    if (errorType === 'quota') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-red-800 mb-2">Q&A Generation Failed</h3>
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
                    <h3 className="font-semibold text-lg text-blue-800 mb-2">Generating Q&A</h3>
                    <p className="text-blue-600 mb-4">
                        Our AI is creating your Q&A content. This may take a minute...
                    </p>
                    <Button 
                        onClick={GetQA}
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
                    <h3 className="font-semibold text-lg text-yellow-800 mb-2">No Q&A Yet</h3>
                    <p className="text-yellow-600 mb-4">
                        Q&A content hasn't been generated for this course yet.
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
                            'Generate Q&A'
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    // General error
    if (errorType === 'error' || error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Q&A</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={GetQA}>Try Again</Button>
            </div>
        )
    }

    if (!questions || questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                <HelpCircle className="w-16 h-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">No Q&A Available</h2>
                <p className="text-gray-600 mb-4">Q&A content is being generated. Please check back later.</p>
                <div className="flex gap-3">
                    <Button onClick={retryGeneration} disabled={retrying}>
                        {retrying ? 'Generating...' : 'Generate Q&A'}
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        )
    }

    if (completed) {
        const percentage = Math.round((score / questions.length) * 100)
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
                        percentage >= 70 ? 'bg-green-100' : percentage >= 40 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                        <span className={`text-4xl font-bold ${
                            percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{percentage}%</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Q&A Complete!</h2>
                    <p className="text-gray-600 mb-6">
                        You got {score} out of {questions.length} questions correct.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={handleRestart} variant="outline">
                            Try Again
                        </Button>
                        <Button onClick={() => router.back()}>
                            Back to Course
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
            {/* Header */}
            <div className="max-w-3xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <Button 
                        onClick={() => router.back()} 
                        variant="outline" 
                        size="sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="text-sm text-gray-600">
                        Question {currentIndex + 1} of {questions.length}
                    </div>
                    <div className="text-sm font-medium text-primary">
                        Score: {score}/{Object.keys(answeredQuestions).length}
                    </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    {/* Question */}
                    <div className="mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <HelpCircle className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800">
                                {currentQuestion?.question || currentQuestion?.front || 'Question not available'}
                            </h3>
                        </div>
                    </div>

                    {/* Answer Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Answer:
                        </label>
                        <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                            rows={4}
                            disabled={showAnswer}
                        />
                    </div>

                    {/* Check Answer Button */}
                    {!showAnswer && (
                        <div className="flex gap-3">
                            <Button 
                                onClick={handleCheckAnswer}
                                disabled={!userAnswer.trim()}
                                className="flex-1"
                            >
                                Check Answer
                            </Button>
                            <Button 
                                onClick={() => setShowAnswer(true)}
                                variant="outline"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Show Answer
                            </Button>
                        </div>
                    )}

                    {/* Answer Result */}
                    {showAnswer && (
                        <div className="space-y-4">
                            {isCorrect !== null && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                                    isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                    {isCorrect ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="font-medium">Correct!</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5" />
                                            <span className="font-medium">Not quite right</span>
                                        </>
                                    )}
                                </div>
                            )}
                            
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Correct Answer:
                                </h4>
                                <p className="text-blue-700">
                                    {currentQuestion?.answer || currentQuestion?.back || 'Answer not available'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <Button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>
                    <Button onClick={handleNext}>
                        {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default QAPage
