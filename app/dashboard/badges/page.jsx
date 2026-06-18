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
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  sky: 'bg-sky-100 border-sky-300 text-sky-700',
  violet: 'bg-violet-100 border-violet-300 text-violet-700',
  indigo: 'bg-indigo-100 border-indigo-300 text-indigo-700',
  teal: 'bg-teal-100 border-teal-300 text-teal-700',
  rose: 'bg-rose-100 border-rose-300 text-rose-700',
  lime: 'bg-lime-100 border-lime-300 text-lime-700',
  fuchsia: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700'
}

const BADGE_COLOR_THEMES = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50/50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-blue-800/40',
    glow: 'shadow-blue-500/20 hover:shadow-blue-500/30',
  },
  orange: {
    gradient: 'from-orange-400 to-red-500',
    lightBg: 'bg-orange-50/50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200/50 dark:border-orange-800/40',
    glow: 'shadow-orange-500/20 hover:shadow-orange-500/30',
  },
  yellow: {
    gradient: 'from-yellow-400 to-amber-550',
    lightBg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
    text: 'text-amber-600 dark:text-yellow-400',
    border: 'border-yellow-200/50 dark:border-yellow-800/40',
    glow: 'shadow-yellow-500/20 hover:shadow-yellow-500/30',
  },
  purple: {
    gradient: 'from-purple-500 to-indigo-600',
    lightBg: 'bg-purple-50/50 dark:bg-purple-950/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/50 dark:border-purple-800/40',
    glow: 'shadow-purple-500/20 hover:shadow-purple-500/30',
  },
  green: {
    gradient: 'from-green-400 to-emerald-600',
    lightBg: 'bg-green-50/50 dark:bg-green-950/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200/50 dark:border-green-800/40',
    glow: 'shadow-green-500/20 hover:shadow-green-500/30',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    lightBg: 'bg-amber-50/50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/50 dark:border-amber-800/40',
    glow: 'shadow-amber-500/20 hover:shadow-amber-500/30',
  },
  cyan: {
    gradient: 'from-cyan-400 to-blue-500',
    lightBg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200/50 dark:border-cyan-800/40',
    glow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
  },
  pink: {
    gradient: 'from-pink-400 to-rose-600',
    lightBg: 'bg-pink-50/50 dark:bg-pink-950/20',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200/50 dark:border-pink-800/40',
    glow: 'shadow-pink-500/20 hover:shadow-pink-500/30',
  },
  emerald: {
    gradient: 'from-emerald-400 to-teal-600',
    lightBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-emerald-800/40',
    glow: 'shadow-emerald-500/20 hover:shadow-emerald-500/30',
  },
  sky: {
    gradient: 'from-sky-400 to-blue-550',
    lightBg: 'bg-sky-50/50 dark:bg-sky-950/20',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200/50 dark:border-sky-800/40',
    glow: 'shadow-sky-500/20 hover:shadow-sky-500/30',
  },
  violet: {
    gradient: 'from-violet-400 to-purple-600',
    lightBg: 'bg-violet-50/50 dark:bg-violet-950/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200/50 dark:border-violet-800/40',
    glow: 'shadow-violet-500/20 hover:shadow-violet-500/30',
  },
  indigo: {
    gradient: 'from-indigo-400 to-violet-600',
    lightBg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200/50 dark:border-indigo-800/40',
    glow: 'shadow-indigo-500/20 hover:shadow-indigo-500/30',
  },
  teal: {
    gradient: 'from-teal-400 to-emerald-600',
    lightBg: 'bg-teal-50/50 dark:bg-teal-950/20',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200/50 dark:border-teal-800/40',
    glow: 'shadow-teal-500/20 hover:shadow-teal-500/30',
  },
  rose: {
    gradient: 'from-rose-400 to-red-600',
    lightBg: 'bg-rose-50/50 dark:bg-rose-950/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/50 dark:border-rose-800/40',
    glow: 'shadow-rose-500/20 hover:shadow-rose-500/30',
  },
  lime: {
    gradient: 'from-lime-400 to-green-600',
    lightBg: 'bg-lime-50/50 dark:bg-lime-950/20',
    text: 'text-lime-600 dark:text-lime-400',
    border: 'border-lime-200/50 dark:border-lime-800/40',
    glow: 'shadow-lime-500/20 hover:shadow-lime-500/30',
  },
  fuchsia: {
    gradient: 'from-fuchsia-400 to-purple-600',
    lightBg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-200/50 dark:border-fuchsia-800/40',
    glow: 'shadow-fuchsia-500/20 hover:shadow-fuchsia-500/30',
  }
}

