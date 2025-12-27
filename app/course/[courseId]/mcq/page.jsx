"use client"
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import StepProgress from '../_components/StepProgress';
import QuizCardItem from '../quiz/_components/QuizCardItem';
import EndScreen from '../_components/EndScreen';
import { useChapter } from '../_context/ChapterContext'
import { toast } from 'sonner'
import { Sparkles, Zap, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { useAdaptiveDifficulty } from '../_hooks/useAdaptiveDifficulty'
import { Button } from '@/components/ui/button'

// Safe JSON parsing helper
const safeJsonParse = (value, fallback = {}) => {
  try {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value || fallback;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
};

function MCQPage() {
    const {courseId}=useParams();
    const router = useRouter();
    const { user } = useUser();
    const { currentChapterIndex } = useChapter();
    const { difficulty, submitScore, loadCurrentDifficulty } = useAdaptiveDifficulty(courseId, user?.primaryEmailAddress?.emailAddress);
    const [mcqData,setMcqData]=useState();
    const [stepCount,setStepCount]=useState(0);
    const [isCorrectAns,setIsCorrectAnswer]=useState(null);
    const [mcq,setMcq]=useState([]);
    const [correctAns,setCorrectAns]=useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [marking, setMarking] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [mcqScore, setMcqScore] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [topicName, setTopicName] = useState('');
    const [newDifficulty, setNewDifficulty] = useState(null);
    
    useEffect(()=>{
        GetMCQ()
    },[courseId, user?.primaryEmailAddress?.emailAddress])

    // Load current difficulty for this chapter
    useEffect(() => {
        if (currentChapterIndex !== undefined) {
            loadCurrentDifficulty(`chapter_${currentChapterIndex}`);
        }
    }, [currentChapterIndex, loadCurrentDifficulty]);

    const GetMCQ=async()=>{
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching MCQ for courseId:', courseId)
            const result=await axios.post('/api/study-type',{
                courseId:courseId,
                studyType:'MCQ'
            });

            console.log('MCQ API Response:', result.data);
            
            // Check if MCQ exists
            if (!result.data) {
                setError('No MCQ found. Please generate MCQ questions first from the Study Materials section.');
                setMcq([]);
                return;
            }

            // Handle both stringified and parsed content
            let mcqContent;
            if (typeof result.data.content === 'string') {
                mcqContent = JSON.parse(result.data.content);
            } else {
                mcqContent = result.data.content || {};
            }

            console.log('Parsed MCQ Content:', mcqContent);
            setMcqData(result.data);
            const questions = mcqContent?.questions || [];
            console.log('Questions array:', questions);
            
            if (questions.length === 0) {
                setError('No questions found in MCQ. The content may still be generating.');
            } else {
                setError(null);
            }
            setMcq(questions);
        } catch (error) {
            console.error('Error loading MCQ:', error);
            setError('Failed to load MCQ questions. ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Handle adaptive difficulty tracking after MCQ submission
    const handleMCQSubmit = async (mcqScore) => {
        if (!user || currentChapterIndex === undefined) return;

        try {
            const response = await fetch('/api/adaptive-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    studentEmail: user.primaryEmailAddress?.emailAddress,
                    topicId: `chapter_${currentChapterIndex}`,
                    topicName: topicName || `Chapter ${currentChapterIndex}`,
                    score: mcqScore,
                    assessmentType: 'mcq'
                })
            });

            const data = await response.json();
            if (data.result && data.result.recommendedDifficulty !== difficulty) {
                setNewDifficulty(data.result.recommendedDifficulty);
                if (data.result.recommendedDifficulty === 'Hard') {
                    toast.success('🎯 Great progress! Difficulty increased to Hard', {
                        description: 'You\'re ready for more challenging questions',
                        duration: 5000
                    });
                } else if (data.result.recommendedDifficulty === 'Easy') {
                    toast('📚 Let\'s build foundation. Difficulty adjusted to Easy', {
                        description: 'Focus on mastering the basics first',
                        duration: 5000
                    });
                }
            }
        } catch (error) {
            console.error('Error tracking adaptive performance:', error);
        }
    };

    const generateMCQ = async () => {
        try {
            setGenerating(true);
            setError(null);
            
            // Show initial toast
            toast.loading('🚀 Generating 20 MCQ questions...', {
                id: 'mcq-generating',
                description: 'Using AI to create comprehensive questions based on your course content',
                duration: Infinity,
                position: 'top-center'
            });
            
            // Get course details to get chapter info
            const courseRes = await axios.get(`/api/courses?courseId=${courseId}`);
            const course = courseRes.data.result;
            
            if (!course || !course.courseLayout || !course.courseLayout.chapters) {
                toast.error('⚠️ Error Getting Course Details', {
                    id: 'mcq-generating',
                    description: 'Could not retrieve course information. Please try again.',
                    duration: 5000,
                    position: 'top-center'
                });
                setError('Failed to get course details');
                return;
            }

            // Build comprehensive course context with chapter details
            const courseDetails = `
Course Title: ${course.courseLayout.course_title || course.courseLayout.courseTitle || course.topic}
Course Type: ${course.courseType}
Difficulty Level: ${course.difficultyLevel || 'Medium'}
Summary: ${course.courseLayout.summary || 'N/A'}

Chapters and Topics:
${course.courseLayout.chapters.map((ch, idx) => {
    const chapterTitle = ch.chapter_title || ch.chapterName || ch.chapter_name || `Chapter ${idx + 1}`;
    const chapterSummary = ch.summary || ch.description || '';
    const topics = ch.topics || ch.topic_list || [];
    return `${idx + 1}. ${chapterTitle}
   Summary: ${chapterSummary}
   Topics: ${Array.isArray(topics) ? topics.join(', ') : topics}`;
}).join('\n\n')}
            `.trim();

            const chapterTitles = course.courseLayout.chapters
                .map(ch => ch.chapter_title || ch.chapterName || ch.chapter_name)
                .join(', ');

            // Trigger MCQ generation with comprehensive context
            await axios.post('/api/study-type-content', {
                courseId: courseId,
                chapters: chapterTitles,
                type: 'MCQ',
                courseType: course.courseType,
                topic: course.topic,
                courseDetails: courseDetails
            });

            // Show success toast
            toast.success('✨ MCQ Generation Started!', {
                id: 'mcq-generating',
                description: 'Your 20 questions are being created. Refreshing in 3 seconds...',
                duration: 4000,
                position: 'top-center'
            });

            // Refresh MCQ data after a delay
            setTimeout(() => {
                GetMCQ();
                toast.success('🎉 MCQ Ready!', {
                    description: 'Your questions have been generated. Start answering!',
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                    duration: 4000,
                    position: 'top-center'
                });
            }, 3000);
        } catch (error) {
            console.error('Error generating MCQ:', error);
            toast.error('❌ Generation Failed', {
                id: 'mcq-generating',
                description: error.response?.data?.message || error.message || 'Failed to generate MCQ. Please try again later.',
                duration: 5000,
                position: 'top-center'
            });
        } finally {
            setGenerating(false);
        }
    };

    const checkAnswer=(userAnswer,currentQuestion)=>{
        console.log(currentQuestion?.answer,userAnswer);
        
        // Store user's answer
        setUserAnswers(prev => ({
            ...prev,
            [stepCount]: userAnswer
        }));
        
        if(userAnswer==currentQuestion?.answer)
        {
            setIsCorrectAnswer(true);
            setCorrectAns(currentQuestion?.answer);
            // Increment correct count only on first correct answer to this question
            if (!userAnswers[stepCount]) {
                setCorrectCount(prev => prev + 1);
            }
            // Show success toast for correct answer
            toast.success('🎯 Correct!', {
                description: 'Great job! You selected the right answer.',
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                duration: 2000,
                position: 'top-center'
            });
            return ;
        }
        setIsCorrectAnswer(false);
        // Show error toast for incorrect answer
        toast.error('❌ Incorrect!', {
            description: `The correct answer is: ${currentQuestion?.answer}`,
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            duration: 3000,
            position: 'top-center'
        });
    }

    useEffect(()=>{
        setCorrectAns(null);
        setIsCorrectAnswer(null);
    },[stepCount])

    const markChapterComplete = async () => {
        if (!user || !courseId) return;

        try {
            setMarking(true);
            
            // Calculate MCQ score
            const calculatedMcqScore = Math.round((correctCount / mcq.length) * 100);
            setMcqScore(calculatedMcqScore);
            
            // Show loading toast
            toast.loading('💾 Saving your progress...', {
                id: 'mark-chapter',
                position: 'top-center'
            });
            
            // Get current progress
            const progressRes = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            );

            const currentProgress = progressRes.data.result;
            let completedChapters = Array.isArray(currentProgress.completedChapters)
                ? currentProgress.completedChapters
                : JSON.parse(currentProgress.completedChapters || '[]');

            // Add current chapter
            const chapterNum = currentChapterIndex;
            if (!completedChapters.includes(chapterNum)) {
                completedChapters.push(chapterNum);
            }

            // Prepare MCQ scores object
            let mcqScores = currentProgress.mcqScores || {};
            if (typeof mcqScores === 'string') {
                mcqScores = JSON.parse(mcqScores || '{}');
            }
            // Store MCQ score with unique key based on chapter
            mcqScores[`chapter_${chapterNum}`] = calculatedMcqScore;

            // Update progress with MCQ scores included
            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters,
                quizScores: currentProgress.quizScores || {},
                assignmentScores: currentProgress.assignmentScores || {},
                mcqScores: mcqScores,
                progressPercentage: Math.round((completedChapters.length / currentProgress.totalChapters) * 100),
            });

            // Show success toast with celebration
            toast.success(`🏆 Chapter ${chapterNum + 1} Completed! MCQ Score: ${calculatedMcqScore}%`, {
                id: 'mark-chapter',
                description: `Excellent work! You scored ${calculatedMcqScore}% on the MCQ (${correctCount}/${mcq.length} correct). Your progress has been updated.`,
                icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
                duration: 5000,
                position: 'top-center'
            });
        } catch (error) {
            console.error('Error marking chapter complete:', error);
            toast.error('❌ Failed to Save Progress', {
                id: 'mark-chapter',
                description: 'There was an issue saving your progress. Please try again.',
                duration: 4000,
                position: 'top-center'
            });
        } finally {
            setMarking(false);
        }
    };

  return (
    <div>
        <h2 className='font-bold text-2xl text-center mb-6'>Multiple Choice Questions (MCQ) - 20 Questions</h2>

        {loading ? (
            <div className='text-center py-20'>
                <div className='inline-block'>
                    <Loader className='w-12 h-12 text-blue-600 animate-spin mb-4' />
                    <p className='text-slate-600 text-lg font-semibold'>Loading MCQ questions...</p>
                    <p className='text-slate-500 text-sm mt-2'>Please wait while we fetch your questions</p>
                </div>
            </div>
        ) : error ? (
            <div className='text-center py-12'>
                <div className='max-w-2xl mx-auto bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-10 shadow-lg'>
                    <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-4' />
                    <p className='text-red-700 text-lg font-bold mb-2'>No MCQ Questions Found</p>
                    <p className='text-red-600 text-sm mb-6'>{error}</p>
                    <button
                        onClick={generateMCQ}
                        disabled={generating}
                        className='bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 mx-auto'
                    >
                        {generating ? (
                            <>
                                <Loader className='w-5 h-5 animate-spin' />
                                Generating MCQ...
                            </>
                        ) : (
                            <>
                                <Zap className='w-5 h-5' />
                                Generate 20 MCQ Questions
                            </>
                        )}
                    </button>
                    <p className='text-slate-500 text-xs mt-4'>AI will analyze your course content and create comprehensive multiple choice questions</p>
                </div>
            </div>
        ) : mcq && mcq.length > 0 ? (
            <>
                {/* Difficulty Badge */}
                <div className='flex justify-between items-center mb-6'>
                    <h2 className='font-bold text-2xl'>Multiple Choice Questions</h2>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-white ${
                        difficulty === 'Hard' ? 'bg-red-500' :
                        difficulty === 'Medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                    }`}>
                        <Zap className='w-4 h-4' />
                                {difficulty || 'Easy'} Level
                            </div>
                        </div>

                        <StepProgress data={mcq} stepCount={stepCount} setStepCount={(value)=>setStepCount(value)} />

                        <div>
                            <QuizCardItem quiz={mcq[stepCount]}
                            userSelectedOption={(v)=>checkAnswer(v,mcq[stepCount])}
                            />
                        </div>

                        {isCorrectAns!=null && (
                            <div className={`my-6 rounded-xl p-6 shadow-lg border-2 transform transition-all ${
                                isCorrectAns
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                                    : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
                            }`}>
                                <div className='flex items-center justify-center gap-3 mb-3'>
                                    {isCorrectAns ? (
                                        <>
                                            <CheckCircle2 className='w-8 h-8 text-green-600' />
                                            <p className='text-2xl font-bold text-green-700'>Correct! Well Done! 🎉</p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className='w-8 h-8 text-red-600' />
                                            <p className='text-2xl font-bold text-red-700'>Not Quite Right ❌</p>
                                        </>
                                    )}
                                </div>
                                {!isCorrectAns && (
                                    <p className={`text-center font-semibold ${isCorrectAns ? 'text-green-700' : 'text-red-700'}`}>
                                        Correct Answer: <span className='underline'>{correctAns}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        <EndScreen 
                            data={mcq} 
                            stepCount={stepCount} 
                            courseId={courseId} 
                            chapterIndex={currentChapterIndex} 
                            correctCount={correctCount} 
                            contentType="mcq"
                            onQuizComplete={(mcqScore) => handleMCQSubmit(mcqScore)}
                        />
                </>
        ) : (
            <div className='text-center py-12'>
                <p className='text-slate-600 text-lg'>Loading MCQ questions...</p>
            </div>
        )}
    </div>
  )
}

export default MCQPage
