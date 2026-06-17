"use client"
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, CheckCircle, Trash2, AlertTriangle, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { memo, useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

// Simple progress calculation without SSE to reduce connections
const getGenerationProgress = (status) => {
  if (status === 'Ready') return 100;
  if (status === 'Error') return 0;
  return 50; // Default generating state
};

const CourseCardItem = memo(function CourseCardItem({course, onStatusChange, onDelete, userEmail}) {
  const [currentStatus, setCurrentStatus] = useState(course?.status);
  const [deleting, setDeleting] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  
  // Check if course is stuck (generating for more than 5 minutes)
  useEffect(() => {
    if (course?.status === 'Generating' && course?.createdAt) {
      const createdTime = new Date(course.createdAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - createdTime > fiveMinutes) {
        setIsStuck(true);
      }
    }
  }, [course?.status, course?.createdAt]);

  // Sync with prop changes
  useEffect(() => {
    setCurrentStatus(course?.status);
  }, [course?.status]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this failed course and get your credit back?')) return;
    
    try {
      setDeleting(true);
      const response = await axios.delete(`/api/course/${course.courseId}`, {
        data: { userEmail }
      });
      
      if (response.data.success) {
        toast.success('🎉 Course deleted! Credit refunded.', {
          description: 'You can now create a new course.',
          duration: 5000
        });
        if (onDelete) onDelete(course.courseId);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      const message = error.response?.data?.error || 'Failed to delete course';
      toast.error('Delete failed', { description: message });
    } finally {
      setDeleting(false);
    }
  };

  const progress = getGenerationProgress(currentStatus);
  const isGenerating = currentStatus === 'Generating';
  const isError = currentStatus === 'Error';
  const isPendingReview = currentStatus === 'PendingReview';
  const showDeleteButton = isError || (isGenerating && isStuck);

  return (
    <div className={`border border-slate-100 bg-white rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${isError ? 'border-red-100 bg-red-50/30' : ''}`}>
        <div className="flex flex-col h-full justify-between gap-4">
            <div>
                <div className='flex justify-between items-start'>
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        <Image src={'/knowledge.png'} alt='other' width={36} height={36}/>
                    </div>
                    <div className="flex items-center gap-2">
                      {isError && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className='text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100'>{formatDate(course?.createdAt)}</span>
                    </div>
                </div>
                
                <h2 className='mt-4 font-extrabold text-slate-800 text-base leading-snug line-clamp-2'>
                    {course?.courseLayout?.course_title||course?.courseLayout?.courseTitle}
                </h2>
                <p className='text-xs line-clamp-3 text-slate-500 mt-2 leading-relaxed'>
                    {course?.courseLayout?.summary}
                </p>
            </div>

            <div className='mt-2 space-y-2.5'>
                {isGenerating && progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-indigo-600">
                      <span>Preparing Content</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-indigo-50 [&>div]:bg-indigo-600" />
                  </div>
                )}
                {isError && (
                  <p className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    ⚠️ Generation failed (quota limit). Please delete to refund your credit.
                  </p>
                )}
                {isPendingReview && (
                  <p className="text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    ⏳ Course generated. Waiting for tutor/admin verification before publishing.
                  </p>
                )}
                {isStuck && isGenerating && (
                  <p className="text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                    ⏱️ Process is delayed. You can delete to refund your credit.
                  </p>
                )}
            </div>

            <div className='mt-2 flex items-center justify-between gap-3 pt-2 border-t border-slate-50'>
               {showDeleteButton && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-xl text-xs font-bold px-4 py-2"
                  >
                    {deleting ? (
                      <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <>
                        <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                        Delete & Refund
                      </>
                    )}
                  </Button>
               )}
               
               {isGenerating && !isStuck ?
                 <span className='text-xs font-bold py-1.5 px-3 flex gap-2 items-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse ml-auto'>
                     <RefreshCw className='h-3.5 w-3.5 animate-spin'/>
                     Generating...</span>
               : isPendingReview ?
                 <span className='text-xs font-bold py-1.5 px-3 flex gap-2 items-center rounded-full bg-amber-50 text-amber-600 border border-amber-100 ml-auto'>
                     <Clock className='h-3.5 w-3.5'/>
                     Pending Review</span>
               : currentStatus === 'Ready' && !isError ?
                 <div className='flex gap-2 items-center w-full justify-between'>
                   <span className='flex gap-1.5 items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100'>
                     <CheckCircle className='h-3.5 w-3.5 text-emerald-500' /> Ready
                   </span>
                   <Link href={'/course/'+course?.courseId} prefetch={true} className="grow max-w-[120px]">
                     <Button className="w-full rounded-xl font-bold text-xs py-2 h-9 shadow-sm shadow-indigo-100">View Course</Button>
                   </Link>
                 </div>
               : !isError && !isGenerating ?
               <Link href={'/course/'+course?.courseId} prefetch={true} className="grow max-w-[120px] ml-auto">
                 <Button className="w-full rounded-xl font-bold text-xs py-2 h-9 shadow-sm shadow-indigo-100">View Course</Button>
               </Link> : null }
            </div>

        </div>
    </div>
  )
}, (prevProps, nextProps) => {
    return prevProps.course?.courseId === nextProps.course?.courseId &&
           prevProps.course?.status === nextProps.course?.status;
})

export default CourseCardItem