import { Progress } from '@/components/ui/progress'
import Image from 'next/image'
import React from 'react'

function CourseIntroCard({course}) {
  if (!course || !course.courseLayout) {
    return (
      <div className='flex gap-5 items-center p-10 border shadow-md rounded-lg bg-yellow-50 border-yellow-200'>
        <div className='text-yellow-700'>
          <p className='font-semibold'>Course content is loading...</p>
          <p className='text-sm text-yellow-600'>courseLayout data not yet available</p>
        </div>
      </div>
    );
  }

  const courseLayout = course.courseLayout;
  const courseTitle = courseLayout.course_title || courseLayout.courseTitle || 'Untitled Course';
  const summary = courseLayout.summary || 'No description available';
  const chaptersCount = courseLayout.chapters?.length || 0;

  return (
    <div className='flex gap-5 items-center p-10 border shadow-md rounded-lg'>
      <Image src={'/knowledge.png'} alt='other' width={70} height={70}/>
      <div>
        <h2 className='font-bold text-2xl'>{courseTitle}</h2>
        <p>{summary}</p>
        <Progress className="mt-3"/>

        <h2 className='mt-3 text-lg text-primary'>Total Chapter: {chaptersCount}</h2>
      </div>
    </div>
  )
}

export default CourseIntroCard