const CANVAS_THEMES = {
  blue: { start: '#3b82f6', end: '#4f46e5', accent: '#3b82f6' },
  orange: { start: '#f97316', end: '#ef4444', accent: '#f97316' },
  yellow: { start: '#fbbf24', end: '#d97706', accent: '#d97706' },
  purple: { start: '#a855f7', end: '#6366f1', accent: '#a855f7' },
  green: { start: '#4ade80', end: '#059669', accent: '#059669' },
  amber: { start: '#f59e0b', end: '#d97706', accent: '#d97706' },
  cyan: { start: '#22d3ee', end: '#0284c7', accent: '#0284c7' },
  pink: { start: '#f472b6', end: '#db2777', accent: '#db2777' },
  emerald: { start: '#34d399', end: '#059669', accent: '#059669' },
  sky: { start: '#38bdf8', end: '#0284c7', accent: '#0284c7' },
  violet: { start: '#a78bfa', end: '#7c3aed', accent: '#7c3aed' },
  indigo: { start: '#818cf8', end: '#4f46e5', accent: '#4f46e5' },
  teal: { start: '#2dd4bf', end: '#0d9488', accent: '#0d9488' },
  rose: { start: '#fb7185', end: '#e11d48', accent: '#e11d48' },
  lime: { start: '#a3e635', end: '#65a30d', accent: '#65a30d' },
  fuchsia: { start: '#f0abfc', end: '#c084fc', accent: '#c084fc' }
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

  // Helper function to draw rounded rectangles
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
      case 'courses-10': // Gold Trophy
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-12, 16, 24, 6);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-4, 6, 8, 10);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-16, -16);
        ctx.lineTo(16, -16);
        ctx.lineTo(12, 6);
        ctx.quadraticCurveTo(0, 14, -12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-16, -3, 6, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(16, -3, 6, Math.PI * 1.5, Math.PI * 0.5);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(2, -4);
        ctx.lineTo(8, -4);
        ctx.lineTo(3, 0);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 2);
        ctx.lineTo(-5, 6);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-2, -4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'streak-3': // Orange Flame
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.quadraticCurveTo(15, -6, 12, 8);
        ctx.quadraticCurveTo(8, 20, 0, 20);
        ctx.quadraticCurveTo(-8, 20, -12, 8);
        ctx.quadraticCurveTo(-15, -6, 0, -22);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(8, 0, 6, 8);
        ctx.quadraticCurveTo(4, 14, 0, 14);
        ctx.quadraticCurveTo(-4, 14, -6, 8);
        ctx.quadraticCurveTo(-8, 0, 0, -10);
        ctx.closePath();
        ctx.fill();
        break;
      case 'streak-7': // Yellow Lightning/Zap
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(4, -20);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 20);
        ctx.lineTo(12, 0);
        ctx.lineTo(2, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'streak-14': // Rose Heart
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.bezierCurveTo(-5, -18, -18, -15, -18, -2);
        ctx.bezierCurveTo(-18, 9, -6, 15, 0, 20);
        ctx.bezierCurveTo(6, 15, 18, 9, 18, -2);
        ctx.bezierCurveTo(18, -15, 5, -18, 0, -10);
        ctx.closePath();
        ctx.fill();
        break;
      case 'streak-30': // Royal Golden Crown
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-18, 12);
        ctx.lineTo(-22, -10);
        ctx.lineTo(-9, 0);
        ctx.lineTo(0, -18);
        ctx.lineTo(9, 0);
        ctx.lineTo(22, -10);
        ctx.lineTo(18, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(-22, -10, 2.5, 0, Math.PI * 2);
        ctx.arc(0, -18, 2.5, 0, Math.PI * 2);
        ctx.arc(22, -10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-18, 12, 36, 4);
        break;
      case 'high-achiever': // Bullseye target with Arrow
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-18, 18);
        ctx.lineTo(-2, 2);
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(-18, 18);
        ctx.lineTo(-24, 22);
        ctx.lineTo(-22, 24);
        ctx.lineTo(-18, 18);
        ctx.fill();
        break;
      case 'perfect-quiz': // Gold Star
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(6, -8);
        ctx.lineTo(21, -6);
        ctx.lineTo(10, 4);
        ctx.lineTo(13, 19);
        ctx.lineTo(0, 11);
        ctx.lineTo(-13, 19);
        ctx.lineTo(-10, 4);
        ctx.lineTo(-21, -6);
        ctx.lineTo(-6, -8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(0, 11);
        ctx.lineTo(-13, 19);
        ctx.lineTo(-10, 4);
        ctx.lineTo(-21, -6);
        ctx.lineTo(-6, -8);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        break;
      case 'quiz-master': // Glowing Lightbulb
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, -6, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -6, 13, Math.PI * 0.7, Math.PI * 0.3);
        ctx.lineTo(5, 10);
        ctx.lineTo(-5, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-5, 10, 10, 4);
        ctx.fillRect(-3, 14, 6, 3);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.lineTo(-2, -4);
        ctx.lineTo(2, -4);
        ctx.lineTo(4, 2);
        ctx.stroke();
        break;
      case 'all-notes': // Checkmark in circle
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-1, 5);
        ctx.lineTo(7, -5);
        ctx.stroke();
        break;
      case 'flashcard-10': // Two silhouettes
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(-7, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-17, 15);
        ctx.quadraticCurveTo(-17, 5, -7, 5);
        ctx.quadraticCurveTo(3, 5, 3, 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.arc(6, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 20);
        ctx.quadraticCurveTo(-5, 10, 6, 10);
        ctx.quadraticCurveTo(17, 10, 17, 20);
        ctx.closePath();
        ctx.fill();
        break;
      case 'flashcard-50': // Ribbon award
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(-14, 24);
        ctx.lineTo(-4, 20);
        ctx.lineTo(-1, 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.lineTo(14, 24);
        ctx.lineTo(4, 20);
        ctx.lineTo(1, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(0, -2, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -2, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(2, -4);
        ctx.lineTo(6, -4);
        ctx.lineTo(3, -1);
        ctx.lineTo(4.5, 3);
        ctx.lineTo(0, 0.5);
        ctx.lineTo(-4.5, 3);
        ctx.lineTo(-3, -1);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-2, -4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'flashcard-master': // Medal with ribbon
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.lineTo(10, -20);
        ctx.lineTo(4, -4);
        ctx.lineTo(-4, -4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.moveTo(-3, -20);
        ctx.lineTo(3, -20);
        ctx.lineTo(1, -4);
        ctx.lineTo(-1, -4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 6, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 6, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1st', 0, 9);
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
      const scale = 2.5 // Higher scale (1100x1000) for extremely crisp PNG download
      canvas.width = 440 * scale
      canvas.height = 400 * scale
      ctx.scale(scale, scale)
      
      const theme = CANVAS_THEMES[badge.color] || CANVAS_THEMES.blue
      
      // Card soft layout shadow
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      drawRoundedRect(ctx, 20, 20, 400, 360, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
      
      // Radial glow gradient spotlight for deep card elevation background
      const radialGlow = ctx.createRadialGradient(220, 170, 10, 220, 170, 240);
      radialGlow.addColorStop(0, '#ffffff');
      radialGlow.addColorStop(0.65, '#f8fafc');
      radialGlow.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = radialGlow;
      drawRoundedRect(ctx, 20, 20, 400, 360, 28);
      ctx.fill();
      
      // Outer card subtle glass border line
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, 20, 20, 400, 360, 28);
      ctx.stroke();
      
      // Draw LMS Logo (real image)
      const logo = new window.Image();
      logo.crossOrigin = 'anonymous';
      logo.src = '/logo.svg';
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });
      ctx.drawImage(logo, 200, 32, 40, 40); 
      
      // GEMINI LMS Title
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 21px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GEMINI LMS', 220, 88); 
      
      // Badge icon circle with gradient shadow glow
      ctx.save();
      ctx.shadowColor = theme.accent + '40'; // Glow shadow
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      
      ctx.beginPath();
      ctx.arc(220, 170, 52, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.accent;
      ctx.stroke();
      ctx.restore();
      
      // Draw the correct badge icon centered in the circle
      ctx.save();
      ctx.translate(220, 170); // center of the circle
      drawBadgeIcon(ctx, badge.id);
      ctx.restore();
      
      // Badge name
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 26px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(badge.name, 220, 245);
      
      // Description
      ctx.fillStyle = '#475569';
      ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(badge.description, 220, 272);
      
      // Achievement unlocked pill with checkmark (colorized to badge theme)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(110, 292);
      ctx.lineTo(330, 292);
      ctx.arc(330, 304, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.lineTo(110, 316);
      ctx.arc(110, 304, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      
      ctx.fillStyle = theme.accent + '12'; // 7% opacity matching pill background
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = theme.accent + '40'; // 25% opacity matching border outline
      ctx.stroke();
      
      // Checkmark inside pill
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(130, 304);
      ctx.lineTo(135, 309);
      ctx.lineTo(143, 298);
      ctx.stroke();
      
      // Pill text
      ctx.fillStyle = theme.accent;
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Achievement Unlocked', 152, 308);
      ctx.restore();
      
      // Divider line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(120, 335);
      ctx.lineTo(320, 335);
      ctx.stroke();
      
      // User name
      ctx.fillStyle = '#475569';
      ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Earned by ' + (user?.fullName || 'Student'), 220, 354);
      
      // Date
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(new Date().toLocaleDateString(), 220, 373);
      
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
        const coursesRes = await axios.post('/api/courses', { createdBy: email })
        const courses = coursesRes?.data?.result || []

        let completedCourses = 0
        let perfectQuizCount = 0
        let highScoreCount = 0
        let allNotesCount = 0
        let totalFlashcards = 0
        let quizzesTaken = 0
        let totalNotesViewed = 0
        let currentStreak = 0
        let longestStreak = 0

        for (const course of courses) {
          try {
            const progressRes = await axios.get(
              `/api/student-progress?courseId=${course.courseId}&studentEmail=${email}`
            )
            const p = progressRes?.data?.result
            
            if (!p) continue

            if (p.status === 'Completed') {
              completedCourses++
            } else {
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
                if (scoreVal >= 80) highScoreCount++
              })
            }

            totalNotesViewed += p.completedNotes || 0
            if (p.completedNotes && p.totalNotes && p.completedNotes >= p.totalNotes) {
              allNotesCount++
            }

            totalFlashcards += p.completedFlashcards || 0

            if (p.streakCount > currentStreak) currentStreak = p.streakCount
            if (p.longestStreak > longestStreak) longestStreak = p.longestStreak

          } catch (err) {
            console.error('Error fetching progress for course:', course.courseId, err)
          }
        }

        try {
          const streakRes = await axios.get(`/api/user-streak?studentEmail=${email}`)
          const streakData = streakRes?.data?.result || {}
          if (streakData.streakCount > currentStreak) currentStreak = streakData.streakCount
          if (streakData.longestStreak > longestStreak) longestStreak = streakData.longestStreak
        } catch (err) {
          console.error('Error fetching streak:', err)
        }

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
      <div className="p-8 min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-650 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500 tracking-wide">Loading your badges profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl shadow-inner">
            <Award className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Your Achievements</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Earn badges by completing courses, maintaining streaks, and achieving milestones</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Courses Completed */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Courses Completed</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.coursesCompleted}</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>
        {/* Card 2: Current Streak */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Current Streak</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.currentStreak} days</div>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Flame className="h-6 w-6" />
          </div>
        </div>
        {/* Card 3: Perfect Quizzes */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Perfect Quizzes</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.perfectQuizzes}</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Trophy className="h-6 w-6" />
          </div>
        </div>
        {/* Card 4: Flashcards Completed */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Flashcards Done</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.flashcardsCompleted}</div>
          </div>
          <div className="p-3 bg-pink-50 dark:bg-pink-950/40 rounded-xl text-pink-600 dark:text-pink-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
          <Trophy className="w-5.5 h-5.5 text-amber-500" />
          Earned Achievements ({earnedBadges.length})
        </h2>
        {earnedBadges.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl shadow-sm">
            <Award className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">No badges earned yet</p>
            <p className="text-sm text-slate-500 mt-1">Keep completing chapters, flashcards, and quizzes to unlock your first badge!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {earnedBadges.map((badge) => {
              const IconComponent = badge.icon
              const theme = BADGE_COLOR_THEMES[badge.color] || BADGE_COLOR_THEMES.blue
              return (
                <div
                  key={badge.id}
                  className="relative overflow-hidden group p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className={`absolute inset-0 opacity-[0.02] dark:opacity-[0.04] bg-gradient-to-br ${theme.gradient}`} />
                  
                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`p-3 bg-gradient-to-br ${theme.gradient} rounded-2xl shadow-md ${theme.glow} text-white transition-transform duration-300 group-hover:scale-105`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{badge.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{badge.description}</p>
                      <div className="mt-3.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                        <CheckCircle className="w-3 h-3" />
                        Unlocked
                      </div>
                    </div>
                  </div>
                  
                  {/* Download and Share Buttons */}
                  <div className="flex gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 relative z-10">
                    <button
                      onClick={() => downloadBadge(badge)}
                      disabled={downloading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/70 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:scale-[1.01] disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => openShareModal(badge)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 border border-indigo-100/50 dark:border-indigo-900/40 rounded-xl text-xs font-bold text-indigo-650 dark:text-indigo-400 shadow-sm transition-all hover:scale-[1.01]"
                    >
                      <Share2 className="w-3.5 h-3.5" />
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
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
          <Target className="w-5.5 h-5.5 text-slate-500" />
          Locked Achievements ({lockedBadges.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lockedBadges.map((badge) => {
            const IconComponent = badge.icon
            return (
              <div
                key={badge.id}
                className="relative overflow-hidden p-6 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/20 opacity-60 hover:opacity-75 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 border border-slate-200/50 dark:border-slate-750">
                    <IconComponent className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-500 dark:text-slate-400 truncate">{badge.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed line-clamp-2">{badge.description}</p>
                    <div className="mt-3.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-350/30 dark:border-slate-700/30">
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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl max-w-md w-full p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-250 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Share Achievement</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Badge Preview Card */}
            {(() => {
              const theme = BADGE_COLOR_THEMES[selectedBadge.color] || BADGE_COLOR_THEMES.blue
              const IconComponent = selectedBadge.icon
              return (
                <div 
                  ref={badgeCardRef}
                  className="relative overflow-hidden p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-md mb-5"
                >
                  <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-gradient-to-br ${theme.gradient}`} />
                  
                  {/* LMS Branding Header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60 relative z-10">
                    <img src="/logo.svg" alt="Gemini LMS" className="w-7 h-7" />
                    <span className="font-extrabold text-sm tracking-wide text-slate-700 dark:text-slate-300">GEMINI LMS</span>
                  </div>
                  
                  {/* Badge Content */}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3.5 bg-gradient-to-br ${theme.gradient} rounded-2xl shadow-md text-white`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 leading-snug truncate">{selectedBadge.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{selectedBadge.description}</p>
                    </div>
                  </div>
                  
                  {/* User & Unlocked Status */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between relative z-10">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Earned by: <span className="text-indigo-600 dark:text-indigo-400">{user?.fullName || 'Learner'}</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Unlocked
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Download Button */}
            <button
              onClick={() => downloadBadge(selectedBadge)}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-150 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mb-5"
            >
              <Download className="w-5 h-5" />
              {downloading ? 'Generating Image...' : 'Download Badge Image'}
            </button>

            {/* Social Share Options */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Share on Social Media</p>
              <div className="grid grid-cols-3 gap-3">
                {/* Twitter/X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏆 I just earned the "${selectedBadge.name}" badge on GEMINI LMS! ${selectedBadge.description} #LearningAchievement #GeminiLMS`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X
                </a>
                
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(`🏆 I just earned the "${selectedBadge.name}" badge on GEMINI LMS!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  FB
                </a>
                
                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&summary=${encodeURIComponent(`I just earned the "${selectedBadge.name}" badge on GEMINI LMS!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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

