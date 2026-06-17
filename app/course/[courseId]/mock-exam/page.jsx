"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { Timer, CheckCircle2, XCircle, AlertCircle, Award, BookOpen, ArrowLeft, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function MockExamPage() {
    const { courseId } = useParams();
    const { user } = useUser();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [started, setStarted] = useState(false);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);
    const [grading, setGrading] = useState(false);
    const [result, setResult] = useState(null);

    const timerRef = useRef(null);

    useEffect(() => {
        if (courseId) {
            fetchExam();
        }
        return () => clearInterval(timerRef.current);
    }, [courseId]);

    // Start timer when exam starts
    useEffect(() => {
        if (started && !result) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmit(true); // Auto-submit on timeout
                        return 0;
                    }
                    setTimeSpent(t => t + 1);
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [started, result]);

    const fetchExam = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/mock-exams?courseId=${courseId}`);
            setExam(res.data);
            setTimeRemaining((res.data.durationMinutes || 15) * 60);
        } catch (error) {
            console.error("Failed to fetch mock exam:", error);
            toast.error(error.response?.data?.error || "Failed to load mock exam");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (questionId, option) => {
        if (result) return; // Prevent changing answers after grading
        setAnswers(prev => ({
            ...prev,
            [questionId]: option
        }));
    };

    const handleStart = () => {
        setStarted(true);
    };

    const handleSubmit = async (isTimeout = false) => {
        if (isTimeout) {
            toast.warning("Time's up! Submitting your exam automatically.");
        }
        
        // Validate that all questions are answered if not timeout
        if (!isTimeout && Object.keys(answers).length < (exam?.questions?.length || 0)) {
            const confirmSubmit = window.confirm("You have unanswered questions. Are you sure you want to submit?");
            if (!confirmSubmit) return;
        }

        try {
            setGrading(true);
            const res = await axios.post('/api/mock-exams', {
                mockExamId: exam.id,
                answers,
                timeSpentSeconds: timeSpent
            });
            setResult(res.data);
            clearInterval(timerRef.current);
            toast.success("Exam submitted successfully!");
        } catch (error) {
            console.error("Grading failed:", error);
            toast.error("Failed to grade exam. Please try again.");
        } finally {
            setGrading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleReset = () => {
        setStarted(false);
        setAnswers({});
        setResult(null);
        setTimeSpent(0);
        if (exam) {
            setTimeRemaining((exam.durationMinutes || 15) * 60);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <RefreshCw className="animate-spin text-indigo-600 w-10 h-10" />
                <p className="text-gray-600 font-medium">Preparing your exam paper...</p>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-gray-800">No mock exam available</p>
                <button onClick={() => router.back()} className="mt-4 inline-flex items-center gap-2 text-indigo-600 font-medium hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>
        );
    }

    // Starting Card / Rules screen
    if (!started) {
        return (
            <div className="max-w-2xl mx-auto mt-8 bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden animate-in fade-in duration-300">
                <div className="p-8 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 text-white text-center">
                    <Award className="w-14 h-14 mx-auto mb-3 animate-bounce" />
                    <h1 className="text-2xl font-black">{exam.title}</h1>
                    <p className="text-indigo-100 mt-2 text-sm">Test your mastery with this time-bound simulated exam</p>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Time Allowed</p>
                            <p className="text-xl font-extrabold text-gray-900 mt-1">{exam.durationMinutes} mins</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Passing Score</p>
                            <p className="text-xl font-extrabold text-gray-900 mt-1">{exam.passingScore}%</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Exam Rules</h2>
                        <ul className="space-y-2.5 text-sm text-gray-600">
                            <li className="flex items-start gap-2.5">
                                <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
                                <span>Once you click <strong>Start Exam</strong>, the countdown timer will begin immediately.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
                                <span>Do not refresh or close the page. Doing so will lose your current progress.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
                                <span>If the timer runs out, your current selections will be submitted automatically.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
                                <span>Your score is calculated instantly. Passing the exam validates your course progress.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={() => router.back()} className="flex-1 py-3.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-50 transition">
                            Back to Course
                        </button>
                        <button onClick={handleStart} className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-lg hover:shadow-xl transition transform active:scale-95">
                            Start Exam
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Result screen
    if (result) {
        return (
            <div className="max-w-3xl mx-auto mt-6 space-y-6 pb-12 animate-in fade-in duration-300">
                {/* Score Summary Block */}
                <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 text-center relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-2 ${result.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                    
                    {result.passed ? (
                        <div className="inline-flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-full mb-3">
                            <Award className="w-12 h-12" />
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-full mb-3">
                            <AlertCircle className="w-12 h-12" />
                        </div>
                    )}

                    <h1 className="text-2xl font-black text-gray-900">
                        {result.passed ? "Congratulations! You Passed!" : "Exam Not Passed"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        You scored {result.score}% on this simulated assessment.
                    </p>

                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Accuracy</p>
                            <p className="text-lg font-black mt-0.5 text-gray-900">{result.score}%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Correct</p>
                            <p className="text-lg font-black mt-0.5 text-gray-900">{result.correctCount} / {result.totalQuestions}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase">Time Spent</p>
                            <p className="text-lg font-black mt-0.5 text-gray-900">{Math.floor(timeSpent / 60)}m {timeSpent % 60}s</p>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center mt-8 max-w-sm mx-auto">
                        <button onClick={handleReset} className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Try Again
                        </button>
                        <button onClick={() => router.push(`/course/${courseId}`)} className="flex-1 py-3 px-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow hover:bg-indigo-700 transition">
                            Back to Course
                        </button>
                    </div>
                </div>

                {/* Review Questions Panel */}
                <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 space-y-6">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-500" /> Assessment Review
                    </h2>
                    
                    <div className="space-y-6 divide-y divide-gray-100">
                        {exam.questions.map((q, idx) => {
                            const studentAns = answers[q.id];
                            const correctAns = result.correctAnswers[q.id];
                            const isCorrect = studentAns && String(studentAns).trim() === String(correctAns).trim();

                            return (
                                <div key={q.id} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            {idx + 1}. {q.question}
                                        </h3>
                                        {isCorrect ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-bold">
                                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        {q.options.map((option) => {
                                            const isStudentSelected = studentAns === option;
                                            const isCorrectOption = correctAns === option;
                                            
                                            let optStyle = "border-gray-200 text-gray-700 bg-white";
                                            if (isCorrectOption) {
                                                optStyle = "border-green-500 text-green-700 bg-green-50/50";
                                            } else if (isStudentSelected && !isCorrect) {
                                                optStyle = "border-red-500 text-red-700 bg-red-50/50";
                                            }

                                            return (
                                                <div key={option} className={`px-4 py-2.5 border rounded-2xl text-xs flex items-center justify-between font-medium ${optStyle}`}>
                                                    <span>{option}</span>
                                                    {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                                    {isStudentSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Active Exam Screen
    return (
        <div className="max-w-3xl mx-auto mt-4 space-y-6 pb-24 animate-in fade-in duration-300">
            {/* Timer Header */}
            <div className="bg-white border border-gray-100 shadow-lg rounded-2xl p-4 sticky top-4 z-30 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-black text-gray-900">{exam.title}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Do not close this page during the exam.</p>
                </div>
                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border text-sm font-extrabold ${timeRemaining < 120 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                    <Timer className="w-4 h-4" />
                    <span>{formatTime(timeRemaining)}</span>
                </div>
            </div>

            {/* Questions Panel */}
            <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 space-y-8">
                {exam.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-900">
                            {idx + 1}. {q.question}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((option) => {
                                const isSelected = answers[q.id] === option;
                                return (
                                    <button
                                        key={option}
                                        onClick={() => handleSelectOption(q.id, option)}
                                        className={`px-5 py-3 border text-left rounded-2xl text-xs font-semibold transition-all transform active:scale-95 ${isSelected ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit Bar */}
            <div className="flex gap-4 pt-4 max-w-sm mx-auto">
                <button
                    onClick={() => handleSubmit(false)}
                    disabled={grading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 transition transform flex items-center justify-center gap-2"
                >
                    {grading ? (
                        <>
                            <RefreshCw className="animate-spin w-4 h-4" /> Grading Paper...
                        </>
                    ) : (
                        "Submit Exam Paper"
                    )}
                </button>
            </div>
        </div>
    );
}
