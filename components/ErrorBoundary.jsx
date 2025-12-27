"use client"
import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error Boundary Component for React
 * Catches JavaScript errors anywhere in child component tree
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            eventId: null
        }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // Log error to monitoring service
        this.logError(error, errorInfo)
        this.setState({ errorInfo })
    }

    logError(error, errorInfo) {
        // Log to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        
        // In production, send to monitoring service
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // Example: Send to error tracking service
            try {
                const errorData = {
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo?.componentStack,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                }
                
                // Log to server endpoint
                fetch('/api/log-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(errorData)
                }).catch(() => {})
                
            } catch (e) {
                console.error('Failed to log error:', e)
            }
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    handleGoHome = () => {
        window.location.href = '/dashboard'
    }

    handleReportBug = () => {
        const { error, errorInfo } = this.state
        const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown Error'}`)
        const body = encodeURIComponent(`
Error Details:
--------------
Message: ${error?.message}
Stack: ${error?.stack?.substring(0, 500)}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
        `)
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI or use provided fallback
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry)
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            {this.props.title || 'Something went wrong'}
                        </h2>
                        
                        <p className="text-slate-600 mb-6">
                            {this.props.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-800">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={this.handleRetry}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            
                            <Button
                                onClick={this.handleGoHome}
                                variant="outline"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                        </div>

                        <button
                            onClick={this.handleReportBug}
                            className="mt-4 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto"
                        >
                            <Bug className="w-3 h-3" />
                            Report this issue
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Wrapper HOC for functional components
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
    return function WrappedComponent(props) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <Component {...props} />
            </ErrorBoundary>
        )
    }
}

/**
 * Hook for imperative error handling
 */
export function useErrorHandler() {
    const [error, setError] = React.useState(null)
    
    const handleError = React.useCallback((err) => {
        console.error('useErrorHandler caught:', err)
        setError(err)
    }, [])
    
    const resetError = React.useCallback(() => {
        setError(null)
    }, [])
    
    // Throw error to be caught by nearest ErrorBoundary
    if (error) {
        throw error
    }
    
    return { handleError, resetError }
}

export default ErrorBoundary
