"use client"
import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Trophy, Medal, Award, TrendingUp, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [includeAnonymous, setIncludeAnonymous] = useState(false)

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const res = await axios.get(
        `/api/leaderboard?limit=100&includeAnonymous=${includeAnonymous}`
      )
      setLeaderboard(res?.data?.result || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [includeAnonymous])

  // Initial load and when filter changes
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Refetch on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchLeaderboard])

  const getBadgeIcon = (badge) => {
    if (badge === 'gold') return <Trophy className="w-6 h-6 text-yellow-500" />
    if (badge === 'silver') return <Medal className="w-6 h-6 text-gray-400" />
    if (badge === 'bronze') return <Award className="w-6 h-6 text-orange-600" />
    return null
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300'
    if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300'
    if (rank === 3) return 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300'
    return 'bg-white border-slate-200'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Global Leaderboard
          </h1>
          <p className="text-slate-600">
            Top performing students in the GEMINI LMS community
          </p>
        </div>
        <button 
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Toggle Anonymous */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setIncludeAnonymous(!includeAnonymous)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-purple-300 transition-all"
        >
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">
            {includeAnonymous ? "Show Anonymous" : "Hide Anonymous"}
          </span>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No rankings yet</p>
            <p className="text-sm text-slate-500">Complete courses to appear on the leaderboard</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${getRankColor(
                entry.rank
              )}`}
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Rank */}
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-slate-800 w-10 text-center">
                    #{entry.rank}
                  </div>
                  {entry.badge && (
                    <div className="p-2 bg-white rounded-full shadow-md">
                      {getBadgeIcon(entry.badge)}
                    </div>
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-800">
                    {entry.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {entry.isAnonymous && '🔒 Anonymous'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {entry.totalCoursesCompleted}
                    </div>
                    <div className="text-xs text-slate-500">Courses</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {entry.totalPoints}
                    </div>
                    <div className="text-xs text-slate-500">Points</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-amber-500">
                        {parseFloat(entry.averageRating).toFixed(1)}
                      </span>
                      <span className="text-yellow-500">⭐</span>
                    </div>
                    <div className="text-xs text-slate-500">Avg Rating</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Badge System</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold text-slate-800">Gold Badge</p>
              <p className="text-xs text-slate-600">#1 Rank</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
            <Medal className="w-6 h-6 text-gray-400" />
            <div>
              <p className="font-semibold text-slate-800">Silver Badge</p>
              <p className="text-xs text-slate-600">#2 Rank</p>
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 flex items-center gap-3">
            <Award className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-semibold text-slate-800">Bronze Badge</p>
              <p className="text-xs text-slate-600">#3 Rank</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage
