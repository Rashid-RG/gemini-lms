/**
 * LazyComponent Wrapper
 * Lazy loads heavy components with loading skeleton
 * Useful for course tabs (notes, flashcards, quiz)
 */

import React, { Suspense, lazy } from 'react';

// Generic lazy loader with fallback UI
export function LazyComponent({ 
  component: Component, 
  fallback = <LazyLoadingFallback />,
  ...props 
}) {
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

// Default loading skeleton
export function LazyLoadingFallback() {
  return (
    <div className="w-full h-96 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse" />
  );
}

// Higher-order component for lazy loading
export function withLazyLoad(Component, fallback) {
  const LazyComponent = lazy(() => 
    Promise.resolve({ default: Component }).catch(err => {
      console.error('Failed to load component:', err);
      return { default: () => <div className="text-red-500">Failed to load component</div> };
    })
  );

  return (props) => (
    <Suspense fallback={fallback || <LazyLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Usage example for course tabs:
// const LazyNotes = withLazyLoad(CourseNotes);
// const LazyFlashcards = withLazyLoad(FlashcardView);
// const LazyQuiz = withLazyLoad(QuizView);
