"use client"
import React, { useEffect, useState } from "react"
import { CheckCircle, Sparkles, ArrowRight, Loader2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import axios from "axios"

export default function PaymentSuccess() {
    const { user, isLoaded } = useUser()
    const [status, setStatus] = useState("pending")
    const [creditsAdded, setCreditsAdded] = useState(0)
    const [isMember, setIsMember] = useState(false)
    const [orderId, setOrderId] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        setOrderId(params.get("order_id") || localStorage.getItem("lastOrderId") || "")
    }, [])

    useEffect(() => {
        if (!isLoaded || orderId === null) return
        if (!user) { setStatus("login"); return }
        if (!orderId) {
            setStatus("missing")
            return
        }
        let cancelled = false
        let timer
        let attempts = 0
        const check = async () => {
            if (cancelled) return
            attempts += 1
            try {
                const response = await axios.get("/api/payments/payhere/status", {
                    params: { orderId },
                    headers: { "Cache-Control": "no-cache" }
                })
                if (cancelled) return
                if (response.data.status === "completed") {
                    setCreditsAdded(response.data.creditsAdded || 0)
                    setIsMember(Boolean(response.data.isMember))
                    setStatus("verified")
                    localStorage.removeItem("lastOrderId")
                    localStorage.removeItem("lastPlanId")
                    try {
                        const confetti = await import("canvas-confetti")
                        if (!cancelled) confetti.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
                    } catch { /* cosmetic only */ }
                    return
                }
                if (["failed", "canceled", "chargedback", "refunded"].includes(response.data.status)) {
                    setStatus("failed")
                    return
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    setStatus("login")
                    return
                }
                if (error.response?.status === 404 || error.response?.status === 400) {
                    setStatus("missing")
                    return
                }
            }
            if (attempts < 15) {
                timer = setTimeout(check, 2000)
            } else {
                setStatus("delayed")
            }
        }
        check()
        return () => { cancelled = true; clearTimeout(timer) }
    }, [isLoaded, user, orderId])

    const goToDashboard = () => { window.location.href = "/dashboard" }

    return (
        <div className="min-h-[75vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center rounded-3xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 shadow-sm">
                {status === "verified" ? (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Confirmed</h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">PayHere has confirmed your payment and your account has been updated.</p>
                        <div className="bg-primary/10 rounded-2xl p-5 my-6">
                            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="font-bold text-primary text-xl">
                                {isMember ? "Premium membership activated" : `+${creditsAdded} Course Credits`}
                            </p>
                        </div>
                        <Button onClick={() => window.location.href = "/create"} className="w-full">
                            Create a Course <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            {status === "pending" ? <Loader2 className="w-10 h-10 text-amber-600 animate-spin" /> :
                                status === "delayed" ? <Clock className="w-10 h-10 text-amber-600" /> :
                                <AlertCircle className="w-10 h-10 text-amber-600" />}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {status === "pending" ? "Confirming your payment" :
                                status === "delayed" ? "Confirmation is taking longer" :
                                status === "login" ? "Sign in to view your payment" :
                                status === "failed" ? "Payment not completed" : "Order reference unavailable"}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-3 mb-6">
                            {status === "pending" ? "Waiting for secure confirmation from PayHere. Credits are added only after the payment provider confirms the transaction." :
                                status === "delayed" ? "We have not received confirmation yet. Check your payment history or contact support with your order reference. Do not pay again without checking." :
                                status === "failed" ? "No additional credits were awarded for this transaction." :
                                status === "login" ? "Your session is required to view the order status." :
                                "We could not identify a valid order. Please check your payment history or contact support."}
                        </p>
                    </>
                )}
                {orderId && <p className="text-xs break-all text-gray-500 mb-4">Order: {orderId}</p>}
                <Button onClick={goToDashboard} variant={status === "verified" ? "outline" : "default"} className="w-full mt-2">
                    Go to Dashboard
                </Button>
                {status !== "verified" && <Button onClick={() => window.location.reload()} variant="outline" className="w-full mt-3">
                    Check Again
                </Button>}
            </div>
        </div>
    )
}
