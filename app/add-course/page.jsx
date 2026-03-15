"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

export default function AddCoursePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Coming Soon!</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Tutor Course Creation is an upcoming feature. We're working hard to bring you an amazing experience.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-8 text-left">
          <p className="text-sm text-blue-800">
            <strong>What's coming:</strong> Create and manage custom courses with rich content, quizzes, assignments, and student tracking.
          </p>
        </div>
        
        <Button
          onClick={() => router.back()}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
