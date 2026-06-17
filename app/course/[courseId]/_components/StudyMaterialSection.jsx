import React, { useEffect, useState } from 'react'
import MaterialCardItem from './MaterialCardItem'
import { db } from '@/configs/db'
import axios from 'axios'
import Link from 'next/link';

function StudyMaterialSection({courseId,course}) {

    const [studyTypeContent,setStudyTypeContent]=useState();
    const MaterialList=[
        {
            name:'Notes/Chapters',
            desc:'Read notes to prepare it',
            icon:'/notes.png',
            path:'/notes',
            type:'notes'
        },
        {
            name:'Flashcard',
            desc:'Flashcard to remember the concepts',
            icon:'/flashcard.png',
            path:'/flashcards',
            type:'flashcard'

        },
        {
            name:'Quiz',
            desc:'Great way to test your knowledge',
            icon:'/quiz.png',
            path:'/quiz',
            type:'quiz'
        },
        {
            name:'Assignments',
            desc:'Submit assignments with AI grading',
            icon:'/file.svg',
            path:'/assignments',
            type:'assignments'
        },
        {
            name:'Certificate',
            desc:'View your completion certificate',
            icon:'/certificate.png',
            path:'/certificate',
            type:'certificate'
        },
        {
            name:'Mock Exam',
            desc:'Simulated timed assessment',
            icon:'/quiz.png',
            path:'/mock-exam',
            type:'mock-exam'
        },
        {
            name:'Playground',
            desc:'Interactive coding sandbox',
            icon:'/notes.png',
            path:'/playground',
            type:'playground'
        }
    ];

    // Helper heuristic to detect if a course is coding-related
    const isCodingRelated = (courseObj) => {
        if (!courseObj) return false;
        
        // 1. Explicitly Coding Prep type
        if (courseObj.courseType === 'Coding Prep') return true;
        
        // 2. Keyword matching on topic or description
        const codingKeywords = [
            'python', 'javascript', 'js', 'ts', 'typescript', 'java', 'c++', 'c#', 'rust', 'golang',
            'html', 'css', 'react', 'nextjs', 'node', 'express', 'sql', 'mysql', 'postgres', 'mongodb', 
            'programming', 'coding', 'software', 'algorithm', 'web development', 'vue', 'angular',
            'git', 'github', 'docker', 'kubernetes'
        ];
        
        const topic = (courseObj.topic || '').toLowerCase();
        const desc = (courseObj.description || '').toLowerCase();
        
        return codingKeywords.some(keyword => {
            if (keyword === 'c') {
                return /\bc\b/.test(topic) || /\bc\b/.test(desc);
            }
            if (keyword === 'js') {
                return /\bjs\b/.test(topic) || /\bjs\b/.test(desc);
            }
            return topic.includes(keyword) || desc.includes(keyword);
        });
    };

    const isCoding = isCodingRelated(course);
    const filteredMaterialList = MaterialList.filter(item => {
        if (item.type === 'playground') {
            return isCoding;
        }
        return true;
    });

    useEffect(()=>{
        GetStudyMaterial();
    },[])

    const GetStudyMaterial=async()=>{
        const result=await axios.post('/api/study-type',{
            courseId:courseId,
            studyType:'ALL'
        })

        console.log(result?.data);
        setStudyTypeContent(result.data)
    }


  return (
    <div className='mt-5'>
        <h2 className='font-medium text-xl'>Study Material</h2>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-5 mt-3'>
            {filteredMaterialList.map((item,index)=>(
                
                <MaterialCardItem item={item} key={index}
                    studyTypeContent={studyTypeContent}
                    course={course}
                    refreshData={GetStudyMaterial}
                />
             
            ))}
        </div>
    </div>
  )
}

export default StudyMaterialSection