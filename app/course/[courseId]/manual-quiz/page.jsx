"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

function ManualQuizPage() {
    const { courseId } = useParams()
    const router = useRouter()
    const { user } = useUser()
    
    const [course, setCourse] = useState(null)
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [userAnswers, setUserAnswers] = useState({})
    const [showResults, setShowResults] = useState(false)
    const [quizCompleted, setQuizCompleted] = useState(false)
    const [correctCount, setCorrectCount] = useState(0)

    useEffect(() => {
        GetCourseData()
    }, [courseId])

    const GetCourseData = async () => {
        try {
            setLoading(true)
            setError('')
            
            const result = await axios.get(`/api/courses?courseId=${courseId}`)
            const courseData = result.data.result
            
            if (!courseData) {
                setError('Course not found')
                return
            }

            setCourse(courseData)
            
            // Fetch quizzes from STUDY_TYPE_CONTENT_TABLE
            const quizResult = await axios.post('/api/study-type', {
                courseId: courseId,
                studyType: 'Quiz'
            })
            const quizRow = quizResult.data
            let quizzesData = []
            if (quizRow && quizRow.content) {
                quizzesData = typeof quizRow.content === 'string'
                    ? JSON.parse(quizRow.content)
                    : quizRow.content
            }
            
            if (!quizzesData || quizzesData.length === 0) {
                setError('No quizzes available for this course')
            } else {
                setQuizzes(quizzesData)
            }
        } catch (err) {
            console.error('Error loading course:', err)
            setError('Failed to load course data')
        } finally {
            setLoading(false)
        }
    }

    const handleAnswerSelect = (optionIndex) => {
        if (showResults) return // Don't allow changes after submission
        
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }))
        
        // Auto-check answer immediately
        checkAnswer(optionIndex)
    }

    const checkAnswer = (selectedOptionIndex) => {
        const quiz = quizzes[currentQuestion]
        const isCorrect = selectedOptionIndex === quiz.correctOption
        
        if (isCorrect) {
            toast.success('✅ Correct!', {
                description: quiz.explanation || 'Great job!',
                duration: 2000,
            })
        } else {
            toast.error('❌ Incorrect', {
                description: `Correct answer: ${quiz.options[quiz.correctOption]}`,
                duration: 3000,
            })
        }

        setShowResults(true)
        
        // Only count if first attempt
        if (!userAnswers[currentQuestion] && isCorrect) {
            setCorrectCount(prev => prev + 1)
        }
    }

    const handleNextQuestion = () => {
        if (currentQuestion < quizzes.length - 1) {
            setCurrentQuestion(prev => prev + 1)
            setShowResults(false)
        } else {
            finishQuiz()
        }
    }

    const finishQuiz = () => {
        setQuizCompleted(true)
        const score = Math.round((correctCount / quizzes.length) * 100)
        
        // Save score to database
        saveQuizScore(score)
    }

    const saveQuizScore = async (score) => {
        try {
            if (!user?.primaryEmailAddress?.emailAddress) return
            
            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user.primaryEmailAddress.emailAddress,
                quizScores: {
                    [`manual_quiz_${courseId}`]: score
                }
            })
        } catch (err) {
            console.error('Error saving quiz score:', err)
        }
    }

    const handleRestart = () => {
        setCurrentQuestion(0)
        setUserAnswers({})
        setShowResults(false)
        setQuizCompleted(false)
        setCorrectCount(0)
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Loading Quiz...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Quiz</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => router.back()} variant="outline" className="mr-2">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                    <Button onClick={GetCourseData}>Retry</Button>
                </div>
            </div>
        )
    }

    // Quiz completed
    if (quizCompleted) {
        const score = Math.round((correctCount / quizzes.length) * 100)
        const passed = score >= 70
        
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-12">
                <div className="flex flex-col gap-6 w-full max-w-2xl">
                    <div className={`bg-white rounded-lg shadow-2xl p-12 text-center ${
                        passed ? 'border-t-4 border-green-500' : 'border-t-4 border-orange-500'
                    }`}>
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                            passed ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                            <span className={`text-4xl font-bold ${
                                passed ? 'text-green-600' : 'text-orange-600'
                            }`}>{score}%</span>
                        </div>
                        
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {passed ? '🎉 Excellent!' : '📚 Good Effort!'}
                        </h1>
                        
                        <p className="text-gray-600 mb-6 text-lg">
                            You got <span className="font-bold text-primary">{correctCount}</span> out of <span className="font-bold">{quizzes.length}</span> questions correct
                        </p>
                        
                        {passed ? (
                            <p className="text-green-600 font-semibold mb-6">✓ You passed the quiz! Great job!</p>
                        ) : (
                            <p className="text-orange-600 font-semibold mb-6">Try again to improve your score</p>
                        )}
                        
                        <div className="flex gap-3 max-w-sm mx-auto">
                            <Button onClick={handleRestart} className="flex-1">
                                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                            </Button>
                            <Button onClick={() => router.back()} variant="outline" className="flex-1">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course
                            </Button>
                        </div>
                    </div>

                    {/* Review Section */}
                    <div className="bg-white rounded-lg shadow-2xl p-8 text-left border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
                            📝 Quiz Review & Summary
                        </h3>
                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                            {quizzes.map((q, idx) => {
                                const studentAns = userAnswers[idx];
                                const isCorrect = studentAns === q.correctOption;

                                return (
                                    <div key={idx} className={`p-4 rounded-xl border ${
                                        isCorrect 
                                            ? 'bg-green-50/40 border-green-100' 
                                            : 'bg-red-50/40 border-red-100'
                                    }`}>
                                        <p className="font-semibold text-slate-900 mb-2">
                                            Question {idx + 1}: {q.question}
                                        </p>
                                        
                                        {/* Options */}
                                        {q.options && Array.isArray(q.options) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                                {q.options.map((opt, oIdx) => {
                                                    const isSelectedOpt = studentAns === oIdx;
                                                    const isCorrectOpt = q.correctOption === oIdx;
                                                    
                                                    let optClass = "p-2 rounded-lg border text-sm text-slate-700 bg-white border-slate-200";
                                                    if (isCorrectOpt) {
                                                        optClass = "p-2 rounded-lg border text-sm font-semibold bg-green-100/70 border-green-300 text-green-800";
                                                    } else if (isSelectedOpt && !isCorrect) {
                                                        optClass = "p-2 rounded-lg border text-sm font-semibold bg-red-100/70 border-red-300 text-red-800";
                                                    }

                                                    return (
                                                        <div key={oIdx} className={optClass}>
                                                            {opt}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-xs font-bold mt-2">
                                            <span className={`px-2.5 py-1 rounded-full ${
                                                isCorrect 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                Your Answer: {q.options?.[studentAns] || 'Unanswered'}
                                            </span>
                                            {!isCorrect && (
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                                    Correct Answer: {q.options?.[q.correctOption]}
                                                </span>
                                            )}
                                        </div>

                                        {q.explanation && (
                                            <p className="text-xs text-slate-500 italic mt-3 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/40">
                                                <strong>Explanation:</strong> {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Quiz in progress
    if (quizzes.length > 0) {
        const quiz = quizzes[currentQuestion]
        const userSelectedOption = userAnswers[currentQuestion]
        const isCorrect = userSelectedOption === quiz.correctOption
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Button 
                            variant="ghost" 
                            onClick={() => router.back()}
                            className="mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Quiz: {course?.topic || 'Course'}
                                </h1>
                                <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                                    Question {currentQuestion + 1} of {quizzes.length}
                                </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestion + 1) / quizzes.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        {/* Difficulty Badge */}
                        <div className="mb-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                quiz.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                quiz.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {quiz.difficulty || 'Medium'} Difficulty
                            </span>
                        </div>

                        {/* Question */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {quiz.question}
                        </h2>

                        {/* Options */}
                        <div className="space-y-3 mb-8">
                            {quiz.options?.map((option, idx) => {
                                const isSelected = userSelectedOption === idx
                                const isCorrectOption = idx === quiz.correctOption
                                let buttonClass = 'border-2 border-gray-200 hover:border-primary hover:bg-primary/5'
                                
                                if (showResults) {
                                    if (isCorrectOption) {
                                        buttonClass = 'border-2 border-green-500 bg-green-50'
                                    } else if (isSelected && !isCorrect) {
                                        buttonClass = 'border-2 border-red-500 bg-red-50'
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(idx)}
                                        disabled={showResults}
                                        className={`w-full text-left p-4 rounded-lg transition-all ${buttonClass} ${
                                            showResults ? 'cursor-default' : 'cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                                                isSelected && showResults ? (isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-red-500 bg-red-500 text-white') :
                                                isCorrectOption && showResults ? 'border-green-500 bg-green-500 text-white' :
                                                isSelected ? 'border-primary bg-primary text-white' :
                                                'border-gray-300 text-gray-600'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-lg text-gray-900 font-medium">{option}</span>
                                            {showResults && isCorrectOption && (
                                                <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                                            )}
                                            {showResults && isSelected && !isCorrect && (
                                                <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Result Feedback */}
                        {showResults && (
                            <div className={`p-4 rounded-lg mb-8 ${
                                isCorrect 
                                    ? 'bg-green-50 border border-green-200' 
                                    : 'bg-red-50 border border-red-200'
                            }`}>
                                <p className={`font-semibold mb-2 ${
                                    isCorrect ? 'text-green-700' : 'text-red-700'
                                }`}>
                                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                                </p>
                                {quiz.explanation && (
                                    <p className="text-gray-700 text-sm">
                                        <span className="font-semibold">Explanation: </span>
                                        {quiz.explanation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            <Button
                                onClick={handleNextQuestion}
                                disabled={!showResults}
                                className="flex-1 py-3 text-base"
                            >
                                {currentQuestion === quizzes.length - 1 ? 'Finish Quiz' : 'Next Question'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return null
}

export default ManualQuizPage
