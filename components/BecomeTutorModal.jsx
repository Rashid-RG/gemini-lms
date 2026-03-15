"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'

export default function BecomeTutorModal({ userEmail, userName, isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    experienceLevel: 'beginner',
    subjectExpertise: '',
    motivation: '',
    certifications: ''
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.subjectExpertise.trim() || !formData.motivation.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/user/tutor-request', {
        userEmail,
        userName,
        ...formData
      })

      toast.success('Tutor request submitted! Admins will review your application.')
      setFormData({
        experienceLevel: 'beginner',
        subjectExpertise: '',
        motivation: '',
        certifications: ''
      })
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to submit request'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Become a Tutor</h2>
            <p className="text-blue-100 text-sm mt-1">Share your expertise & earn</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.experienceLevel}
              onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner (1-2 years)</option>
              <option value="intermediate">Intermediate (2-5 years)</option>
              <option value="advanced">Advanced (5-10 years)</option>
              <option value="expert">Expert (10+ years)</option>
            </select>
          </div>

          {/* Subject Expertise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Expertise <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.subjectExpertise}
              onChange={(e) => handleInputChange('subjectExpertise', e.target.value)}
              placeholder="What subjects/topics can you teach? (e.g., Python, Mathematics, English, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
            <p className="text-xs text-gray-500 mt-1">Tell us about your areas of expertise</p>
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you want to be a tutor? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.motivation}
              onChange={(e) => handleInputChange('motivation', e.target.value)}
              placeholder="Share your motivation and goals as a tutor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
            <p className="text-xs text-gray-500 mt-1">Help admins understand your goals</p>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certifications & Qualifications
            </label>
            <textarea
              value={formData.certifications}
              onChange={(e) => handleInputChange('certifications', e.target.value)}
              placeholder="Any relevant degrees, certifications, or credentials? (Optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - helps strengthen your application</p>
          </div>

          {/* Benefits Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Benefits of becoming a tutor:</strong>
            </p>
            <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li>Create and manage your own courses</li>
              <li>Reach thousands of students</li>
              <li>Earn credits & revenue</li>
              <li>Build your teaching portfolio</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
