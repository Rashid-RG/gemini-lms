"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Loader2, 
    Save, 
    ArrowLeft, 
    CheckCircle, 
    AlertTriangle,
    Eye,
    Code,
    FileText,
    Plus,
    Trash2,
    HelpCircle,
    RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import DOMPurify from 'dompurify'

// =========================================
// Sub-editors for each content type
// =========================================

/** Quiz / MCQ Editor — edit questions, options, correct answer visually */
function QuizEditor({ content, onChange }) {
    const data = typeof content === 'string' ? (() => { try { return JSON.parse(content) } catch { return {} } })() : content
    const questions = data?.questions || (Array.isArray(data) ? data : [])
    const quizTitle = data?.quizTitle || ''

    const updateQuestion = (idx, field, value) => {
        const updated = [...questions]
        updated[idx] = { ...updated[idx], [field]: value }
        onChange({ quizTitle, questions: updated })
    }

    const updateOption = (qIdx, oIdx, value) => {
        const updated = [...questions]
        const opts = [...(updated[qIdx].options || [])]
        const wasCorrect = opts[oIdx] === updated[qIdx].answer
        opts[oIdx] = value
        updated[qIdx] = { ...updated[qIdx], options: opts }
        // If this option was the correct answer, update answer text to match
        if (wasCorrect) {
            updated[qIdx] = { ...updated[qIdx], answer: value }
        }
        onChange({ quizTitle, questions: updated })
    }

    const addOption = (qIdx) => {
        const updated = [...questions]
        const opts = [...(updated[qIdx].options || []), '']
        updated[qIdx] = { ...updated[qIdx], options: opts }
        onChange({ quizTitle, questions: updated })
    }

    const removeOption = (qIdx, oIdx) => {
        const updated = [...questions]
        const opts = (updated[qIdx].options || []).filter((_, i) => i !== oIdx)
        updated[qIdx] = { ...updated[qIdx], options: opts }
        onChange({ quizTitle, questions: updated })
    }

    const addQuestion = () => {
        onChange({ quizTitle, questions: [...questions, { question: '', options: ['', '', '', ''], answer: '' }] })
    }

    const removeQuestion = (idx) => {
        onChange({ quizTitle, questions: questions.filter((_, i) => i !== idx) })
    }

    return (
        <div className="space-y-6">
            {/* Quiz Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quiz Title</label>
                <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => onChange({ quizTitle: e.target.value, questions })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 text-sm"
                    placeholder="Quiz Title"
                />
            </div>

            {/* Questions */}
            {questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Question Header */}
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary font-bold text-sm w-8 h-8 rounded-full flex items-center justify-center">
                                {qIdx + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Question {qIdx + 1}</span>
                        </div>
                        <button
                            onClick={() => removeQuestion(qIdx)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete question"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Question Text */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Question</label>
                            <textarea
                                value={q.question || ''}
                                onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 text-sm min-h-[60px] resize-y"
                                placeholder="Enter the question..."
                            />
                        </div>

                        {/* Options */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Options <span className="text-green-600">(click circle to mark correct answer)</span>
                            </label>
                            <div className="space-y-2">
                                {(q.options || []).map((opt, oIdx) => {
                                    const isCorrect = opt && opt === q.answer
                                    return (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion(qIdx, 'answer', opt)}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                    isCorrect
                                                        ? 'border-green-500 bg-green-500 text-white'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                                }`}
                                                title={isCorrect ? 'Correct answer ✓' : 'Click to set as correct answer'}
                                            >
                                                {isCorrect ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs text-gray-400">{String.fromCharCode(65 + oIdx)}</span>}
                                            </button>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                className={`flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 ${
                                                    isCorrect
                                                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                                        : 'dark:border-gray-600'
                                                }`}
                                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                            />
                                            {(q.options || []).length > 2 && (
                                                <button
                                                    onClick={() => removeOption(qIdx, oIdx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                    title="Remove option"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            {(q.options || []).length < 6 && (
                                <button
                                    onClick={() => addOption(qIdx)}
                                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add option
                                </button>
                            )}
                        </div>

                        {/* Correct Answer Display */}
                        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                            q.answer ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                            <CheckCircle className={`h-4 w-4 flex-shrink-0 ${q.answer ? 'text-green-600' : 'text-red-400'}`} />
                            <span className={`text-xs font-medium ${q.answer ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                                Correct Answer:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {q.answer || '⚠ Not set — click an option above'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            <Button onClick={addQuestion} variant="outline" className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add New Question
            </Button>
        </div>
    )
}

/** Flashcard Editor — edit front/back */
function FlashcardEditor({ content, onChange }) {
    const cards = Array.isArray(content) ? content : (() => { try { return typeof content === 'string' ? JSON.parse(content) : [] } catch { return [] } })()

    const updateCard = (idx, field, value) => {
        const updated = [...cards]
        updated[idx] = { ...updated[idx], [field]: value }
        onChange(updated)
    }

    const addCard = () => {
        onChange([...cards, { front: '', back: '' }])
    }

    const removeCard = (idx) => {
        onChange(cards.filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-4">
            {cards.map((card, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 flex items-center justify-between border-b dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Card {idx + 1}</span>
                        <button onClick={() => removeCard(idx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Front (Question)</label>
                            <textarea
                                value={card.front || ''}
                                onChange={(e) => updateCard(idx, 'front', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 text-sm min-h-[80px] resize-y"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Back (Answer)</label>
                            <textarea
                                value={card.back || ''}
                                onChange={(e) => updateCard(idx, 'back', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 text-sm min-h-[80px] resize-y"
                            />
                        </div>
                    </div>
                </div>
            ))}
            <Button onClick={addCard} variant="outline" className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add New Flashcard
            </Button>
        </div>
    )
}

/** Notes Editor — HTML editor with preview */
function NotesEditor({ content, onChange, viewMode }) {
    if (viewMode === 'preview') {
        return (
            <div 
                className="prose dark:prose-invert max-w-none p-6"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '') }}
            />
        )
    }
    return (
        <textarea
            value={content || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[500px] p-6 font-mono text-sm dark:bg-gray-900 dark:text-gray-200 border-none outline-none resize-y"
            spellCheck={true}
        />
    )
}

/** JSON Editor — raw JSON for course outlines or unknown types */
function JsonEditor({ content, onChange, viewMode }) {
    const [rawText, setRawText] = useState('')
    
    useEffect(() => {
        if (typeof content === 'object' && content !== null) {
            setRawText(JSON.stringify(content, null, 2))
        } else {
            setRawText(content || '')
        }
    }, [])

    const handleChange = (val) => {
        setRawText(val)
        try { onChange(JSON.parse(val)) } catch { /* allow invalid JSON while typing */ }
    }

    if (viewMode === 'preview') {
        return (
            <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200 p-6">
                {rawText}
            </pre>
        )
    }
    return (
        <textarea
            value={rawText}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full min-h-[500px] p-6 font-mono text-sm dark:bg-gray-900 dark:text-gray-200 border-none outline-none resize-y"
            spellCheck={false}
        />
    )
}

// =========================================
// Main Edit Page
// =========================================

function ContentEditPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const router = useRouter()
    const params = useParams()
    const reviewId = params.reviewId

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [review, setReview] = useState(null)
    const [courseInfo, setCourseInfo] = useState(null)
    const [editedContent, setEditedContent] = useState(null)
    const [originalContent, setOriginalContent] = useState(null)
    const [reviewNotes, setReviewNotes] = useState('')
    const [viewMode, setViewMode] = useState('edit')

    useEffect(() => {
        if (!authLoading && admin && reviewId) {
            fetchReviewDetail()
        }
    }, [authLoading, admin, reviewId])

    const fetchReviewDetail = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`/api/admin/content-review/${reviewId}`)
            const data = response.data
            setReview(data.review)
            setCourseInfo(data.courseInfo)

            // Use originalContent from review, or currentContent from live DB
            const content = data.review.originalContent || data.currentContent
            setOriginalContent(content)
            
            // Deep clone for editing
            if (typeof content === 'object' && content !== null) {
                setEditedContent(JSON.parse(JSON.stringify(content)))
            } else {
                setEditedContent(content || '')
            }
        } catch (error) {
            console.error('Error fetching review:', error)
            toast.error('Failed to load content for editing')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            // Validate quiz/mcq content
            if (isQuizType && typeof editedContent === 'object') {
                const questions = editedContent?.questions || []
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i]
                    if (!q.question?.trim()) {
                        toast.error(`Question ${i + 1} is empty`)
                        setSaving(false)
                        return
                    }
                    if (!q.answer?.trim()) {
                        toast.error(`Question ${i + 1} has no correct answer selected`)
                        setSaving(false)
                        return
                    }
                    if (!q.options || q.options.length < 2) {
                        toast.error(`Question ${i + 1} needs at least 2 options`)
                        setSaving(false)
                        return
                    }
                    const emptyOpts = q.options.filter(o => !o?.trim())
                    if (emptyOpts.length > 0) {
                        toast.error(`Question ${i + 1} has empty options`)
                        setSaving(false)
                        return
                    }
                }
            }

            await axios.post('/api/admin/content-review', {
                reviewId: parseInt(reviewId),
                action: 'edit',
                editedContent,
                reviewNotes: reviewNotes || 'Content edited by admin',
            })

            toast.success('Content saved! Changes are now live for students.')
            router.push('/admin/content-review')
        } catch (error) {
            console.error('Error saving edit:', error)
            toast.error('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const resetContent = () => {
        if (typeof originalContent === 'object' && originalContent !== null) {
            setEditedContent(JSON.parse(JSON.stringify(originalContent)))
        } else {
            setEditedContent(originalContent || '')
        }
        toast.info('Content reset to original')
    }

    const isQuizType = ['quiz', 'mcq'].includes(review?.contentType)
    const isFlashcard = review?.contentType === 'flashcards'
    const isNotes = review?.contentType === 'notes'

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!review) {
        return (
            <div className="text-center py-20">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium">Review not found</h3>
                <Button variant="outline" onClick={() => router.push('/admin/content-review')} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reviews
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/admin/content-review')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            Edit {isQuizType ? 'Quiz/MCQ' : isFlashcard ? 'Flashcards' : isNotes ? 'Notes' : 'Content'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {courseInfo?.topic} · {review.contentType?.replace('_', ' ')}
                            {review.contentId ? ` · Chapter ${review.contentId}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={resetContent}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
                    </Button>
                    {(isNotes || (!isQuizType && !isFlashcard)) && (
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    viewMode === 'edit' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'
                                }`}
                            >
                                <FileText className="h-3.5 w-3.5 inline mr-1" /> Edit
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    viewMode === 'preview' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5 inline mr-1" /> Preview
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Course Context */}
            {courseInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">Course:</span> {courseInfo.topic}</div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">Type:</span> {courseInfo.courseType}</div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">Difficulty:</span> {courseInfo.difficultyLevel}</div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">Creator:</span> {courseInfo.creatorName ? (courseInfo.createdBy ? `${courseInfo.creatorName} (${courseInfo.createdBy})` : courseInfo.creatorName) : (courseInfo.createdBy || 'Unknown')}</div>
                    </div>
                </div>
            )}

            {/* Flag Info */}
            {review.flagReason && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span><strong>Student Report:</strong> {review.flagReason}</span>
                    </p>
                    {review.flaggedBy && (
                        <p className="text-xs text-orange-500 mt-1 ml-6">Reported by: {review.flaggedBy}</p>
                    )}
                </div>
            )}

            {/* No Content Warning */}
            {!editedContent && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        No content found for this item. The content may have been deleted or the course may not have generated this type yet.
                    </p>
                </div>
            )}

            {/* Content Editor — type-specific */}
            {editedContent && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="border-b dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                        {isQuizType && <HelpCircle className="h-4 w-4 text-primary" />}
                        {isFlashcard && <FileText className="h-4 w-4 text-primary" />}
                        {isNotes && <FileText className="h-4 w-4 text-primary" />}
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                            {isQuizType ? `Quiz Questions (${(typeof editedContent === 'object' ? editedContent?.questions?.length : 0) || 0} questions)` : 
                             isFlashcard ? `Flashcards (${Array.isArray(editedContent) ? editedContent.length : 0} cards)` :
                             isNotes ? 'Chapter Notes (HTML)' : 'Content (JSON)'}
                        </span>
                    </div>

                    <div className="p-4">
                        {isQuizType ? (
                            <QuizEditor content={editedContent} onChange={setEditedContent} />
                        ) : isFlashcard ? (
                            <FlashcardEditor content={editedContent} onChange={setEditedContent} />
                        ) : isNotes ? (
                            <NotesEditor content={editedContent} onChange={setEditedContent} viewMode={viewMode} />
                        ) : (
                            <JsonEditor content={editedContent} onChange={setEditedContent} viewMode={viewMode} />
                        )}
                    </div>
                </div>
            )}

            {/* Review Notes */}
            <div>
                <label className="block font-medium text-gray-900 dark:text-white mb-2">
                    Review Notes
                </label>
                <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Describe what you changed (e.g., 'Fixed answer for Q3 from A to B', 'Corrected factual error in Q5')..."
                    className="w-full p-3 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-600 min-h-[80px]"
                />
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-between sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-4 -mx-4 sm:-mx-6 border-t rounded-b-xl">
                <p className="text-xs text-gray-400">
                    Changes will be applied immediately and students will see the updated content.
                </p>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => router.push('/admin/content-review')}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={saving || !editedContent}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save & Apply Changes
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ContentEditPage
