'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  GraduationCap, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Safe JSON/Array helpers
const parseSafeJson = (data, fallback = {}) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

const parseSafeArray = (data, fallback = []) => {
  if (!data) return fallback;
  if (Array.isArray(data)) return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

export default function AIStudyCoach({ courseId, studentEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coachData, setCoachData] = useState(null);

  const fetchCoachData = async () => {
    if (!courseId || !studentEmail) return;
    try {
      setLoading(true);
      setError('');

      // Fetch progress
      const progressRes = await axios.get(
        `/api/student-progress?courseId=${courseId}&studentEmail=${studentEmail}`
      );
      const progress = progressRes.data.result || {};

      // Fetch course details
      const courseRes = await axios.get(`/api/courses?courseId=${courseId}`);
      const course = courseRes.data.result || {};

      const completedChapters = parseSafeArray(progress.completedChapters);
      const quizScores = parseSafeJson(progress.quizScores);
      const assignmentScores = parseSafeJson(progress.assignmentScores);
      
      const chapters = course.courseLayout?.chapters || [];
      const totalChapters = chapters.length || progress.totalChapters || 0;

      // Quiz Scores Analysis
      const quizScoreValues = Object.values(quizScores).map(Number).filter(n => !isNaN(n));
      const avgQuizScore = quizScoreValues.length > 0
        ? Math.round(quizScoreValues.reduce((sum, score) => sum + score, 0) / quizScoreValues.length)
        : 0;
      const allQuizzesCompleted = quizScoreValues.length >= totalChapters && totalChapters > 0;
      const passedQuizzes = allQuizzesCompleted && avgQuizScore >= 60;

      // Assignment Scores Analysis
      const courseHasAssignments = course.hasAssignments === true || (course.assignmentCount && course.assignmentCount > 0);
      const expectedAssignmentCount = course.assignmentCount || 0;
      const assignmentScoreEntries = Object.entries(assignmentScores);
      const allAssignmentsCompleted = !courseHasAssignments || (assignmentScoreEntries.length >= expectedAssignmentCount);

      let allAssignmentsPassed = allAssignmentsCompleted;
      let failedAssignmentName = null;
      let failedAssignmentScore = 0;

      if (courseHasAssignments) {
        for (const [id, score] of assignmentScoreEntries) {
          const scoreNum = Number(score);
          if (isNaN(scoreNum) || scoreNum < 60) {
            allAssignmentsPassed = false;
            failedAssignmentName = id;
            failedAssignmentScore = scoreNum;
            break;
          }
        }
      }

      // Next Best Action Logic
      let nextAction = null;
      let coachMessage = "";

      // 1. Chapters Completion Check
      for (let i = 0; i < totalChapters; i++) {
        const chapterTitle = chapters[i]?.chapter_title || chapters[i]?.chapterTitle || `Chapter ${i + 1}`;
        
        // If chapter not complete
        if (!completedChapters.includes(i)) {
          nextAction = {
            type: 'notes',
            title: `Read Notes: ${chapterTitle}`,
            description: `Study the reading material for Chapter ${i + 1} to build your foundation.`,
            link: `/course/${courseId}`,
            icon: 'notes'
          };
          coachMessage = `Coach: To progress, read the notes for "${chapterTitle}". Focus on understanding the core concepts!`;
          break;
        }

        // If chapter complete, check if quiz passed
        const quizScore = quizScores[`chapter_${i}`] !== undefined ? Number(quizScores[`chapter_${i}`]) : null;
        if (quizScore === null) {
          nextAction = {
            type: 'quiz',
            title: `Take Quiz: ${chapterTitle}`,
            description: `Test your knowledge on Chapter ${i + 1} with an adaptive graded quiz.`,
            link: `/course/${courseId}/quiz`,
            icon: 'quiz'
          };
          coachMessage = `Coach: Great job finishing the notes for "${chapterTitle}". Now, take the quiz to test your memory!`;
          break;
        } else if (quizScore < 60) {
          nextAction = {
            type: 'retake-quiz',
            title: `Retake Quiz: ${chapterTitle} (Current: ${quizScore}%)`,
            description: `Your score is below the 60% passing requirement. Retake the quiz to pass this chapter.`,
            link: `/course/${courseId}/quiz`,
            icon: 'warning'
          };
          coachMessage = `Coach: I notice you scored ${quizScore}% on the "${chapterTitle}" quiz. Don't worry! Click 'Retake Quiz' to try again and boost your average score above 60%.`;
          break;
        }
      }

      // 2. Assignments Check
      if (!nextAction && courseHasAssignments) {
        if (assignmentScoreEntries.length < expectedAssignmentCount) {
          nextAction = {
            type: 'assignment',
            title: `Submit Assignment ${assignmentScoreEntries.length + 1}`,
            description: `Submit your next course assignment for AI-assisted grading.`,
            link: `/course/${courseId}/assignments`,
            icon: 'assignment'
          };
          coachMessage = `Coach: All quizzes passed! Now, submit your remaining assignments to meet the certificate requirements.`;
        } else if (failedAssignmentName) {
          nextAction = {
            type: 'assignment',
            title: `Resubmit Assignment: ${failedAssignmentName} (${failedAssignmentScore} points)`,
            description: `You must score at least 60 points on each assignment. Resubmit to pass.`,
            link: `/course/${courseId}/assignments`,
            icon: 'warning'
          };
          coachMessage = `Coach: Your assignment "${failedAssignmentName}" scored ${failedAssignmentScore} points. Resubmit this assignment to boost your score to at least 60 points!`;
        }
      }

      // 3. Certificate Check
      if (!nextAction) {
        if (progress.certificateIssued || progress.status === 'Completed') {
          nextAction = {
            type: 'certificate-earned',
            title: `View Your Certificate`,
            description: `Congratulations! Your certificate of completion is ready.`,
            link: `/course/${courseId}/certificate`,
            icon: 'certificate'
          };
          coachMessage = `Coach: Congratulations on successfully completing the course! You've earned your official certificate. Click below to view and share it!`;
        } else {
          nextAction = {
            type: 'claim-certificate',
            title: `Claim Your Certificate`,
            description: `You have met all course requirements! Generate your official certificate now.`,
            link: `/course/${courseId}/certificate`,
            icon: 'claim'
          };
          coachMessage = `Coach: Outstanding work! You have passed all quizzes and assignments. Click 'Claim Certificate' to generate your official certificate of completion!`;
        }
      }

      setCoachData({
        courseTopic: course.topic || "Course",
        progressPercentage: progress.progressPercentage || 0,
        completedChapters: completedChapters.length,
        totalChapters,
        avgQuizScore,
        allQuizzesCompleted,
        passedQuizzes,
        courseHasAssignments,
        expectedAssignmentCount,
        submittedAssignments: assignmentScoreEntries.length,
        allAssignmentsPassed,
        nextAction,
        coachMessage
      });
    } catch (err) {
      console.error('Error fetching coach details:', err);
      setError('Unable to load AI coach insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachData();
  }, [courseId, studentEmail]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center min-h-[180px]">
        <div className="text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">AI Study Coach is analyzing your progress...</p>
        </div>
      </div>
    );
  }

  if (error || !coachData) {
    return null; // Return nothing or silent fallback
  }

  const { nextAction } = coachData;

  const renderIcon = (type) => {
    switch (type) {
      case 'notes': return <BookOpen className="w-6 h-6 text-indigo-600" />;
      case 'quiz': return <GraduationCap className="w-6 h-6 text-violet-600" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />;
      case 'assignment': return <BookOpen className="w-6 h-6 text-pink-600" />;
      case 'claim':
      case 'certificate': return <Award className="w-6 h-6 text-yellow-500 animate-bounce" />;
      default: return <Sparkles className="w-6 h-6 text-indigo-600" />;
    }
  };

  return (
    <Card className="relative overflow-hidden border border-indigo-100 bg-white shadow-md rounded-2xl group hover:shadow-lg transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
      <div className="absolute -right-16 -top-16 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 duration-500" />
      
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">AI Study Coach</span>
          </div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Active: {coachData.courseTopic}
          </span>
        </div>

        {/* Coach Feedback Bubble */}
        <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-4 text-sm leading-relaxed text-indigo-950 font-medium">
          {coachData.coachMessage}
        </div>

        {/* Action and Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr] gap-6">
          
          {/* Next Best Action Card */}
          {nextAction && (
            <div className="flex flex-col justify-between p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-xl">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">Your Next Best Action</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                    {renderIcon(nextAction.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{nextAction.title}</h3>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{nextAction.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <Link href={nextAction.link}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 w-full sm:w-auto shadow-md shadow-indigo-600/10 transition">
                    {nextAction.type === 'retake-quiz' ? 'Retake Quiz' : 
                     nextAction.type === 'claim-certificate' ? 'Claim Certificate' :
                     nextAction.type === 'certificate-earned' ? 'View Certificate' :
                     'Start Task'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Academic Rigor Checklist */}
          <div className="space-y-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Certificate Checklist</span>
            
            <div className="space-y-3">
              {/* Checklist Item 1: Course Progress */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                <div className="flex items-center gap-2">
                  {coachData.completedChapters >= coachData.totalChapters ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-slate-400" />
                  )}
                  <span className="font-medium text-slate-700">Course Progress (100%)</span>
                </div>
                <span className="font-bold text-slate-900">
                  {coachData.completedChapters}/{coachData.totalChapters} Ch.
                </span>
              </div>

              {/* Checklist Item 2: Quiz Score Average */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                <div className="flex items-center gap-2">
                  {coachData.passedQuizzes ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-slate-400" />
                  )}
                  <span className="font-medium text-slate-700">Quiz Avg. (&ge; 60%)</span>
                </div>
                <span className={`font-bold ${coachData.passedQuizzes ? 'text-green-600' : 'text-amber-600'}`}>
                  {coachData.avgQuizScore}%
                </span>
              </div>

              {/* Checklist Item 3: Assignments */}
              {coachData.courseHasAssignments && (
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                  <div className="flex items-center gap-2">
                    {coachData.allAssignmentsPassed ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4.5 h-4.5 text-slate-400" />
                    )}
                    <span className="font-medium text-slate-700">Assignments Passed</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {coachData.submittedAssignments}/{coachData.expectedAssignmentCount}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
