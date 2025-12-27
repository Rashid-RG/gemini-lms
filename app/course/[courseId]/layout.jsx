'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { ChapterProvider } from './_context/ChapterContext'

export default function CourseLayout({ children }) {
    const { courseId } = useParams()
    const [course, setCourse] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        GetCourse()
    }, [courseId])

    const GetCourse = async () => {
        try {
            const result = await axios.get('/api/courses?courseId=' + courseId)
            setCourse(result.data.result)
        } catch (error) {
            console.error('Error fetching course:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className='flex items-center justify-center min-h-screen'>Loading...</div>
    }

    const chapters = course?.courseLayout?.chapters || []

    return (
        <ChapterProvider chapters={chapters}>
            {children}
        </ChapterProvider>
    )
}
