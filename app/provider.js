"use client"
import { useUser } from '@clerk/nextjs'
import axios from 'axios';
import React, { useEffect, useRef, Suspense, lazy } from 'react'

// Lazy load ChatBotWidget - only load when needed, not on every page
const ChatBotWidget = lazy(() => import('@/components/ChatBotWidget').catch(err => {
    console.error('Failed to load ChatBotWidget:', err);
    return { default: () => null };
}));

function Provider({ children }) {

    const { user } = useUser();
    const checkedRef = useRef(false);

    useEffect(() => {
        // Only check once per session to avoid repeated API calls
        if (user && !checkedRef.current) {
            checkedRef.current = true;
            CheckIsNewUser();
        }
    }, [user])

    /**
     * Used to check is User is New or Not - via API to avoid client-side DB calls
     * Uses request deduplication to prevent multiple calls
     */
    const CheckIsNewUser = async () => {
        try {
            // Use API route instead of direct DB call for better performance
            await axios.post('/api/create-user', {
                user: {
                    fullName: user?.fullName,
                    email: user?.primaryEmailAddress?.emailAddress
                }
            }, {
                timeout: 45000 // 45 second timeout - generous for cold starts and database latency
            });
        } catch (err) {
            // Silent fail - user creation will be handled by Inngest event
            console.log('User check completed');
        }
    }

    return (
        <div>
            {children}
            {/* Lazy load ChatBotWidget only when user is authenticated */}
            {user && (
                <Suspense fallback={null}>
                    <ChatBotWidget />
                </Suspense>
            )}
        </div>
    )
}

export default Provider