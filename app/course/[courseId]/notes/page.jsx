"use client"
import { Button } from '@/components/ui/button';
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import DOMPurify from 'dompurify'
import StepProgress from '../_components/StepProgress';
import EndScreen from '../_components/EndScreen';
import { useChapter } from '../_context/ChapterContext';
import { toast } from 'sonner';

function ViewNotes() {

    const {courseId}=useParams();
    const { user } = useUser();
    const { currentChapterIndex } = useChapter();
    const [notes,setNotes]=useState();
    const [stepCount,setStepCount]=useState(0)
    const [downloading,setDownloading]=useState(false)
    const [completedNotes, setCompletedNotes] = useState(new Set())
    const noteRef=useRef(null);
    const route=useRouter();
    
    useEffect(()=>{
        if (courseId && user?.primaryEmailAddress?.emailAddress) {
            GetNotes();
        }
    },[courseId, user?.primaryEmailAddress?.emailAddress, currentChapterIndex])

    // Track note completion when user views a note
    useEffect(() => {
        if (notes && notes[stepCount] && user?.primaryEmailAddress?.emailAddress) {
            trackNoteCompletion(stepCount);
        }
    }, [stepCount, notes, user?.primaryEmailAddress?.emailAddress]);

    const trackNoteCompletion = async (noteIndex) => {
        if (completedNotes.has(noteIndex)) return; // Already tracked
        
        try {
            // Get current progress
            const progressRes = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            );
            const currentProgress = progressRes.data.result || {};
            
            const newCompletedNotes = new Set(completedNotes);
            newCompletedNotes.add(noteIndex);
            setCompletedNotes(newCompletedNotes);
            
            // Update progress with notes tracking
            await axios.post('/api/student-progress', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                completedChapters: currentProgress.completedChapters || [],
                quizScores: currentProgress.quizScores || {},
                assignmentScores: currentProgress.assignmentScores || {},
                mcqScores: currentProgress.mcqScores || {},
                progressPercentage: currentProgress.progressPercentage || 0,
                completedNotes: newCompletedNotes.size,
                totalNotes: notes?.length || 0,
                activityType: 'notes'
            });
        } catch (err) {
            console.error('Error tracking note completion:', err);
        }
    };


    const GetNotes=async()=>{
        const result=await axios.post('/api/study-type',{
            courseId:courseId,
            studyType:'notes'
        });

        console.log(result?.data);
        setNotes(result?.data);
    }

    const handleChapterComplete = () => {
        // Refresh progress and show updated data
        GetNotes();
    }

    // All chapters accessible - no lock feature


    const downloadPdf = async () => {
        if (!notes || !notes[stepCount]) {
            console.log('No notes to download');
            return;
        }
        
        const element = noteRef.current;
        if (!element) {
            console.log('Note element ref not found');
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

            const fileName = `${courseId}-chapter-${stepCount + 1}-notes.pdf`;
            
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
                
            console.log('PDF downloaded successfully');
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    }

  return notes&&(
    <div>
        <StepProgress 
            data={notes} 
            setStepCount={(v)=>setStepCount(v)} 
            stepCount={stepCount}
        />

        <div className='mt-4 flex justify-end'>
            <Button onClick={downloadPdf} disabled={downloading} className='bg-slate-800 hover:bg-slate-900'>
                {downloading ? 'Exporting...' : 'Download PDF'}
            </Button>
        </div>

        <div className='mt-10 noteClass'>
            <div ref={noteRef} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize((notes[stepCount]?.notes)?.replace('```html',' ') || '')}} />
       
                <EndScreen 
                    data={notes} 
                    stepCount={stepCount}
                    courseId={courseId}
                    chapterIndex={currentChapterIndex}
                    onChapterComplete={handleChapterComplete}
                />
        </div>

    </div>
  )
}

export default ViewNotes