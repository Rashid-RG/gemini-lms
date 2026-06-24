import { Button } from '@/components/ui/button'
import axios from 'axios'
import { RefreshCcw, Award } from 'lucide-react';
import Image from 'next/image'
import Link from 'next/link';
import React, { useState } from 'react'
import { toast } from 'sonner';

function MaterialCardItem({item,studyTypeContent,course,refreshData}) {

  const [loading,setLoading]=useState(false);
  
  // Certificate doesn't need generation
  const isCertificateOrMock = item.type === 'certificate' || item.type === 'mock-exam';

  const GenerateContent=async()=>{

    toast(' Generating your content...')
    setLoading(true)
    // console.log(course)
    let chapters='';
    course?.courseLayout.chapters.forEach(chapter=>{
      chapters=(chapter.chapter_title||chapter.chapterTitle)+','+chapters
    });
    
    // Map item type to correct API type
    const typeMap = {
      'flashcard': 'Flashcard',
      'quiz': 'Quiz',
      'qa': 'qa',
      'assignments': 'assignments'
    };
    const apiType = typeMap[item.type] || item.type;
  
    const result=await axios.post('/api/study-type-content',{
      courseId:course?.courseId,
      type:apiType,
      chapters:chapters,
      createdBy: course?.createdBy
    });

    setLoading(false);
    console.log(result);
    refreshData(true);
    toast('Your content is ready to view')
  }

  const getPath = () => {
    if (item.type === 'quiz') {
      const isManual = studyTypeContent?.quiz?.[0]?.content?.[0] && 
        ('correctOption' in studyTypeContent.quiz[0].content[0] || 'correct_option' in studyTypeContent.quiz[0].content[0]);
      return `/course/${course?.courseId}${isManual ? '/manual-quiz' : '/quiz'}`;
    }
    return `/course/${course?.courseId}${item.path}`;
  };

  return (
   
    <div className={`border shadow-md rounded-lg p-5 flex flex-col items-center
      ${!isCertificateOrMock && studyTypeContent?.[item.type]?.length==0&&'grayscale'}
    `}>
       {item.type === 'certificate' ? (
        <h2 className='p-1 px-2 bg-yellow-500 text-white rounded-full text-[10px] mb-2'>Certificate</h2>
       ) : item.type === 'mock-exam' ? (
        <h2 className='p-1 px-2 bg-purple-500 text-white rounded-full text-[10px] mb-2'>Timed Exam</h2>
       ) : studyTypeContent?.[item.type]?.length==0 ? (
        <h2 className='p-1 px-2 bg-gray-500 text-white rounded-full text-[10px] mb-2'>Generate</h2>
       ) : (
        <h2 className='p-1 px-2 bg-green-500 text-white rounded-full text-[10px] mb-2'>Ready</h2>
       )}
      
        {item.icon.includes('.png') || item.icon.includes('.svg') ? (
          <Image src={item.icon} alt={item.name} width={50} height={50} onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}/>
        ) : null}
        <Award className='w-12 h-12 text-yellow-600' style={{display: item.type === 'certificate' ? 'block' : 'none'}}/>
        
        <h2 className='font-medium mt-3'>{item.name}</h2>
        <p className='text-gray-500 text-sm text-center'>{item.desc}</p>

        {isCertificateOrMock ? (
          <Link href={getPath()}>
            <Button className="mt-3 w-full" variant="outline">View</Button>
          </Link>
        ) : studyTypeContent?.[item.type]?.length==0 ? (
          <Button className="mt-3 w-full" variant="outline" onClick={()=>GenerateContent()} >
            {loading&& <RefreshCcw className='animate-spin' /> }
            Generate</Button>
        ) : (
          <Link href={getPath()}>
            <Button className="mt-3 w-full" variant="outline">View</Button>
          </Link>
        )}
    </div>

  )
}

export default MaterialCardItem