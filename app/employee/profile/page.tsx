'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { User, Briefcase, CreditCard, Shield, Edit2, Save, X, Key, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: '#2D2D2D' }}>
      <span className="text-sm" style={{ color: '#9CA3AF' }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: value ? '#fff' : '#4B5563' }}>
        {value || '—'}
      </span>
    </div>
  )
}

interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string
  email: string; phone: string | null; fatherName: string | null
  gender: string | null; dateOfBirth: string | null; maritalStatus: string | null
  department: string; designation: string; joiningDate: string; employmentType: string
  status: string; address: string | null; city: string | null; state: string | null
  pincode: string | null; aadhaarNumber: string | null
  bankName: string | null; accountNumber: string | null; ifscCode: string | null
  emergencyContactName: string | null; emergencyContactPhone: string | null
  profileCompleted: boolean; profileImage: string | null
}

const genderOpts = ['MALE', 'FEMALE', 'OTHER']
const maritalOpts = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']

export default function EmployeeProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [emp, setEmp] = React.useState<Employee | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [editOpen, setEditOpen] = React.useState(false)
  const [pwdOpen, setPwdOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [pwdSaving, setPwdSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    phone: '', gender: '', dateOfBirth: '', maritalStatus: '',
    fatherName: '', address: '', city: '', state: '', pincode: '',
    emergencyContactName: '', emergencyContactPhone: '',
    aadhaarNumber: '', bankName: '', accountNumber: '', ifscCode: '',
  })

  const [pwd, setPwd] = React.useState({ current: '', next: '', confirm: '' })

  const load = React.useCallback(async () => {
    const res = await fetch('/api/me')
    const d = await res.json()
    if (d.success) setEmp(d.data)
    setLoading(false)
  }, [])

  React.useEffect(() => { load() }, [load])

  // Required fields for profile completion
  const isProfileComplete = (e: Employee) =>
    !!(e.phone && e.gender && e.dateOfBirth && e.address && e.emergencyContactName && e.emergencyContactPhone)

  const openEdit = () => {
    if (!emp) return
    setForm({
      phone: emp.phone || '', gender: emp.gender || '', dateOfBirth: emp.dateOfBirth?.split('T')[0] || '',
      maritalStatus: emp.maritalStatus || '', fatherName: emp.fatherName || '',
      address: emp.address || '', city: emp.city || '', state: emp.state || '', pincode: emp.pincode || '',
      emergencyContactName: emp.emergencyContactName || '', emergencyContactPhone: emp.emergencyContactPhone || '',
      aadhaarNumber: emp.aadhaarNumber || '', bankName: emp.bankName || '',
      accountNumber: emp.accountNumber || '', ifscCode: emp.ifscCode || '',
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    // Validate required
    if (!form.phone || !form.gender || !form.dateOfBirth || !form.address || !form.emergencyContactName || !form.emergencyContactPhone) {
      toast({ title: 'Required fields missing', description: 'Phone, gender, date of birth, address and emergency contact are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    const payload: any = { ...form }
    // Check if all required fields now filled → mark complete
    if (form.phone && form.gender && form.dateOfBirth && form.address && form.emergencyContactName && form.emergencyContactPhone) {
      payload.profileCompleted = true
    }
    const res = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      toast({ title: 'Profile updated!' })
      setEditOpen(false)
      setEmp(d.data)
      // If profile just completed, refresh to remove gate
      if (payload.profileCompleted && !emp?.profileCompleted) {
        router.refresh()
      }
    } else {
      toast({ title: 'Error', description: d.error, variant: 'destructive' })
    }
  }

  const handlePwd = async () => {
    if (pwd.next !== pwd.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return
    }
    if (pwd.next.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters', variant: 'destructive' }); return
    }
    setPwdSaving(true)
    const res = await fetch('/api/me/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }) })
    const d = await res.json()
    setPwdSaving(false)
    if (d.success) { toast({ title: 'Password changed!' }); setPwdOpen(false); setPwd({ current: '', next: '', confirm: '' }) }
    else toast({ title: 'Error', description: d.error, variant: 'destructive' })
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl">
      {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: '#1A1A1A' }} />)}
    </div>
  )

  if (!emp) return <p className="text-gray-400 py-20 text-center">Failed to load profile</p>

  const complete = emp.profileCompleted && isProfileComplete(emp)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Completion Banner */}
      {!complete && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: '#EAB308' }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: '#EAB308' }}>Complete your profile to access all features</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              Fill in your personal details, address, and emergency contact. Bank details and Aadhaar are optional.
            </p>
          </div>
          <Button size="sm" onClick={openEdit} className="shrink-0 text-white" style={{ background: '#EAB308', borderColor: '#EAB308', color: '#000' }}>
            Complete Now
          </Button>
        </div>
      )}

      {complete && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
          <p className="text-sm" style={{ color: '#22C55E' }}>Profile complete — all features unlocked</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{emp.firstName} {emp.lastName}</h2>
          <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>{emp.designation} · {emp.department} · {emp.employeeCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-white" onClick={() => setPwdOpen(true)}>
            <Key className="h-3.5 w-3.5 mr-1.5" /> Change Password
          </Button>
          <Button size="sm" className="text-white" style={{ background: '#8B5CF6' }} onClick={openEdit}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Full Name" value={`${emp.firstName} ${emp.lastName}`} />
            <InfoRow label="Father's Name" value={emp.fatherName} />
            <InfoRow label="Gender" value={emp.gender} />
            <InfoRow label="Date of Birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth, 'dd MMM yyyy') : null} />
            <InfoRow label="Marital Status" value={emp.maritalStatus} />
            <InfoRow label="Phone" value={emp.phone} />
            <InfoRow label="Email" value={emp.email} />
          </CardContent>
        </Card>

        {/* Employment */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Briefcase className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Employee Code" value={emp.employeeCode} />
            <InfoRow label="Department" value={emp.department} />
            <InfoRow label="Designation" value={emp.designation} />
            <InfoRow label="Type" value={emp.employmentType?.replace(/_/g, ' ')} />
            <InfoRow label="Joining Date" value={formatDate(emp.joiningDate, 'dd MMM yyyy')} />
            <InfoRow label="Status" value={emp.status} />
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Address & Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Address" value={emp.address} />
            <InfoRow label="City" value={emp.city} />
            <InfoRow label="State" value={emp.state} />
            <InfoRow label="Pincode" value={emp.pincode} />
            <InfoRow label="Emergency Contact" value={emp.emergencyContactName} />
            <InfoRow label="Emergency Phone" value={emp.emergencyContactPhone} />
          </CardContent>
        </Card>

        {/* Bank & IDs */}
        <Card className="border-none" style={{ background: '#1A1A1A' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Bank & ID Details
            </CardTitle>
            <CardDescription className="text-xs" style={{ color: '#6B7280' }}>Optional — add for payroll & compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <InfoRow label="Aadhaar Number" value={emp.aadhaarNumber ? `****${emp.aadhaarNumber.slice(-4)}` : null} />
            <InfoRow label="Bank Name" value={emp.bankName} />
            <InfoRow label="Account Number" value={emp.accountNumber ? `****${emp.accountNumber.slice(-4)}` : null} />
            <InfoRow label="IFSC Code" value={emp.ifscCode} />
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Profile Dialog ─────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              {emp.profileCompleted ? 'Edit Profile' : 'Complete Your Profile'}
            </DialogTitle>
            {!emp.profileCompleted && (
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                Fields marked <span className="text-red-400">*</span> are required to unlock all features.
              </p>
            )}
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Personal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Personal Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Father&apos;s Name</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.fatherName} onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))} placeholder="Father's name" />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Phone <span className="text-red-400">*</span></Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Gender <span className="text-red-400">*</span></Label>
                  <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{genderOpts.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Date of Birth <span className="text-red-400">*</span></Label>
                  <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Marital Status</Label>
                  <Select value={form.maritalStatus} onValueChange={v => setForm(p => ({ ...p, maritalStatus: v }))}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{maritalOpts.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Address</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-xs">Street Address <span className="text-red-400">*</span></Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="House no, street, area" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-300 text-xs">City</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">State</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Pincode</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} placeholder="400001" />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Emergency Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Contact Name <span className="text-red-400">*</span></Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.emergencyContactName} onChange={e => setForm(p => ({ ...p, emergencyContactName: e.target.value }))} placeholder="Parent / Spouse name" />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Contact Phone <span className="text-red-400">*</span></Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.emergencyContactPhone} onChange={e => setForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} placeholder="9876543210" />
                </div>
              </div>
            </div>

            {/* Optional: Bank & IDs */}
            <div className="rounded-lg p-4 space-y-3" style={{ background: '#0F0F0F', border: '1px solid #2D2D2D' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Bank & ID Details <span className="ml-1 font-normal normal-case" style={{ color: '#4B5563' }}>(Optional — for payroll & compliance)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Aadhaar Number</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.aadhaarNumber} onChange={e => setForm(p => ({ ...p, aadhaarNumber: e.target.value }))} placeholder="12-digit Aadhaar" maxLength={12} />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Bank Name</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="SBI / HDFC / ICICI..." />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Account Number</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="Account number" />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">IFSC Code</Label>
                  <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.ifscCode} onChange={e => setForm(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))} placeholder="SBIN0001234" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" className="text-gray-400" onClick={() => setEditOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button className="text-white" style={{ background: '#8B5CF6' }} onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : (emp.profileCompleted ? 'Save Changes' : 'Save & Complete Profile')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ──────────────────────────────────── */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="border-white/10 max-w-md" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-gray-300 text-xs">Current Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} placeholder="Your current password" />
            </div>
            <div>
              <Label className="text-gray-300 text-xs">New Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={pwd.next} onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} placeholder="Min 8 characters" />
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Confirm New Password</Label>
              <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" className="text-gray-400" onClick={() => setPwdOpen(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button className="text-white" style={{ background: '#8B5CF6' }} onClick={handlePwd} disabled={pwdSaving}>
              {pwdSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
