"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Star, Send, Loader2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

function CourseRating({ courseId, courseTopic }) {
    const { user } = useUser()
    const userEmail = user?.primaryEmailAddress?.emailAddress
    
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [reviewText, setReviewText] = useState('')
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [existingReview, setExistingReview] = useState(null)
    const [allReviews, setAllReviews] = useState([])
    const [showReviews, setShowReviews] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (courseId) {
            fetchReviews()
        }
    }, [courseId, userEmail])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const res = await axios.get(`/api/reviews?courseId=${courseId}`)
            const reviews = res.data.result || []
            setAllReviews(reviews)
            
            // Find user's existing review
            if (userEmail) {
                const myReview = reviews.find(r => r.studentEmail === userEmail)
                if (myReview) {
                    setExistingReview(myReview)
                    setRating(myReview.rating)
                    setReviewText(myReview.reviewText || '')
                    setIsAnonymous(myReview.isAnonymous || false)
                }
            }
        } catch (error) {
            console.error('Error fetching reviews:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitReview = async () => {
        if (!userEmail) {
            toast.error('Please sign in to submit a review')
            return
        }

        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        try {
            setSubmitting(true)
            await axios.post('/api/reviews', {
                courseId,
                studentEmail: userEmail,
                rating,
                reviewText,
                isAnonymous
            })
            
            toast.success(existingReview ? 'Review updated!' : 'Review submitted!')
            fetchReviews()
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const averageRating = allReviews.length > 0 
        ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
        : 0

    const StarButton = ({ value }) => (
        <button
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
        >
            <Star 
                className={`h-6 w-6 ${
                    value <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                }`}
            />
        </button>
    )

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Header with average rating */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Rate This Course
                </h3>
                {allReviews.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold">{averageRating}</span>
                        </div>
                        <span className="text-gray-500">({allReviews.length} review{allReviews.length !== 1 ? 's' : ''})</span>
                    </div>
                )}
            </div>

            {/* Rating form */}
            <div className="space-y-4">
                {/* Star rating */}
                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Your Rating {existingReview && <span className="text-green-600">(updating)</span>}
                    </label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(value => (
                            <StarButton key={value} value={value} />
                        ))}
                        <span className="ml-2 text-sm text-gray-500">
                            {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Select rating'}
                        </span>
                    </div>
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Your Comment (optional)
                    </label>
                    <Textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this course..."
                        rows={3}
                        className="resize-none"
                    />
                </div>

                {/* Anonymous toggle */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="anonymous"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    <label htmlFor="anonymous" className="text-sm text-gray-600 dark:text-gray-400">
                        Post anonymously
                    </label>
                </div>

                {/* Submit button */}
                <Button 
                    onClick={handleSubmitReview}
                    disabled={submitting || rating === 0}
                    className="w-full"
                >
                    {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    {existingReview ? 'Update Review' : 'Submit Review'}
                </Button>
            </div>

            {/* Show all reviews toggle */}
            {allReviews.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setShowReviews(!showReviews)}
                        className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                        <span>View all {allReviews.length} review{allReviews.length !== 1 ? 's' : ''}</span>
                        {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showReviews && (
                        <div className="mt-4 space-y-4 max-h-64 overflow-y-auto">
                            {allReviews.map((review, index) => (
                                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star 
                                                        key={star}
                                                        className={`h-3 w-3 ${
                                                            star <= review.rating
                                                                ? 'text-yellow-400 fill-yellow-400'
                                                                : 'text-gray-300'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {review.isAnonymous ? 'Anonymous' : review.studentEmail}
                                            </span>
                                        </div>
                                    </div>
                                    {review.reviewText && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{review.reviewText}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default CourseRating
