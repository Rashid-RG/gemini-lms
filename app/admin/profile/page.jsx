"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { toast } from 'sonner'
import {
    User, Mail, Shield, Calendar, Clock, Edit2,
    Lock, Eye, EyeOff, Loader2, Save, Check, Camera, Trash2
} from 'lucide-react'

export default function ProfilePage() {
    const { admin, refreshSession } = useAdminAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    // Edit name
    const [editingName, setEditingName] = useState(false)
    const [newName, setNewName] = useState('')
    const [savingName, setSavingName] = useState(false)

    // Change password
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPasswords, setShowPasswords] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)

    // Profile picture
    const fileInputRef = useRef(null)
    const [uploadingPic, setUploadingPic] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const res = await axios.get('/api/admin/profile')
            setProfile(res.data.profile)
            setNewName(res.data.profile.name)
        } catch (err) {
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateName = async () => {
        if (!newName.trim() || newName.trim() === profile.name) {
            setEditingName(false)
            return
        }
        setSavingName(true)
        try {
            await axios.put('/api/admin/profile', { name: newName.trim() })
            toast.success('Name updated!')
            setProfile(p => ({ ...p, name: newName.trim() }))
            setEditingName(false)
            refreshSession()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update name')
        } finally {
            setSavingName(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()

        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setSavingPassword(true)
        try {
            await axios.put('/api/admin/profile', { currentPassword, newPassword })
            toast.success('Password changed successfully!')
            setShowPasswordForm(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password')
        } finally {
            setSavingPassword(false)
        }
    }

    const roleConfig = {
        super_admin: { label: 'Super Admin', emoji: '🛡️', color: 'purple' },
        admin: { label: 'Admin', emoji: '🔑', color: 'blue' },
        tutor: { label: 'Tutor', emoji: '🎓', color: 'orange' },
    }

    const handleUploadPic = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate type
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowed.includes(file.type)) {
            toast.error('Please select a JPEG, PNG, WebP, or GIF image')
            return
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB')
            return
        }

        setUploadingPic(true)
        try {
            const formData = new FormData()
            formData.append('avatar', file)

            const res = await axios.post('/api/admin/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            setProfile(p => ({ ...p, profilePic: res.data.profilePic }))
            toast.success('Profile picture updated!')
            refreshSession()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to upload picture')
        } finally {
            setUploadingPic(false)
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemovePic = async () => {
        setUploadingPic(true)
        try {
            await axios.delete('/api/admin/profile/avatar')
            setProfile(p => ({ ...p, profilePic: null }))
            toast.success('Profile picture removed')
            refreshSession()
        } catch (err) {
            toast.error('Failed to remove picture')
        } finally {
            setUploadingPic(false)
        }
    }

    // Sanitize profile pic URL - only allow safe data: image URLs
    const getSafeProfilePic = (pic) => {
        if (!pic) return null
        const safePattern = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/
        return safePattern.test(pic) ? pic : null
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const rc = roleConfig[profile?.role] || roleConfig.admin
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Banner */}
                <div className="h-24 bg-gradient-to-r from-primary/80 to-primary" />

                {/* Avatar + Info */}
                <div className="px-6 pb-6">
                    <div className="flex items-end gap-4 -mt-10 mb-6">
                        {/* Profile Picture with Upload */}
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                                {getSafeProfilePic(profile?.profilePic) ? (
                                    <img
                                        src={getSafeProfilePic(profile.profilePic)}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl">{rc.emoji}</span>
                                )}
                            </div>
                            {/* Upload overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPic}
                                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Change profile picture"
                            >
                                {uploadingPic ? (
                                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-5 w-5 text-white" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleUploadPic}
                                className="hidden"
                            />
                            {/* Remove button */}
                            {profile?.profilePic && (
                                <button
                                    onClick={handleRemovePic}
                                    disabled={uploadingPic}
                                    className="absolute -bottom-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove profile picture"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                        <div className="pb-1">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[rc.color]}`}>
                                {rc.label}
                            </span>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                                    {editingName ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdateName()
                                                    if (e.key === 'Escape') { setEditingName(false); setNewName(profile.name) }
                                                }}
                                            />
                                            <button
                                                onClick={handleUpdateName}
                                                disabled={savingName}
                                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                            >
                                                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="font-medium text-gray-900 dark:text-white">{profile?.name}</p>
                                    )}
                                </div>
                            </div>
                            {!editingName && (
                                <button
                                    onClick={() => setEditingName(true)}
                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Email (read-only) */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                <p className="font-medium text-gray-900 dark:text-white">{profile?.email}</p>
                            </div>
                        </div>

                        {/* Role (read-only) */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <Shield className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                                <p className="font-medium text-gray-900 dark:text-white">{rc.label}</p>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <Clock className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Now'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Update your login password</p>
                        </div>
                    </div>
                    {!showPasswordForm && (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Change
                        </button>
                    )}
                </div>

                {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter current password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                                    confirmPassword && confirmPassword !== newPassword
                                        ? 'border-red-400'
                                        : confirmPassword && confirmPassword === newPassword
                                        ? 'border-green-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Repeat new password"
                                required
                            />
                            {confirmPassword && confirmPassword !== newPassword && (
                                <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordForm(false)
                                    setCurrentPassword('')
                                    setNewPassword('')
                                    setConfirmPassword('')
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                            >
                                {savingPassword ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save Password
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
