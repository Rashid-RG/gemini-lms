import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Award, CheckCircle } from 'lucide-react'

function EndScreen({data, stepCount, courseId: propCourseId, chapterIndex, onChapterComplete, correctCount, contentType = 'chapter', onQuizComplete, userAnswers, chapterStartTime}) {
    const route = useRouter();
    const params = useParams();
    const { user } = useUser();
    const [marking, setMarking] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(30);

    useEffect(() => {
        if (contentType !== 'chapter' || !chapterStartTime) {
            setSecondsRemaining(0);
            return;
        }

        const updateCountdown = () => {
            const elapsed = Math.floor((Date.now() - chapterStartTime) / 1000);
            const remaining = Math.max(0, 30 - elapsed);
            setSecondsRemaining(remaining);
        };

        // Run immediately
        updateCountdown();

        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [chapterStartTime, contentType]);
    
    const courseId = propCourseId || params?.courseId;
    
    // Calculate quiz score
    const calculateScore = () => {
        if (!data || data.length === 0) return 0;
        return Math.round((correctCount / data.length) * 100);
    };
    
    const quizScore = correctCount !== undefined ? calculateScore() : 0;

    const markChapterComplete = async () => {
        if (!user || !courseId || chapterIndex === undefined) return;

        try {
            setMarking(true);
            
            // Get current progress
            const progressRes = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            );

            const currentProgress = progressRes.data.result;
            let completedChapters = Array.isArray(currentProgress.completedChapters)
                ? currentProgress.completedChapters
                : JSON.parse(currentProgress.completedChapters || '[]');

            // Use chapterIndex directly (should come from context)
            if (!completedChapters.includes(chapterIndex)) {
                completedChapters.push(chapterIndex);
            }

            // Initialize score objects
            let quizScores = currentProgress.quizScores || {};
            if (typeof quizScores === 'string') {
                quizScores = JSON.parse(quizScores || '{}');
            }
            
            let assignmentScores = currentProgress.assignmentScores || {};
            if (typeof assignmentScores === 'string') {
                assignmentScores = JSON.parse(assignmentScores || '{}');
            }

            let mcqScores = currentProgress.mcqScores || {};
            if (typeof mcqScores === 'string') {
                mcqScores = JSON.parse(mcqScores || '{}');
            }

            // Store appropriate score based on content type
            if (contentType === 'quiz' && correctCount !== undefined && data && data.length > 0) {
                quizScores[`chapter_${chapterIndex}`] = quizScore;
            }
            
            if (contentType === 'mcq' && correctCount !== undefined && data && data.length > 0) {
                mcqScores[`chapter_${chapterIndex}`] = quizScore;
            }

            // Update progress
            const updateRes = await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters,
                quizScores: quizScores,
                assignmentScores: assignmentScores,
                mcqScores: mcqScores,
                progressPercentage: Math.round((completedChapters.length / currentProgress.totalChapters) * 100),
            });

            console.log('Completion marked:', updateRes.data);
            
            // Show success toast with appropriate message
            const typeLabel = contentType === 'mcq' ? `MCQ` : 
                            contentType === 'quiz' ? `Quiz` : 
                            `Chapter ${chapterIndex + 1}`;
            const scoreText = (contentType === 'quiz' || contentType === 'mcq') && quizScore > 0 ? ` Score: ${quizScore}%` : '';
            
            toast.success(`${typeLabel} Completed! 🎉${scoreText}`, {
                description: `Great job! You've completed ${typeLabel.toLowerCase()}.${scoreText ? ' Progress updated.' : ''}`,
                duration: 4000,
                position: 'top-center'
            });
            
            // Call parent callback if provided
            if (onChapterComplete) {
                onChapterComplete();
            }

            // Call quiz-specific callback after marking completion
            if (onQuizComplete && (contentType === 'quiz' || contentType === 'mcq')) {
                onQuizComplete(quizScore);
            }
        } catch (error) {
            console.error('Error marking completion:', error);
            toast.error('Failed to Mark Completion', {
                description: 'Please try again or contact support.',
                duration: 4000,
                position: 'top-center'
            });
        } finally {
            setMarking(false);
        }
    };

    return (
        <div className="w-full">
            {data?.length == stepCount && (
                <div className="flex flex-col gap-8 w-full">
                    <div className='flex items-center gap-10 flex-col justify-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-8 text-center'>
                        <div>
                            <h2 className='text-3xl font-bold text-green-600 mb-3'>✓ Content Completed!</h2>
                            <p className='text-slate-600 text-lg mb-6'>
                                You've finished all the {
                                    contentType === 'quiz' ? 'quiz questions' : 
                                    contentType === 'mcq' ? 'MCQ questions' : 
                                    'reading content'
                                } in this section.
                            </p>
                            
                            {(contentType === 'quiz' || contentType === 'mcq') && (
                                <div className='mb-6 inline-block bg-white rounded-lg p-4 border-2 border-green-300 shadow-md text-center'>
                                    <div className='flex items-center gap-2 justify-center mb-2'>
                                        <Award className='w-6 h-6 text-blue-600' />
                                        <p className='text-sm font-medium text-slate-600'>{contentType === 'mcq' ? 'MCQ' : 'Quiz'} Score</p>
                                    </div>
                                    <div className='text-4xl font-bold text-blue-600'>{quizScore}%</div>
                                    <p className='text-xs text-slate-500 mt-1'>{correctCount} out of {data.length} correct</p>
                                </div>
                            )}
                        </div>
                        
                        <div className='flex gap-4 justify-center'>
                            <Button 
                                onClick={markChapterComplete}
                                disabled={marking || !user || (contentType === 'chapter' && secondsRemaining > 0)}
                                className='bg-green-600 hover:bg-green-700 text-white'
                            >
                                <CheckCircle className='w-4 h-4 mr-2' />
                                {marking ? 'Marking...' : 
                                    (contentType === 'chapter' && secondsRemaining > 0) ? `Read Content (${secondsRemaining}s)` :
                                    contentType === 'mcq' ? 'Mark MCQ Completed' :
                                    contentType === 'quiz' ? 'Mark Quiz Completed' : 
                                    'Mark Chapter Complete'
                                }
                            </Button>
                            <Button 
                                onClick={() => route.back()}
                                variant="outline"
                            >
                                Go to Course Page
                            </Button>
                        </div>
                    </div>

                    {/* Quiz Review Section */}
                    {(contentType === 'quiz' || contentType === 'mcq') && userAnswers && (
                        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-6 md:p-8 text-left">
                            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
                                📝 Quiz Review & Answer Key
                            </h3>
                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                {data.map((q, idx) => {
                                    const studentAns = userAnswers[idx];
                                    const correctAns = q.answer || (q.options && q.options[q.correctOption]);
                                    const isCorrect = String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase() || 
                                                      (q.options && typeof studentAns === 'number' && studentAns === q.correctOption);

                                    return (
                                        <div key={idx} className={`p-5 rounded-xl border-2 transition ${
                                            isCorrect 
                                                ? 'bg-green-50/20 border-green-200' 
                                                : 'bg-red-50/20 border-red-200'
                                        }`}>
                                            <p className="font-bold text-slate-900 text-lg mb-3">
                                                Question {idx + 1}: {q.question}
                                            </p>
                                            
                                            {/* Options */}
                                            {q.options && Array.isArray(q.options) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                    {q.options.map((opt, oIdx) => {
                                                        const isSelectedOpt = String(opt) === String(studentAns) || (typeof studentAns === 'number' && studentAns === oIdx);
                                                        const isCorrectOpt = String(opt) === String(correctAns) || (q.correctOption === oIdx);
                                                        
                                                        let optClass = "p-3 rounded-lg border text-sm text-slate-700 bg-white border-slate-200 transition";
                                                        if (isCorrectOpt) {
                                                            optClass = "p-3 rounded-lg border-2 text-sm font-semibold bg-green-100/60 border-green-400 text-green-800";
                                                        } else if (isSelectedOpt && !isCorrect) {
                                                            optClass = "p-3 rounded-lg border-2 text-sm font-semibold bg-red-100/60 border-red-400 text-red-800";
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
                                                <span className={`px-3 py-1.5 rounded-full ${
                                                    isCorrect 
                                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                                        : 'bg-red-100 text-red-800 border border-red-200'
                                                }`}>
                                                    Your Answer: {typeof studentAns === 'number' && q.options ? q.options[studentAns] : studentAns || 'Unanswered'}
                                                </span>
                                                {!isCorrect && (
                                                    <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        Correct Answer: {correctAns}
                                                    </span>
                                                )}
                                            </div>

                                            {q.explanation && (
                                                <p className="text-xs text-slate-600 italic mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200/50 leading-relaxed">
                                                    <strong>Explanation:</strong> {q.explanation}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default EndScreen