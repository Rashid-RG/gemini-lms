'use client'
import React from 'react'
import { Play, ExternalLink } from 'lucide-react'

function YouTubeVideos({ videos, course }) {
  if (!videos || Object.keys(videos).length === 0) {
    return null;
  }

  return (
    <div className='mt-10 mb-10'>
      <h3 className='font-bold text-2xl mb-5 flex items-center gap-2'>
        <Play className='w-6 h-6 text-primary' />
        Related YouTube Videos
      </h3>
      
      <div className='space-y-8'>
        {Object.entries(videos).map(([chapterTitle, videoList]) => (
          <div key={chapterTitle} className='bg-slate-50 rounded-lg p-4'>
            <h4 className='font-bold text-lg mb-4 text-gray-800'>{chapterTitle}</h4>
            
            {videoList && videoList.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {videoList.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200'
                  >
                    <div className='relative pb-[56.25%] h-0 overflow-hidden bg-gray-200'>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className='absolute top-0 left-0 w-full h-full object-cover hover:opacity-75 transition-opacity'
                      />
                      <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all'>
                        <Play className='w-12 h-12 text-white opacity-0 hover:opacity-100 transition-opacity' />
                      </div>
                    </div>
                    
                    <div className='p-3'>
                      <h5 className='font-semibold text-sm line-clamp-2 text-gray-800 hover:text-primary'>
                        {video.title}
                      </h5>
                      <p className='text-xs text-gray-600 mt-1'>{video.channel}</p>
                      <div className='flex items-center gap-1 mt-2 text-primary text-xs font-medium'>
                        <ExternalLink className='w-3 h-3' />
                        Watch on YouTube
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className='text-gray-500 text-sm'>No videos found for this chapter</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default YouTubeVideos
