"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import AssignmentSubmission from '../_components/AssignmentSubmission'

// Safe JSON parsing helper
const safeJsonParse = (value, fallback = {}) => {
  try {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value || fallback;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
};

function AssignmentsPage() {
    const { courseId } = useParams()
    const { user } = useUser()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedAssignment, setSelectedAssignment] = useState(null)

    useEffect(() => {
        if (courseId) {
            fetchAssignments()
        }
    }, [courseId])

    const fetchAssignments = async () => {
        try {
            const response = await axios.get(`/api/course-assignments?courseId=${courseId}`)
            setAssignments(response.data.result || [])
            if (response.data.result?.length > 0) {
                setSelectedAssignment(response.data.result[0])
            }
            setError(null)
        } catch (err) {
            console.error('Error fetching assignments:', err)
            setError('Failed to load assignments')
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Graded':
                return <CheckCircle className="w-5 h-5 text-green-600" />
            case 'Submitted':
                return <Clock className="w-5 h-5 text-blue-600" />
            default:
                return <FileText className="w-5 h-5 text-slate-400" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Graded':
                return 'bg-green-50 border-green-200'
            case 'Submitted':
                return 'bg-blue-50 border-blue-200'
            default:
                return 'bg-slate-50 border-slate-200'
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
                    <div className="h-32 bg-slate-200 rounded-lg"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    {error}
                </div>
            </div>
        )
    }

    if (assignments.length === 0) {
        return (
            <div className="p-8">
                <div className="text-center py-16">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Assignments Yet</h3>
                    <p className="text-slate-600">Assignments will appear here once your instructor creates them.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Course Assignments</h1>
                <p className="text-slate-600">Submit your assignments and receive AI-powered feedback and grading</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assignments List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">Assignments ({assignments.length})</h2>
                        </div>
                        <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                            {assignments.map((assignment) => (
                                <button
                                    key={assignment.id}
                                    onClick={() => setSelectedAssignment(assignment)}
                                    className={`w-full p-4 text-left hover:bg-slate-50 transition ${
                                        selectedAssignment?.id === assignment.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">
                                                {assignment.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Points: {assignment.totalPoints}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Assignment Details and Submission */}
                <div className="lg:col-span-2">
                    {selectedAssignment && user && (
                        <div className="space-y-6">
                            {/* Assignment Details */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">
                                            {selectedAssignment.title}
                                        </h2>
                                        <p className="text-slate-600 mt-1">
                                            Total Points: <span className="font-semibold text-slate-900">
                                                {selectedAssignment.totalPoints}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="prose prose-sm max-w-none">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Description</h3>
                                    <p className="text-slate-700 leading-relaxed">
                                        {selectedAssignment.description}
                                    </p>
                                </div>

                                {selectedAssignment.dueDate && (
                                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-900">
                                            <strong>Due Date:</strong> {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {selectedAssignment.rubric && Object.keys(safeJsonParse(selectedAssignment.rubric)).length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-3">Grading Rubric</h3>
                                        <div className="space-y-2">
                                            {Object.entries(safeJsonParse(selectedAssignment.rubric)).map(([criterion, points]) => (
                                                <div key={criterion} className="flex justify-between p-2 bg-slate-50 rounded">
                                                    <span className="text-slate-700">{criterion}</span>
                                                    <span className="font-semibold text-slate-900">{points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submission Component */}
                            <AssignmentSubmission
                                assignmentId={selectedAssignment.assignmentId}
                                courseId={courseId}
                                studentEmail={user?.primaryEmailAddress?.emailAddress}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AssignmentsPage
