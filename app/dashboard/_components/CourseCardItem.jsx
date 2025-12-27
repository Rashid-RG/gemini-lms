"use client"
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'
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
  const showDeleteButton = isError || (isGenerating && isStuck);

  return (
    <div className={`border rounded-lg shadow-md p-5 ${isError ? 'border-red-300 bg-red-50' : ''}`}>
        <div>
            <div className='flex justify-between items-center'>
                <Image src={'/knowledge.png'} alt='other' 
                width={50} height={50}/>
                <div className="flex items-center gap-2">
                  {isError && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  <h2 className='text-[10px] p-1 px-2 rounded-full bg-blue-600 text-white'>{formatDate(course?.createdAt)}</h2>
                </div>
            </div>
            <h2 className='mt-3 font-medium text-lg'>{course?.courseLayout?.course_title||course?.courseLayout?.courseTitle}</h2>
            <p className='text-sm line-clamp-2 text-gray-500 mt-2'>{course?.courseLayout?.summary}</p>

            <div className='mt-3'>
                {isGenerating && progress > 0 && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500 text-right">{progress}% complete</p>
                  </div>
                )}
                {isError && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Generation failed (AI quota exceeded). Delete to get credit back.
                  </p>
                )}
                {isStuck && isGenerating && (
                  <p className="text-xs text-orange-500 mt-1">
                    ⏱️ Stuck generating. Delete to get credit back.
                  </p>
                )}
            </div>

            <div className='mt-3 flex justify-end gap-2'>
               {showDeleteButton && (
                 <Button 
                   variant="destructive" 
                   size="sm"
                   onClick={handleDelete}
                   disabled={deleting}
                 >
                   {deleting ? (
                     <RefreshCw className='h-4 w-4 animate-spin' />
                   ) : (
                     <>
                       <Trash2 className='h-4 w-4 mr-1' />
                       Delete & Refund
                     </>
                   )}
                 </Button>
               )}
               
               {isGenerating && !isStuck ?
                <h2 className='text-sm p-1 px-2 flex gap-2 items-center rounded-full bg-gray-400 text-white'>
                    <RefreshCw className='h-5 w-5 animate-spin'/>
                    Generating...</h2>
               : currentStatus === 'Ready' && !isError ?
                <div className='flex gap-2 items-center'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <Link href={'/course/'+course?.courseId}>
                    <Button>View</Button>
                  </Link>
                </div>
               : !isError && !isGenerating ?
               <Link href={'/course/'+course?.courseId}>
                <Button>View</Button>
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