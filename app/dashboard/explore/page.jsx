"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import Link from 'next/link'
import { Search, Filter, BookOpen, Clock, TrendingUp, Users, CheckCircle, Star, Mail, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['All', 'General', 'Programming', 'Business', 'Design', 'Science', 'Language', 'Mathematics', 'Other']

function ExplorePage() {
  const { user } = useUser()
  const router = useRouter()
  const [courses, setCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedCourseForReview, setSelectedCourseForReview] = useState(null)
  const [reviewData, setReviewData] = useState({ rating: 5, reviewText: '', isAnonymous: false })
  const [courseReviews, setCourseReviews] = useState({})

  useEffect(() => {
    fetchPublicCourses()
  }, [])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, selectedCategory])

  const fetchPublicCourses = async () => {
    try {
      const res = await axios.get('/api/public-courses')
      const publicCourses = res?.data?.result || []
      setCourses(publicCourses)
      
      // Check which courses user is enrolled in
      if (user?.primaryEmailAddress?.emailAddress) {
        const userEmail = user.primaryEmailAddress.emailAddress
        const enrolled = publicCourses.filter(c => 
          c.createdBy === userEmail || (c.enrolledUsers || []).includes(userEmail)
        ).map(c => c.courseId)
        setEnrolledCourses(enrolled)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = courses

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.courseType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCourses(filtered)
  }

  const handleEnroll = async (courseId) => {
    const userEmail = user?.primaryEmailAddress?.emailAddress
    if (!userEmail) return

    try {
      const res = await axios.post('/api/enroll', { courseId, userEmail })
      if (res.data.enrolled || res.data.alreadyEnrolled) {
        setEnrolledCourses([...enrolledCourses, courseId])
        router.push(`/course/${courseId}`)
      }
    } catch (error) {
      console.error('Error enrolling:', error)
    }
  }

  const handleSubmitReview = async () => {
    const userEmail = user?.primaryEmailAddress?.emailAddress
    if (!userEmail || !selectedCourseForReview) return

    try {
      const res = await axios.post('/api/reviews', {
        courseId: selectedCourseForReview,
        studentEmail: userEmail,
        rating: reviewData.rating,
        reviewText: reviewData.reviewText,
        isAnonymous: reviewData.isAnonymous
      })

      // Fetch updated reviews
      const reviewsRes = await axios.get(`/api/reviews?courseId=${selectedCourseForReview}`)
      setCourseReviews(prev => ({
        ...prev,
        [selectedCourseForReview]: reviewsRes.data.result
      }))

      setShowReviewModal(false)
      setReviewData({ rating: 5, reviewText: '', isAnonymous: false })
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const isEnrolled = (courseId) => enrolledCourses.includes(courseId)

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading courses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Explore Courses
        </h1>
        <p className="text-slate-600">
          Discover and enroll in courses created by the community
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-5 h-5 text-slate-500" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-600">
        {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No courses found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrolled = isEnrolled(course.courseId)
            const enrollCount = (course.enrolledUsers || []).length
            const chapters = course.courseLayout?.chapters || []

            return (
              <div
                key={course.courseId}
                className="bg-white rounded-xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Course Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 line-clamp-2">{course.topic}</h3>
                      <div className="flex items-center gap-2 text-xs text-blue-100">
                        <BookOpen className="w-3 h-3" />
                        <span>{course.courseType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-white/20 rounded-full">{course.category}</span>
                    <span className="px-2 py-1 bg-white/20 rounded-full">{course.difficultyLevel}</span>
                  </div>
                </div>

                {/* Course Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{chapters.length} chapters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{enrollCount} enrolled</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <div>
                        <p className="font-semibold text-amber-900">
                          {parseFloat(course.averageRating || 0).toFixed(1)} / 5.0
                        </p>
                        <p className="text-xs text-amber-700">{course.reviewCount || 0} reviews</p>
                      </div>
                    </div>
                    {enrolled && (
                      <button
                        onClick={() => {
                          setSelectedCourseForReview(course.courseId)
                          setShowReviewModal(true)
                        }}
                        className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-full font-medium"
                      >
                        Review
                      </button>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">Created by</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <p className="text-xs text-slate-600 truncate">{course.createdBy}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {enrolled ? (
                    <Link href={`/course/${course.courseId}`}>
                      <Button className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Continue Learning
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => handleEnroll(course.courseId)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setReviewData({ ...reviewData, rating: num })}
                    className={`text-2xl transition-transform ${
                      num <= reviewData.rating ? 'text-amber-500 scale-110' : 'text-slate-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Your Review (Optional)</label>
              <textarea
                value={reviewData.reviewText}
                onChange={(e) => setReviewData({ ...reviewData, reviewText: e.target.value })}
                placeholder="Share your thoughts about this course..."
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
              />
            </div>

            {/* Anonymous */}
            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={reviewData.isAnonymous}
                onChange={(e) => setReviewData({ ...reviewData, isAnonymous: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="anonymous" className="text-sm text-slate-600 cursor-pointer">
                Post anonymously
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExplorePage
