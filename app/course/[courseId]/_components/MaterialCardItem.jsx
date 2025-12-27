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
  const isCertificate = item.type === 'certificate';
  
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

  return (
   
    <div className={`border shadow-md rounded-lg p-5 flex flex-col items-center
      ${!isCertificate && studyTypeContent?.[item.type]?.length==0&&'grayscale'}
    `}>
       {isCertificate ? (
        <h2 className='p-1 px-2 bg-yellow-500 text-white rounded-full text-[10px] mb-2'>Certificate</h2>
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

        {isCertificate ? (
          <Link href={'/course/'+course?.courseId+item.path}>
            <Button className="mt-3 w-full" variant="outline">View</Button>
          </Link>
        ) : studyTypeContent?.[item.type]?.length==0 ? (
          <Button className="mt-3 w-full" variant="outline" onClick={()=>GenerateContent()} >
            {loading&& <RefreshCcw className='animate-spin' /> }
            Generate</Button>
        ) : (
          <Link href={'/course/'+course?.courseId+item.path}>
            <Button className="mt-3 w-full" variant="outline">View</Button>
          </Link>
        )}
    </div>

  )
}

export default MaterialCardItem