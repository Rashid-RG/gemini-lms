"use client"
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useChapter } from '../_context/ChapterContext'
import { toast } from 'sonner'
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel"
import FlashcardItem from './_components/FlashcardItem';
  
function Flashcards() {

    const {courseId}=useParams();
    const router = useRouter();
    const { user } = useUser();
    const { currentChapterIndex } = useChapter();
    const [flashCards,setFlashCards]=useState([]);
    const [isFlipped,setIsFlipped]=useState();
    const [api,setApi]=useState();
    const [marking, setMarking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [viewedFlashcards, setViewedFlashcards] = useState(new Set());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retrying, setRetrying] = useState(false);
    const pdfRef = useRef(null);

    useEffect(()=>{
        if (courseId && user?.primaryEmailAddress?.emailAddress) {
            GetFlashCards();
        }
    },[courseId, user?.primaryEmailAddress?.emailAddress])

    useEffect(()=>{
        if(!api)
        {
            return ;
        }
        api.on('select',()=>{
            setIsFlipped(false);
            const newIndex = api.selectedScrollSnap();
            setCurrentIndex(newIndex);
            trackFlashcardView(newIndex);
        })
    },[api])

    // Track initial flashcard view
    useEffect(() => {
        if (flashCards?.content?.length > 0 && user?.primaryEmailAddress?.emailAddress) {
            trackFlashcardView(0);
        }
    }, [flashCards, user?.primaryEmailAddress?.emailAddress]);

    const trackFlashcardView = async (index) => {
        if (viewedFlashcards.has(index)) return;
        
        const newViewed = new Set(viewedFlashcards);
        newViewed.add(index);
        setViewedFlashcards(newViewed);
        
        try {
            // Get current progress
            const progressRes = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            );
            const currentProgress = progressRes.data.result || {};
            
            // Update progress with flashcard tracking
            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters: currentProgress.completedChapters || [],
                quizScores: currentProgress.quizScores || {},
                assignmentScores: currentProgress.assignmentScores || {},
                mcqScores: currentProgress.mcqScores || {},
                progressPercentage: currentProgress.progressPercentage || 0,
                completedFlashcards: (currentProgress.completedFlashcards || 0) + 1,
                totalFlashcards: flashCards?.content?.length || 0,
                activityType: 'flashcards'
            });
        } catch (err) {
            console.error('Error tracking flashcard:', err);
        }
    };

    const GetFlashCards=async()=>{
        try {
            setLoading(true);
            setError(null);
            
            const result=await axios.post('/api/study-type',{
                courseId:courseId,
                studyType:'Flashcard'
            });

            const data = result?.data;
            
            // Check for error status (quota exceeded, generation failed)
            if (data?.status === 'Error') {
                setError('Flashcard generation failed due to AI service limits. Please try again later.');
                toast.error('⚠️ AI Quota Exceeded', {
                    description: 'Flashcard generation failed. The AI service daily limit has been reached. Please try again tomorrow or upgrade your plan.',
                    duration: 8000,
                });
                return;
            }
            
            // Check if still generating
            if (data?.status === 'Generating') {
                setError('generating');
                return;
            }
            
            // Check if no content
            if (!data || !data.content) {
                setError('no-content');
                return;
            }

            setFlashCards(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching flashcards:', err);
            setError('Failed to load flashcards. Please try again.');
            toast.error('Failed to load flashcards');
        } finally {
            setLoading(false);
        }
    }

    const retryGeneration = async () => {
        try {
            setRetrying(true);
            // Trigger regeneration
            await axios.post('/api/study-type-content', {
                chapters: 'Flashcard content',
                courseId: courseId,
                type: 'Flashcard',
                createdBy: user?.primaryEmailAddress?.emailAddress
            });
            toast.info('Flashcard generation started. This may take a minute...');
            // Wait and refetch
            setTimeout(() => {
                GetFlashCards();
                setRetrying(false);
            }, 5000);
        } catch (err) {
            console.error('Retry failed:', err);
            if (err.response?.status === 429) {
                toast.error('⚠️ Rate Limited', {
                    description: 'Too many requests. Please wait a few minutes before trying again.',
                    duration: 5000,
                });
            } else {
                toast.error('Failed to regenerate flashcards');
            }
            setRetrying(false);
        }
    }

    const handleClick=(index)=>{
        setIsFlipped(!isFlipped)
    }

    const markChapterComplete = async () => {
        if (!user || !courseId) return;

        try {
            setMarking(true);
            console.log('Marking chapter complete, chapterIndex:', currentChapterIndex);
            
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

            // Update progress
            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters,
                quizScores: currentProgress.quizScores || {},
                assignmentScores: currentProgress.assignmentScores || {},
                progressPercentage: Math.round((completedChapters.length / currentProgress.totalChapters) * 100),
            });

            console.log('Toast about to show for chapter:', chapterNum + 1);
            // Show success toast
            toast.success(`Chapter ${chapterNum + 1} Completed! 🎉`, {
                description: `Great job! You've completed chapter ${chapterNum + 1}. Progress updated.`,
                duration: 4000,
                position: 'top-center'
            });
        } catch (error) {
            console.error('Error marking chapter complete:', error);
            toast.error('Failed to Mark Chapter Complete', {
                description: 'Please try again or contact support.',
                duration: 4000,
                position: 'top-center'
            });
        } finally {
            setMarking(false);
        }
    };

    const downloadFlashcardsPdf = async () => {
        if (!flashCards?.content?.length) {
            console.log('No flashcards to download');
            return;
        }
        
        const element = pdfRef.current;
        if (!element) {
            console.log('PDF ref element not found');
            return;
        }

        try {
            setDownloading(true);
            
            // Dynamic import html2pdf.js (client-side only)
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default;
            
            if (!html2pdf) {
                console.error('html2pdf not loaded properly');
                return;
            }

            const fileName = `${courseId}-flashcards.pdf`;
            await html2pdf()
                .set({
                    margin: 0.5,
                    filename: fileName,
                    html2canvas: { 
                        scale: 2,
                        useCORS: true,
                        logging: false
                    },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                })
                .from(element)
                .save();
                
            console.log('Flashcards PDF downloaded successfully');
        } catch (err) {
            console.error('Flashcards PDF export failed:', err);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-500">Loading flashcards...</p>
            </div>
        );
    }

    // Error state - AI quota exceeded
    if (error && error !== 'generating' && error !== 'no-content') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-red-800 mb-2">Generation Failed</h3>
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
        );
    }

    // Still generating state
    if (error === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md text-center">
                    <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="font-semibold text-lg text-blue-800 mb-2">Generating Flashcards</h3>
                    <p className="text-blue-600 mb-4">
                        Our AI is creating your flashcards. This may take a minute...
                    </p>
                    <Button 
                        onClick={GetFlashCards}
                        variant="outline"
                        className="mt-2"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                    </Button>
                </div>
            </div>
        );
    }

    // No content - trigger generation
    if (error === 'no-content' || !flashCards?.content) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg text-yellow-800 mb-2">No Flashcards Yet</h3>
                    <p className="text-yellow-600 mb-4">
                        Flashcards haven't been generated for this course yet.
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
                            'Generate Flashcards'
                        )}
                    </Button>
                </div>
            </div>
        );
    }
    
  return (
    <div>
        <h2 className='font-bold text-2xl'>Flashcards</h2>
        <p>Flashcards: The Ultimate Tool to Lock in Concepts!</p>

        <div className='mt-10'>
            <Carousel setApi={setApi}>
                <CarouselContent>
                    {flashCards?.content && flashCards.content?.map((flashcard, index) => (
                        <CarouselItem key={index} className="flex items-center justify-center">
                            <FlashcardItem 
                                handleClick={handleClick} 
                                isFlipped={isFlipped}
                                flashcard={flashcard}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </div>

        {flashCards?.content && (
            <div className='mt-8 flex gap-4 justify-center'>
                <Button 
                    onClick={markChapterComplete}
                    disabled={marking || !user}
                    className='bg-green-600 hover:bg-green-700 text-white'
                >
                    {marking ? 'Marking...' : 'Mark Flashcards Complete'}
                </Button>
                <Button
                    onClick={downloadFlashcardsPdf}
                    disabled={downloading}
                    className='bg-slate-800 hover:bg-slate-900 text-white'
                >
                    {downloading ? 'Exporting...' : 'Download PDF'}
                </Button>
                <Button 
                    onClick={() => router.back()}
                    variant="outline"
                >
                    Go to Course Page
                </Button>
            </div>
        )}

        {flashCards?.content && (
            <div ref={pdfRef} className='hidden print:block'>
                <h2>Flashcards - {courseId}</h2>
                {flashCards.content.map((card, idx) => (
                    <div key={idx} style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <div><strong>Q{idx + 1}:</strong> {card.question}</div>
                        <div><strong>A:</strong> {card.answer}</div>
                    </div>
                ))}
            </div>
        )}
    </div>
  )
}

export default Flashcards