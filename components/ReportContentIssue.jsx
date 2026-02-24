"use client"
import React, { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Flag, 
    Loader2, 
    CheckCircle, 
    X,
    AlertTriangle,
    MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'

const ISSUE_TYPES = [
    { value: 'inaccurate', label: '❌ Inaccurate Information', desc: 'Content contains factual errors' },
    { value: 'wrong_answer', label: '🔴 Wrong Answer', desc: 'Quiz/flashcard has incorrect answer' },
    { value: 'unclear', label: '😕 Unclear Content', desc: 'Content is confusing or hard to understand' },
    { value: 'incomplete', label: '📝 Incomplete', desc: 'Important information is missing' },
    { value: 'inappropriate', label: '⚠️ Inappropriate', desc: 'Content is offensive or inappropriate' },
    { value: 'other', label: '💬 Other', desc: 'Another type of issue' },
]

/**
 * ReportContentIssue - Button + Modal for students to report AI content mistakes
 * 
 * Usage:
 * <ReportContentIssue 
 *   courseId="abc-123" 
 *   contentType="notes" 
 *   contentId="2" 
 *   specificContent="The formula shown is E=mc³" 
 * />
 */
export default function ReportContentIssue({ 
    courseId, 
    contentType, 
    contentId = null,
    specificContent = null,
    compact = false 
}) {
    const { user } = useUser()
    const [isOpen, setIsOpen] = useState(false)
    const [issueType, setIssueType] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!issueType || !description.trim()) {
            toast.error('Please select an issue type and provide a description')
            return
        }

        if (description.trim().length < 10) {
            toast.error('Please provide a more detailed description (at least 10 characters)')
            return
        }

        try {
            setSubmitting(true)
            const email = user?.primaryEmailAddress?.emailAddress
            
            if (!email) {
                toast.error('Please sign in to report an issue')
                return
            }

            await axios.post('/api/content-feedback', {
                courseId,
                contentType,
                contentId,
                studentEmail: email,
                issueType,
                description: description.trim(),
                specificContent,
            })

            setSubmitted(true)
            toast.success('Thank you! Your report has been submitted.')
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setIsOpen(false)
                setSubmitted(false)
                setIssueType('')
                setDescription('')
            }, 2000)
        } catch (error) {
            const msg = error.response?.data?.error || 'Failed to submit report'
            toast.error(msg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            {/* Trigger Button */}
            {compact ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-gray-400 hover:text-orange-500 transition-colors p-1 rounded"
                    title="Report an issue with this content"
                >
                    <Flag className="h-4 w-4" />
                </button>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="text-gray-500 hover:text-orange-600 gap-1.5"
                >
                    <Flag className="h-4 w-4" />
                    Report Issue
                </Button>
            )}

            {/* Modal */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => !submitting && setIsOpen(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Report Content Issue
                                </h3>
                            </div>
                            <button 
                                onClick={() => !submitting && setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        {submitted ? (
                            /* Success State */
                            <div className="p-8 text-center">
                                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                    Report Submitted!
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Our team will review this content. Thank you for helping improve the learning experience!
                                </p>
                            </div>
                        ) : (
                            /* Form */
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Help us improve! Report any issues with AI-generated content.
                                </p>

                                {/* Issue Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        What&apos;s the issue?
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ISSUE_TYPES.map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setIssueType(type.value)}
                                                className={`text-left p-3 rounded-lg border text-sm transition-all ${
                                                    issueType === type.value
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {type.label}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {type.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Describe the issue
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Please explain what's wrong with the content. Be as specific as possible (e.g., 'The answer to question 3 should be B, not A because...')"
                                        className="w-full p-3 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-600 min-h-[100px] resize-y"
                                        maxLength={2000}
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        {description.length}/2000 characters
                                    </p>
                                </div>

                                {/* Specific Content Preview */}
                                {specificContent && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border">
                                        <p className="text-xs font-medium text-gray-500 mb-1">Content in question:</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                            {specificContent}
                                        </p>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => setIsOpen(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit"
                                        disabled={submitting || !issueType || description.trim().length < 10}
                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                        )}
                                        Submit Report
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
