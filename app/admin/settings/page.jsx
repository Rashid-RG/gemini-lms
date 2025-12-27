"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Settings, 
    Loader2, 
    Save,
    Shield,
    UserPlus,
    Key,
    Mail,
    Eye,
    EyeOff,
    Trash2,
    AlertTriangle,
    CheckCircle,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

function AdminSettingsPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [admins, setAdmins] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    
    // New admin form
    const [showAddAdmin, setShowAddAdmin] = useState(false)
    const [newAdmin, setNewAdmin] = useState({
        email: '',
        password: '',
        name: '',
        role: 'admin'
    })
    const [showPassword, setShowPassword] = useState(false)
    const [addingAdmin, setAddingAdmin] = useState(false)

    // Delete modal
    const [deleteModal, setDeleteModal] = useState({ open: false, admin: null })
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchAdmins()
        }
    }, [authLoading, admin])

    const fetchAdmins = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/settings/admins')
            setAdmins(response.data.admins || [])
        } catch (error) {
            console.error('Error fetching admins:', error)
            toast.error('Failed to load admin users')
        } finally {
            setLoading(false)
        }
    }

    const handleAddAdmin = async (e) => {
        e.preventDefault()
        
        if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
            toast.error('Please fill in all fields')
            return
        }

        if (newAdmin.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        try {
            setAddingAdmin(true)
            await axios.post('/api/admin/settings/admins', newAdmin)
            toast.success('Admin user created successfully')
            setNewAdmin({ email: '', password: '', name: '', role: 'admin' })
            setShowAddAdmin(false)
            fetchAdmins()
        } catch (error) {
            console.error('Error creating admin:', error)
            toast.error(error.response?.data?.error || 'Failed to create admin user')
        } finally {
            setAddingAdmin(false)
        }
    }

    const handleDeleteAdmin = async () => {
        if (!deleteModal.admin) return

        try {
            setDeleting(true)
            await axios.delete('/api/admin/settings/admins', {
                data: { adminId: deleteModal.admin.id }
            })
            toast.success('Admin user deleted')
            setDeleteModal({ open: false, admin: null })
            fetchAdmins()
        } catch (error) {
            console.error('Error deleting admin:', error)
            toast.error(error.response?.data?.error || 'Failed to delete admin user')
        } finally {
            setDeleting(false)
        }
    }

    const handleToggleActive = async (targetAdmin) => {
        try {
            await axios.patch('/api/admin/settings/admins', {
                adminId: targetAdmin.id,
                isActive: !targetAdmin.isActive
            })
            toast.success(`Admin ${targetAdmin.isActive ? 'deactivated' : 'activated'}`)
            fetchAdmins()
        } catch (error) {
            console.error('Error toggling admin status:', error)
            toast.error('Failed to update admin status')
        }
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Only super_admin can access settings
    if (admin?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Shield className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-gray-500">Only super admins can access settings.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="h-6 w-6 text-primary" />
                        Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage admin users and system settings
                    </p>
                </div>
            </div>

            {/* Admin Users Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">Admin Users</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchAdmins} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowAddAdmin(!showAddAdmin)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Admin
                        </Button>
                    </div>
                </div>

                {/* Add Admin Form */}
                {showAddAdmin && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newAdmin.name}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                        placeholder="Admin Name"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                        placeholder="admin@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newAdmin.password}
                                            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                            placeholder="Minimum 8 characters"
                                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={newAdmin.role}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowAddAdmin(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={addingAdmin}>
                                    {addingAdmin ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <UserPlus className="h-4 w-4 mr-2" />
                                    )}
                                    Create Admin
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Admins List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : admins.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No admin users found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {admins.map((adminUser) => (
                            <div key={adminUser.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${adminUser.role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                        <Shield className={`h-5 w-5 ${adminUser.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'}`} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {adminUser.name}
                                            {adminUser.id === admin?.id && (
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">You</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            {adminUser.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        adminUser.role === 'super_admin' 
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                        {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    </span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        adminUser.isActive 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {adminUser.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {adminUser.id !== admin?.id && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleToggleActive(adminUser)}
                                            >
                                                {adminUser.isActive ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setDeleteModal({ open: true, admin: adminUser })}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* System Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    System Information
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">Admin Authentication</span>
                        <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Database-based (separate from Clerk)
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">Session Duration</span>
                        <span className="text-gray-900 dark:text-white">24 hours</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">Password Hashing</span>
                        <span className="text-gray-900 dark:text-white">PBKDF2 (100,000 iterations)</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-gray-500">Current Admin</span>
                        <span className="text-gray-900 dark:text-white">{admin?.email}</span>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Admin</h3>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Are you sure you want to delete <strong>{deleteModal.admin?.name}</strong> ({deleteModal.admin?.email})?
                            This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setDeleteModal({ open: false, admin: null })}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleDeleteAdmin}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete Admin
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminSettingsPage
