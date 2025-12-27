import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Award, CheckCircle } from 'lucide-react'

function EndScreen({data, stepCount, courseId: propCourseId, chapterIndex, onChapterComplete, correctCount, contentType = 'chapter', onQuizComplete}) {
    const route = useRouter();
    const params = useParams();
    const { user } = useUser();
    const [marking, setMarking] = useState(false);
    
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
        <div>
            {data?.length == stepCount && (
                <div className='flex items-center gap-10 flex-col justify-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-8'>
                    <div className='text-center'>
                        <h2 className='text-3xl font-bold text-green-600 mb-3'>✓ Content Completed!</h2>
                        <p className='text-slate-600 text-lg mb-6'>
                            You've finished all the {
                                contentType === 'quiz' ? 'quiz questions' : 
                                contentType === 'mcq' ? 'MCQ questions' : 
                                'reading content'
                            } in this section.
                        </p>
                        
                        {(contentType === 'quiz' || contentType === 'mcq') && quizScore > 0 && (
                            <div className='mb-6 inline-block bg-white rounded-lg p-4 border-2 border-green-300 shadow-md'>
                                <div className='flex items-center gap-2 justify-center mb-2'>
                                    <Award className='w-6 h-6 text-blue-600' />
                                    <p className='text-sm font-medium text-slate-600'>{contentType === 'mcq' ? 'MCQ' : 'Quiz'} Score</p>
                                </div>
                                <div className='text-4xl font-bold text-blue-600'>{quizScore}%</div>
                                <p className='text-xs text-slate-500 mt-1'>{correctCount} out of {data.length} correct</p>
                            </div>
                        )}
                    </div>
                    
                    <div className='flex gap-4'>
                        <Button 
                            onClick={markChapterComplete}
                            disabled={marking || !user}
                            className='bg-green-600 hover:bg-green-700 text-white'
                        >
                            <CheckCircle className='w-4 h-4 mr-2' />
                            {marking ? 'Marking...' : 
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
            )}
        </div>
    )
}

export default EndScreen