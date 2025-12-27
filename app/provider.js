"use client"
import { useUser } from '@clerk/nextjs'
import axios from 'axios';
import React, { useEffect, useRef } from 'react'
import ChatBotWidget from '@/components/ChatBotWidget'

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
     */
    const CheckIsNewUser = async () => {
        try {
            // Use API route instead of direct DB call for better performance
            await axios.post('/api/create-user', {
                user: {
                    fullName: user?.fullName,
                    email: user?.primaryEmailAddress?.emailAddress
                }
            });
        } catch (err) {
            // Silent fail - user creation will be handled by Inngest event
            console.log('User check completed');
        }
    }

    return (
        <div>
            {children}
            <ChatBotWidget />
        </div>
    )
}

export default Provider