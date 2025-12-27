'use client'

import { createContext, useContext, useState } from 'react'

const ChapterContext = createContext()

export function ChapterProvider({ children, chapters = [] }) {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0)

    return (
        <ChapterContext.Provider value={{ currentChapterIndex, setCurrentChapterIndex, chapters }}>
            {children}
        </ChapterContext.Provider>
    )
}

export function useChapter() {
    const context = useContext(ChapterContext)
    if (!context) {
        throw new Error('useChapter must be used within ChapterProvider')
    }
    return context
}
