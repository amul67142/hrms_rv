'use client'

import * as React from 'react'
import {
  Mail, Phone, MapPin, Calendar, Briefcase, Building2, User,
  CreditCard, Shield, Edit2, Camera, Save, X, Key, ShieldCheck,
  Monitor, Smartphone, Globe, Clock, UserCog
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

interface ProfileEmployee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  fatherName: string | null
  gender: string | null
  dateOfBirth: string | null
  maritalStatus: string | null
  department: string
  designation: string
  joiningDate: string
  employmentType: string
  status: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  panNumber: string | null
  aadhaarNumber: string | null
  uanNumber: string | null
  pfNumber: string | null
  esiNumber: string | null
  bankName: string | null
  accountNumber: string | null
  ifscCode: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  profileImage: string | null
  createdAt: string
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#2D2D2D' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" style={{ color: '#8B5CF6' }} />}
        <span className="text-sm" style={{ color: '#9CA3AF' }}>{label}</span>
      </div>
      <span className="text-sm font-medium text-white text-right">{value}</span>
    </div>
  )
}

export default function AdminProfilePage() {
  const { toast } = useToast()
  const [employee, setEmployee] = React.useState<ProfileEmployee | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [editOpen, setEditOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [loginHistory, setLoginHistory] = React.useState<any[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    dateOfBirth: '',
  })

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch('/api/me')
      const data = await res.json()
      if (data.success) {
        setEmployee(data.data)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const openHistory = () => {
    setHistoryOpen(true)
    setHistoryLoading(true)
    fetch('/api/me/login-history?limit=20')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLoginHistory(d.data || [])
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load login history', variant: 'destructive' }))
      .finally(() => setHistoryLoading(false))
  }

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'Mobile') return <Smartphone className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
    return <Monitor className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
  }

  React.useEffect(() => { fetchProfile() }, [fetchProfile])

  const openEdit = () => {
    if (!employee) return
    setEditForm({
      email: employee.email || '',
      phone: employee.phone || '',
      address: employee.address || '',
      city: employee.city || '',
      state: employee.state || '',
      pincode: employee.pincode || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Profile updated successfully' })
        setEditOpen(false)
        fetchProfile()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' })
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters', variant: 'destructive' })
      return
    }
    setPasswordSubmitting(true)
    try {
      const res = await fetch('/api/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Password changed successfully' })
        setPasswordOpen(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to change password', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to change password', variant: 'destructive' })
    } finally {
      setPasswordSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: '#1A1A1A' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Failed to load profile</p>
      </div>
    )
  }

  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Profile</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>View and manage your profile information</p>
        </div>
        <Button
          onClick={openEdit}
          className="text-white"
          style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="border-none" style={{ background: '#1A1A1A' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                className="text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <UserCog className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                  Admin
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {employee.firstName} {employee.lastName}
              </h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>{employee.designation}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm" style={{ color: '#9CA3AF' }}>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  {employee.department}
                </span>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  {employee.employeeCode}
                </span>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  Joined {employee.joiningDate ? formatDate(employee.joiningDate, 'MMMM yyyy') : 'N/A'}
                </span>
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                background: employee.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: employee.status === 'ACTIVE' ? '#22C55E' : '#EF4444',
              }}
            >
              {employee.status}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-500">Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="divide-y" style={{ borderColor: '#2D2D2D' }}>
            <InfoRow label="Full Name" value={`${employee.firstName} ${employee.lastName}`} />
            {employee.fatherName && <InfoRow label="Father's Name" value={employee.fatherName} />}
            {employee.gender && <InfoRow label="Gender" value={employee.gender.replace('_', ' ')} />}
            {employee.dateOfBirth && <InfoRow label="Date of Birth" value={formatDate(employee.dateOfBirth, 'dd MMMM yyyy')} />}
            {employee.maritalStatus && <InfoRow label="Marital Status" value={employee.maritalStatus} />}
            <InfoRow label="Email" value={employee.email} icon={Mail} />
            {employee.phone && <InfoRow label="Phone" value={employee.phone} icon={Phone} />}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Employment Details
            </CardTitle>
            <CardDescription className="text-gray-500">Your job information</CardDescription>
          </CardHeader>
          <CardContent className="divide-y" style={{ borderColor: '#2D2D2D' }}>
            <InfoRow label="Employee Code" value={employee.employeeCode} />
            <InfoRow label="Department" value={employee.department} icon={Building2} />
            <InfoRow label="Designation" value={employee.designation} />
            {employee.employmentType && <InfoRow label="Employment Type" value={employee.employmentType.replace('_', ' ')} />}
            <InfoRow label="Joining Date" value={employee.joiningDate ? formatDate(employee.joiningDate, 'dd MMMM yyyy') : ''} icon={Calendar} />
            <InfoRow label="Status" value={employee.status} />
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Address
            </CardTitle>
            <CardDescription className="text-gray-500">Your residential address</CardDescription>
          </CardHeader>
          <CardContent className="divide-y" style={{ borderColor: '#2D2D2D' }}>
            <InfoRow label="Address" value={employee.address || ''} />
            <InfoRow label="City" value={employee.city || ''} />
            <InfoRow label="State" value={employee.state || ''} />
            <InfoRow label="Pincode" value={employee.pincode || ''} />
          </CardContent>
        </Card>

        {/* Documents & Banking */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Documents &amp; Banking
            </CardTitle>
            <CardDescription className="text-gray-500">Government IDs and bank details</CardDescription>
          </CardHeader>
          <CardContent className="divide-y" style={{ borderColor: '#2D2D2D' }}>
            <InfoRow label="PAN Number" value={employee.panNumber || ''} />
            <InfoRow label="Aadhaar Number" value={employee.aadhaarNumber || ''} />
            <InfoRow label="UAN Number" value={employee.uanNumber || ''} />
            <InfoRow label="PF Number" value={employee.pfNumber || ''} />
            <InfoRow label="ESI Number" value={employee.esiNumber || ''} />
            <InfoRow label="Bank Name" value={employee.bankName || ''} />
            <InfoRow label="Account Number" value={employee.accountNumber || ''} />
            <InfoRow label="IFSC Code" value={employee.ifscCode || ''} />
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Emergency Contact
            </CardTitle>
            <CardDescription className="text-gray-500">In case of emergency</CardDescription>
          </CardHeader>
          <CardContent className="divide-y" style={{ borderColor: '#2D2D2D' }}>
            <InfoRow label="Contact Name" value={employee.emergencyContactName || ''} />
            {employee.emergencyContactPhone && <InfoRow label="Contact Phone" value={employee.emergencyContactPhone} icon={Phone} />}
          </CardContent>
        </Card>

        {/* Login History */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <CardTitle className="text-base text-white">Login History</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={openHistory}
                className="text-xs text-gray-400 hover:text-white h-7 px-2"
              >
                View All
              </Button>
            </div>
            <CardDescription className="text-gray-500">Your recent login activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center py-6 text-sm" style={{ color: '#6B7280' }}>
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p>Click &quot;View All&quot; to see your login history</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 max-w-lg" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input type="email" className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="your@email.com" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Phone</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="9876543210" />
              </div>
              <div>
                <Label className="text-gray-300">Date of Birth</Label>
                <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Address</Label>
              <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">City</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <Label className="text-gray-300">State</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
              </div>
              <div>
                <Label className="text-gray-300">Pincode</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.pincode} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} />
              </div>
            </div>
            <div className="border-t pt-4" style={{ borderColor: '#2D2D2D' }}>
              <p className="text-sm font-medium text-gray-300 mb-3">Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Contact Name</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.emergencyContactName} onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })} placeholder="Emergency contact name" />
                </div>
                <div>
                  <Label className="text-gray-300">Contact Phone</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })} placeholder="Emergency contact phone" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-gray-400">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={() => setPasswordOpen(true)} variant="outline" className="border-white/10 text-gray-300 hover:text-white">
              <Key className="h-4 w-4 mr-1" /> Change Password
            </Button>
            <Button onClick={handleSave} disabled={submitting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
              <Save className="h-4 w-4 mr-1" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="border-white/10 max-w-md" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Current Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Enter current password" />
            </div>
            <div>
              <Label className="text-gray-300">New Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Min 8 characters" />
            </div>
            <div>
              <Label className="text-gray-300">Confirm New Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Re-enter new password" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setPasswordOpen(false)} className="text-gray-400">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={passwordSubmitting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
              {passwordSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="border-white/10 max-w-2xl" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Login History
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#2D2D2D' }} />
              ))}
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30 text-gray-500" />
              <p className="text-sm" style={{ color: '#6B7280' }}>No login history found</p>
            </div>
          ) : (
            <div className="space-y-2 py-2 max-h-[400px] overflow-y-auto">
              {loginHistory.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ background: '#2D2D2D', borderColor: '#3D3D3D' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <DeviceIcon type={session.deviceType} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Globe className="h-3 w-3" style={{ color: '#8B5CF6' }} />
                        {session.ipAddress || 'Unknown IP'}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {session.browser} on {session.os} &middot; {session.deviceType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: session.isActive ? '#22C55E' : '#6B7280' }}
                      />
                      <span className="text-xs font-medium" style={{ color: session.isActive ? '#22C55E' : '#6B7280' }}>
                        {session.isActive ? 'Active' : 'Logged out'}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      {session.loginAt ? new Date(session.loginAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setHistoryOpen(false)} className="text-gray-400">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
