"use client"
import { UserProfile, useUser } from '@clerk/nextjs'
import React from 'react'

function Profile() {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return (
      <div className="p-6 text-slate-600">Loading profile...</div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-lg font-semibold">
          {user?.firstName?.[0] || user?.username?.[0] || 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{user?.fullName || user?.username || 'User'}</p>
          <p className="text-sm text-slate-600">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      <div className="border rounded-lg shadow-sm p-4 bg-white">
        <UserProfile routing="path" path="/dashboard/profile" />
      </div>
    </div>
  )
}

export default Profile
