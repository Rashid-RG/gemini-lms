"use client"
import React, { useState } from 'react'
import SelectOption from './_components/SelectOption'
import { Button } from '@/components/ui/button';
import TopicInput from './_components/TopicInput';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { Loader, Video, Globe, Lock, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const CATEGORIES = ['General', 'Programming', 'Business', 'Design', 'Science', 'Language', 'Mathematics', 'Other'];

function Create() {
    const [step,setStep]=useState(0);
    const [formData,setFormData]=useState({
      includeVideos: false, 
      isPublic: false, 
      category: 'General',
      tags: []
    });
    const {user}=useUser();
    const [loading,setLoading]=useState(false);
    const [tagInput, setTagInput] = useState('');

    const router=useRouter();

    const handleUserInput=(fieldName,fieldValue)=>{

        setFormData(prev=>({
            ...prev,
            [fieldName]:fieldValue
        }))

        console.log(formData);
    }

    /**
     * Used to Save User Input and Generate Course Layout using AI
     */
    const GenerateCourseOutline=async()=>{
      const courseId=uuidv4();
      setLoading(true);
      try {
        const result=await axios.post('/api/generate-course-outline',{
          courseId:courseId,
          ...formData,
          createdBy:user?.primaryEmailAddress?.emailAddress
        });
        setLoading(false);
        router.replace('/dashboard');
        //Toast Notification
        toast(formData.includeVideos 
          ? "Course generating with video suggestions..." 
          : "Your course content is generating, Click on Refresh Button")
        console.log(result.data.result.resp);
      } catch (err) {
        setLoading(false);
        toast.error("Error generating course: " + (err.response?.data?.error || err.message));
      }
    }

   

  return (
    <div className='flex flex-col items-center p-5 md:px-24 lg:px-36 mt-20'>
        <h2 className='font-bold text-4xl text-primary'>Start Building Your Personal Study Material</h2>
        <p className='text-gray-500 text-lg'>Fill All details in order to generate study material for your next project</p>

        <div className='mt-10'>
          {step==0?  <SelectOption selectedStudyType={(value)=>handleUserInput('courseType',value)}/>
          : <TopicInput 
          setTopic={(value)=>handleUserInput('topic',value)} 
          setDifficultyLevel={(value)=>handleUserInput('difficultyLevel',value)}
          /> }
        </div>

        {/* Additional Options */}
        {step == 1 && (
          <div className='mt-8 space-y-4 w-full max-w-md'>
            {/* Video Option */}
            <div className='p-4 border rounded-lg'>
              <div className='flex items-center gap-3'>
                <input 
                  type='checkbox' 
                  id='includeVideos'
                  checked={formData.includeVideos || false}
                  onChange={(e) => handleUserInput('includeVideos', e.target.checked)}
                  className='w-5 h-5 cursor-pointer'
                />
                <label htmlFor='includeVideos' className='flex items-center gap-2 cursor-pointer'>
                  <Video className='w-5 h-5 text-primary' />
                  <span className='font-medium'>Include Related YouTube Videos</span>
                </label>
              </div>
              <p className='text-xs text-gray-500 mt-2 ml-8'>Get curated video suggestions for each chapter</p>
            </div>

            {/* Public/Private Toggle */}
            <div className='p-4 border rounded-lg'>
              <div className='flex items-center gap-3'>
                <input 
                  type='checkbox' 
                  id='isPublic'
                  checked={formData.isPublic || false}
                  onChange={(e) => handleUserInput('isPublic', e.target.checked)}
                  className='w-5 h-5 cursor-pointer'
                />
                <label htmlFor='isPublic' className='flex items-center gap-2 cursor-pointer'>
                  {formData.isPublic ? (
                    <Globe className='w-5 h-5 text-green-600' />
                  ) : (
                    <Lock className='w-5 h-5 text-slate-600' />
                  )}
                  <span className='font-medium'>Make Course Public</span>
                </label>
              </div>
              <p className='text-xs text-gray-500 mt-2 ml-8'>
                {formData.isPublic 
                  ? 'Other users can discover and enroll in this course' 
                  : 'Only you can access this course'}
              </p>
            </div>

            {/* Category Selection */}
            <div className='p-4 border rounded-lg'>
              <label className='font-medium mb-2 block'>Category</label>
              <select
                value={formData.category || 'General'}
                onChange={(e) => handleUserInput('category', e.target.value)}
                className='w-full p-2 border rounded-lg outline-none'
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Tags Input */}
            <div className='p-4 border rounded-lg'>
              <label className='font-medium mb-2 flex items-center gap-2'>
                <Tag className='w-4 h-4' />
                Tags (Optional)
              </label>
              <div className='flex gap-2 mb-2'>
                <input
                  type='text'
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      const currentTags = formData.tags || [];
                      if (!currentTags.includes(tagInput.trim())) {
                        handleUserInput('tags', [...currentTags, tagInput.trim()]);
                      }
                      setTagInput('');
                    }
                  }}
                  placeholder='Add tags (press Enter)'
                  className='flex-1 p-2 border rounded-lg outline-none text-sm'
                />
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {formData.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1'
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const newTags = formData.tags.filter((_, i) => i !== idx);
                          handleUserInput('tags', newTags);
                        }}
                        className='text-blue-900 hover:text-red-600'
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className='flex justify-between w-full mt-32'>
           {step!=0? <Button variant="outline" onClick={()=>setStep(step-1)}>Previous</Button>:'-'}
            {step==0?<Button onClick={()=>setStep(step+1)}>Next</Button>:
            <Button onClick={GenerateCourseOutline} disabled={loading} >
              {loading?<Loader className=' animate-spin' />:'Generate' }</Button>}
        </div>
    </div>
  )
}

export default Create