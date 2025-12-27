"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

function PaymentCancel() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
                    <p className="text-gray-600">
                        Your payment was not completed. No charges have been made to your account.
                    </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                    <p className="text-sm text-gray-600">
                        If you experienced any issues during payment, please try again or contact our support team for assistance.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button 
                        onClick={() => router.push('/dashboard/upgrade')}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Button 
                        onClick={() => router.push('/dashboard/support')}
                        variant="outline"
                        className="w-full"
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Support
                    </Button>
                    <Button 
                        onClick={() => router.push('/dashboard')}
                        variant="ghost"
                        className="w-full text-gray-600"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default PaymentCancel
