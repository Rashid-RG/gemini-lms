"use client"
import React, { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Award, Flame, BookOpen, Target, Star, Trophy, Zap, Crown, Medal, CheckCircle, Rocket, Eye, Brain, GraduationCap, Sparkles, Clock, Heart, Coffee, Users, Lightbulb, Download, Share2, Twitter, Facebook, Linkedin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Define badge criteria and icons
const BADGES = [
  // 🚀 QUICK EARN BADGES (New User Friendly)
  {
    id: 'welcome',
    name: 'Welcome Learner',
    description: 'Create your first course',
    icon: Rocket,
    requirement: (stats) => stats.coursesCreated >= 1,
    color: 'emerald'
  },
  {
    id: 'curious-mind',
    name: 'Curious Mind',
    description: 'View your first note',
    icon: Eye,
    requirement: (stats) => stats.completedNotes >= 1,
    color: 'sky'
  },
  {
    id: 'first-flip',
    name: 'First Flip',
    description: 'View your first flashcard',
    icon: Sparkles,
    requirement: (stats) => stats.flashcardsCompleted >= 1,
    color: 'violet'
  },
  {
    id: 'quiz-taker',
    name: 'Quiz Taker',
    description: 'Complete your first quiz',
    icon: Brain,
    requirement: (stats) => stats.quizzesTaken >= 1,
    color: 'indigo'
  },
  {
    id: 'streak-1',
    name: 'Day One',
    description: 'Start your learning journey',
    icon: Coffee,
    requirement: (stats) => stats.currentStreak >= 1,
    color: 'amber'
  },
  
  // 📚 COURSE BADGES
  {
    id: 'first-course',
    name: 'First Steps',
    description: 'Complete your first course',
    icon: BookOpen,
    requirement: (stats) => stats.coursesCompleted >= 1,
    color: 'blue'
  },
  {
    id: 'courses-3',
    name: 'Getting Started',
    description: 'Complete 3 courses',
    icon: GraduationCap,
    requirement: (stats) => stats.coursesCompleted >= 3,
    color: 'teal'
  },
  {
    id: 'courses-5',
    name: 'Knowledge Seeker',
    description: 'Complete 5 courses',
    icon: Target,
    requirement: (stats) => stats.coursesCompleted >= 5,
    color: 'green'
  },
  {
    id: 'courses-10',
    name: 'Learning Champion',
    description: 'Complete 10 courses',
    icon: Trophy,
    requirement: (stats) => stats.coursesCompleted >= 10,
    color: 'amber'
  },
  
  // 🔥 STREAK BADGES
  {
    id: 'streak-3',
    name: '3-Day Streak',
    description: 'Maintain a 3-day learning streak',
    icon: Flame,
    requirement: (stats) => stats.currentStreak >= 3,
    color: 'orange'
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: Zap,
    requirement: (stats) => stats.currentStreak >= 7,
    color: 'yellow'
  },
  {
    id: 'streak-14',
    name: 'Two Week Titan',
    description: 'Maintain a 14-day learning streak',
    icon: Heart,
    requirement: (stats) => stats.currentStreak >= 14,
    color: 'rose'
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    icon: Crown,
    requirement: (stats) => stats.currentStreak >= 30,
    color: 'purple'
  },
  
  // ⭐ ACHIEVEMENT BADGES  
  {
    id: 'high-achiever',
    name: 'Quiz Mastery',
    description: 'Score 80% or higher on any quiz - Special Achievement!',
    icon: Target,
    requirement: (stats) => stats.highScoreQuizzes >= 1,
    color: 'orange'
  },
  {
    id: 'perfect-quiz',
    name: 'Perfect Score',
    description: 'Get 100% on any quiz',
    icon: Star,
    requirement: (stats) => stats.perfectQuizzes >= 1,
    color: 'yellow'
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: Lightbulb,
    requirement: (stats) => stats.quizzesTaken >= 10,
    color: 'lime'
  },
  {
    id: 'all-notes',
    name: 'Note Taker',
    description: 'Complete all notes in a course',
    icon: CheckCircle,
    requirement: (stats) => stats.allNotesCompleted >= 1,
    color: 'cyan'
  },
  {
    id: 'flashcard-10',
    name: 'Card Collector',
    description: 'View 10 flashcards',
    icon: Users,
    requirement: (stats) => stats.flashcardsCompleted >= 10,
    color: 'fuchsia'
  },
  {
    id: 'flashcard-50',
    name: 'Flashcard Fan',
    description: 'View 50 flashcards',
    icon: Award,
    requirement: (stats) => stats.flashcardsCompleted >= 50,
    color: 'rose'
  },
  {
    id: 'flashcard-master',
    name: 'Flashcard Master',
    description: 'View 100 flashcards',
    icon: Medal,
    requirement: (stats) => stats.flashcardsCompleted >= 100,
    color: 'pink'
  }
]

const COLOR_CLASSES = {
  blue: 'bg-blue-100 border-blue-300 text-blue-700',
  orange: 'bg-orange-100 border-orange-300 text-orange-700',
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  purple: 'bg-purple-100 border-purple-300 text-purple-700',
  green: 'bg-green-100 border-green-300 text-green-700',
  amber: 'bg-amber-100 border-amber-300 text-amber-700',
  cyan: 'bg-cyan-100 border-cyan-300 text-cyan-700',
  pink: 'bg-pink-100 border-pink-300 text-pink-700',
  // New colors for new badges
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  sky: 'bg-sky-100 border-sky-300 text-sky-700',
  violet: 'bg-violet-100 border-violet-300 text-violet-700',
  indigo: 'bg-indigo-100 border-indigo-300 text-indigo-700',
  teal: 'bg-teal-100 border-teal-300 text-teal-700',
  rose: 'bg-rose-100 border-rose-300 text-rose-700',
  lime: 'bg-lime-100 border-lime-300 text-lime-700',
  fuchsia: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700'
}

function BadgesPage() {
  const { user } = useUser()
  const [stats, setStats] = useState({
    coursesCompleted: 0,
    coursesCreated: 0,
    currentStreak: 0,
    longestStreak: 0,
    perfectQuizzes: 0,
    highScoreQuizzes: 0,
    quizzesTaken: 0,
    allNotesCompleted: 0,
    completedNotes: 0,
    flashcardsCompleted: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const badgeCardRef = useRef(null)

  // Helper function to draw rounded rectangles (for older browser compatibility)
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  // Draws the correct icon for each badge
  // All icons now use (0,0) as center and fit inside 60x60 box
  // Only use canvas-drawn icons for badges
  const drawBadgeIcon = (ctx, badgeId) => {
    ctx.save();
    switch (badgeId) {
      case 'welcome': // Rocket
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(12, 18); ctx.lineTo(-12, 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 5, 7, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-3, 18, 6, 12);
        break;
      case 'curious-mind': // Eye
        ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
        break;
      case 'first-flip': // Sparkles
        ctx.fillStyle = '#a78bfa';
        for (let i = 0; i < 8; i++) {
          ctx.save(); ctx.rotate((Math.PI / 4) * i);
          ctx.fillRect(-1, -18, 2, 36);
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
        break;
      case 'quiz-taker': // Brain
        ctx.fillStyle = '#818cf8'; ctx.beginPath(); ctx.arc(-8, 0, 13, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(8, 0, 13, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 0, 5, 0, 2 * Math.PI); ctx.arc(8, 0, 5, 0, 2 * Math.PI); ctx.fill();
        break;
      case 'streak-1': // Coffee
        ctx.fillStyle = '#f59e42'; ctx.fillRect(-14, 8, 28, 16);
        ctx.fillStyle = '#fff'; ctx.fillRect(-12, 10, 24, 10);
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 16, 14, Math.PI, 0); ctx.stroke();
        break;
      case 'first-course': // Book
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(-14, -10, 28, 28);
        ctx.fillStyle = '#fff'; ctx.fillRect(-12, -8, 24, 24);
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 18); ctx.stroke();
        break;
      case 'courses-3': // Graduation Cap
        ctx.fillStyle = '#0d9488'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-16, 0); ctx.lineTo(0, 12); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, 0, 10, 10);
        break;
      case 'courses-5': // Target
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
        break;
      default: // Trophy (fallback)
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(15, -15); ctx.lineTo(13, 15); ctx.quadraticCurveTo(0, 25, -13, 15); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-17, 0, 8, Math.PI * 0.5, Math.PI * 1.5, true); ctx.stroke(); ctx.beginPath(); ctx.arc(17, 0, 8, Math.PI * 1.5, Math.PI * 0.5, true); ctx.stroke(); ctx.fillStyle = '#92400e'; ctx.fillRect(-5, 15, 10, 8); ctx.fillRect(-10, 23, 20, 5); ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(3, 0); ctx.lineTo(10, 0); ctx.lineTo(4, 5); ctx.lineTo(6, 13); ctx.lineTo(0, 8); ctx.lineTo(-6, 13); ctx.lineTo(-4, 5); ctx.lineTo(-10, 0); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
        break;
    }
    ctx.restore();
  };

  // Download badge as PNG using Canvas API
  const downloadBadge = async (badge) => {
    setDownloading(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const scale = 2 // For higher resolution
      canvas.width = 440 * scale
      canvas.height = 400 * scale
      ctx.scale(scale, scale)
      // Card drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(30,41,59,0.18)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      drawRoundedRect(ctx, 20, 20, 400, 360, 28);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
      // Card gradient overlay
      const cardGrad = ctx.createLinearGradient(20, 20, 420, 380);
      cardGrad.addColorStop(0, '#f8fafc');
      cardGrad.addColorStop(1, '#f1f5f9');
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = cardGrad;
      drawRoundedRect(ctx, 20, 20, 400, 360, 28);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Draw LMS Logo (real image)
      const logo = new window.Image();
      logo.crossOrigin = 'anonymous';
      logo.src = '/logo.svg';
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });
      ctx.drawImage(logo, 200, 28, 40, 40); // move logo higher
      // GEMINI LMS Title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GEMINI LMS', 220, 88); // move text lower
      // Badge icon circle with border
      ctx.save();
      ctx.beginPath();
      ctx.arc(220, 170, 54, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5ff';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#6366f1';
      ctx.stroke();
      // Draw the correct badge icon centered in the circle
      ctx.save();
      ctx.translate(220, 170); // center of the circle
      drawBadgeIcon(ctx, badge.id);
      ctx.restore();
      ctx.restore();
      // Badge name
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(badge.name, 220, 245);
      // Description
      ctx.fillStyle = '#64748b';
      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(badge.description, 220, 275);
      // Achievement unlocked pill with checkmark
      ctx.save();
      // Pill background
      ctx.beginPath();
      ctx.moveTo(120, 295);
      ctx.lineTo(320, 295);
      ctx.arc(320, 307, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.lineTo(120, 319);
      ctx.arc(120, 307, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fillStyle = '#e0fce9';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#34d399';
      ctx.stroke();
      // Checkmark inside pill
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(140, 307);
      ctx.lineTo(146, 313);
      ctx.lineTo(154, 301);
      ctx.stroke();
      // Pill text (aligned right of checkmark)
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Achievement Unlocked', 162, 313);
      ctx.restore();
      // Divider line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(120, 335);
      ctx.lineTo(320, 335);
      ctx.stroke();
      // User name
      ctx.fillStyle = '#64748b';
      ctx.font = '15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Earned by ' + (user?.fullName || 'Student'), 220, 355);
      // Date
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(new Date().toLocaleDateString(), 220, 375);
      // Download the canvas
      const link = document.createElement('a');
      link.download = 'gemini-lms-badge-' + badge.id + '.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Badge downloaded successfully!');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download badge');
    } finally {
      setDownloading(false);
    }
  }

  // Share on social media
  const shareOnSocial = (platform, badge) => {
    const text = `🏆 I just earned the "${badge.name}" badge on Gemini LMS! ${badge.description} #GeminiLMS #Learning #Achievement`
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://gemini-lms.com'
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
        break
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400')
    toast.success(`Sharing to ${platform}!`)
  }

  const openShareModal = (badge) => {
    setSelectedBadge(badge)
    setShowShareModal(true)
  }

  useEffect(() => {
    const fetchUserStats = async () => {
      const email = user?.primaryEmailAddress?.emailAddress
      if (!email) return

      try {
        // Fetch all courses created by user
        const coursesRes = await axios.post('/api/courses', { createdBy: email })
        const courses = coursesRes?.data?.result || []

        console.log('Badges - Courses found:', courses.length)

        // Calculate stats similar to progress page
        let completedCourses = 0
        let perfectQuizCount = 0
        let highScoreCount = 0
        let allNotesCount = 0
        let totalFlashcards = 0
        let quizzesTaken = 0
        let totalNotesViewed = 0
        let currentStreak = 0
        let longestStreak = 0

        // Fetch progress for each course
        for (const course of courses) {
          try {
            const progressRes = await axios.get(
              `/api/student-progress?courseId=${course.courseId}&studentEmail=${email}`
            )
            const p = progressRes?.data?.result
            
            console.log('Badges - Progress for', course.courseId, ':', p)

            if (!p) continue

            // Check completion - same logic as progress page
            if (p.status === 'Completed') {
              completedCourses++
            } else {
              // Also check by chapters or percentage
              let completedChaptersArray = []
              if (p.completedChapters) {
                if (typeof p.completedChapters === 'string') {
                  try {
                    completedChaptersArray = JSON.parse(p.completedChapters)
                  } catch (e) {
                    completedChaptersArray = []
                  }
                } else if (Array.isArray(p.completedChapters)) {
                  completedChaptersArray = p.completedChapters
                }
              }
              
              const completedCount = completedChaptersArray.length
              if ((completedCount > 0 && p.totalChapters && completedCount >= p.totalChapters) ||
                  p.progressPercentage >= 100) {
                completedCourses++
              }
            }

            // Quiz scores - handle both object and array formats
            let quizScoresData = p.quizScores
            if (typeof quizScoresData === 'string') {
              try {
                quizScoresData = JSON.parse(quizScoresData)
              } catch (e) {
                quizScoresData = {}
              }
            }
            
            if (quizScoresData && typeof quizScoresData === 'object') {
              const scores = Array.isArray(quizScoresData) 
                ? quizScoresData 
                : Object.values(quizScoresData)
              quizzesTaken += scores.length
              scores.forEach(score => {
                const scoreVal = typeof score === 'object' ? (score.percentage || score.score) : score
                if (scoreVal === 100) perfectQuizCount++
                if (scoreVal >= 80) highScoreCount++ // Track 80%+ scores
              })
            }

            // Notes completion
            totalNotesViewed += p.completedNotes || 0
            if (p.completedNotes && p.totalNotes && p.completedNotes >= p.totalNotes) {
              allNotesCount++
            }

            // Flashcards
            totalFlashcards += p.completedFlashcards || 0

            // Track streak from progress
            if (p.streakCount > currentStreak) currentStreak = p.streakCount
            if (p.longestStreak > longestStreak) longestStreak = p.longestStreak

          } catch (err) {
            console.error('Error fetching progress for course:', course.courseId, err)
          }
        }

        // Also fetch global user streak
        try {
          const streakRes = await axios.get(`/api/user-streak?studentEmail=${email}`)
          const streakData = streakRes?.data?.result || {}
          if (streakData.streakCount > currentStreak) currentStreak = streakData.streakCount
          if (streakData.longestStreak > longestStreak) longestStreak = streakData.longestStreak
        } catch (err) {
          console.error('Error fetching streak:', err)
        }

        console.log('Badges - Final stats:', {
          coursesCreated: courses.length,
          completedCourses,
          quizzesTaken,
          perfectQuizCount,
          highScoreCount,
          totalNotesViewed,
          totalFlashcards,
          currentStreak,
          longestStreak
        })

        setStats({
          coursesCompleted: completedCourses,
          coursesCreated: courses.length,
          currentStreak: currentStreak,
          longestStreak: longestStreak,
          perfectQuizzes: perfectQuizCount,
          highScoreQuizzes: highScoreCount,
          quizzesTaken: quizzesTaken,
          allNotesCompleted: allNotesCount,
          completedNotes: totalNotesViewed,
          flashcardsCompleted: totalFlashcards
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserStats()
  }, [user?.primaryEmailAddress?.emailAddress])

  const earnedBadges = BADGES.filter(badge => badge.requirement(stats))
  const lockedBadges = BADGES.filter(badge => !badge.requirement(stats))

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your badges...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-purple-600" />
          Your Badges
        </h1>
        <p className="text-slate-600">
          Earn badges by completing courses, maintaining streaks, and achieving milestones
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.coursesCompleted}</div>
          <div className="text-xs text-blue-600">Courses Completed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-700">{stats.currentStreak}</div>
          <div className="text-xs text-orange-600">Current Streak</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{stats.perfectQuizzes}</div>
          <div className="text-xs text-yellow-600">Perfect Quizzes</div>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
          <div className="text-2xl font-bold text-pink-700">{stats.flashcardsCompleted}</div>
          <div className="text-xs text-pink-600">Flashcards Done</div>
        </div>
      </div>

      {/* Earned Badges */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Earned Badges ({earnedBadges.length})
        </h2>
        {earnedBadges.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No badges earned yet</p>
            <p className="text-sm text-slate-500">Keep learning to unlock your first badge!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earnedBadges.map((badge) => {
              const IconComponent = badge.icon
              return (
                <div
                  key={badge.id}
                  className={`p-6 rounded-xl border-2 shadow-lg transition-transform hover:scale-105 ${COLOR_CLASSES[badge.color]}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full shadow-md">
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{badge.name}</h3>
                      <p className="text-sm opacity-80">{badge.description}</p>
                      <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Unlocked
                      </div>
                    </div>
                  </div>
                  {/* Download and Share Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/30">
                    <button
                      onClick={() => downloadBadge(badge)}
                      disabled={downloading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => openShareModal(badge)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Locked Badges */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-slate-500" />
          Locked Badges ({lockedBadges.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lockedBadges.map((badge) => {
            const IconComponent = badge.icon
            return (
              <div
                key={badge.id}
                className="p-6 rounded-xl border-2 border-slate-200 bg-slate-50 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-200 rounded-full">
                    <IconComponent className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 text-slate-600">{badge.name}</h3>
                    <p className="text-sm text-slate-500">{badge.description}</p>
                    <div className="mt-2 text-xs font-semibold text-slate-400">
                      🔒 Locked
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && selectedBadge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Share Your Badge</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Badge Preview Card with LMS Branding */}
            <div 
              ref={badgeCardRef}
              className={`p-6 rounded-xl ${COLOR_CLASSES[selectedBadge.color]} mb-6`}
            >
              {/* LMS Branding Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/30">
                <img src="/logo.svg" alt="Gemini LMS" className="w-8 h-8" />
                <span className="font-bold text-lg">GEMINI LMS</span>
              </div>
              
              {/* Badge Content */}
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white rounded-full shadow-lg">
                  {(() => {
                    const IconComponent = selectedBadge.icon
                    return <IconComponent className="w-12 h-12" />
                  })()}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-xl mb-1">{selectedBadge.name}</h4>
                  <p className="text-sm opacity-80">{selectedBadge.description}</p>
                </div>
              </div>
              
              {/* User & Unlocked Status */}
              <div className="mt-4 pt-3 border-t border-white/30 flex items-center justify-between">
                <span className="text-sm font-medium opacity-80">
                  Earned by: {user?.fullName || 'Learner'}
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  Unlocked!
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={() => downloadBadge(selectedBadge)}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 mb-4"
            >
              <Download className="w-5 h-5" />
              {downloading ? 'Generating Image...' : 'Download Badge Image'}
            </button>

            {/* Social Share Options */}
            <div className="space-y-3">
              <p className="text-sm text-slate-500 font-medium">Share on Social Media:</p>
              <div className="grid grid-cols-3 gap-3">
                {/* Twitter/X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏆 I just earned the "${selectedBadge.name}" badge on GEMINI LMS! ${selectedBadge.description} #LearningAchievement #GeminiLMS`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X
                </a>
                
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(`🏆 I just earned the "${selectedBadge.name}" badge on GEMINI LMS!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  FB
                </a>
                
                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&summary=${encodeURIComponent(`I just earned the "${selectedBadge.name}" badge on GEMINI LMS!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  In
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BadgesPage
