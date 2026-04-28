'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Briefcase, Calendar, User, Building2, CreditCard, Shield, Key, Copy, Check, ShieldCheck, Globe, Monitor, Smartphone, Clock, FileText, History, LogIn, LogOut, Settings, DollarSign, Palette, CalendarCheck, AlertTriangle, Activity, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/core/utils'
import { useToast } from '@/components/ui/use-toast'

interface ViewEmployee {
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
  salaryStructures?: Array<{
    basicSalary: number
    hra: number
    conveyanceAllowance: number
    medicalAllowance: number
    specialAllowance: number
  }>
  leaveBalances?: Array<{
    leaveType: string
    entitled: number
    taken: number
    available: number
  }>
}

interface LeaveBalance {
  id: string | null
  employeeId: string
  leaveType: string
  year: number
  entitled: number
  taken: number
  pending: number
  available: number
}

interface TimelineEntry {
  id: string
  module: string
  action: string
  description: string
  timestamp: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
}

interface GroupedTimeline {
  date: string
  entries: TimelineEntry[]
}

const statusColors: Record<string, string> = {
  ACTIVE: '#22C55E',
  INACTIVE: '#6B7280',
  RESIGNED: '#F59E0B',
  TERMINATED: '#EF4444',
  ON_LEAVE: '#3B82F6',
}

const moduleIcons: Record<string, React.ElementType> = {
  LEAVE: CalendarCheck,
  AUTH: ShieldCheck,
  PROFILE: User,
  SALARY: DollarSign,
  ATTENDANCE: Clock,
  DOCUMENT: FileText,
  TASK: Settings,
  REIMBURSEMENT: Receipt,
  LEARNING: Palette,
  DEFAULT: Activity,
}

const moduleColors: Record<string, string> = {
  LEAVE: '#3B82F6',
  AUTH: '#22C55E',
  PROFILE: '#8B5CF6',
  SALARY: '#F59E0B',
  ATTENDANCE: '#06B6D4',
  DOCUMENT: '#EC4899',
  TASK: '#6366F1',
  REIMBURSEMENT: '#14B8A6',
  LEARNING: '#F97316',
  DEFAULT: '#8B5CF6',
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#2D2D2D' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" style={{ color: '#8B5CF6' }} />}
        <span className="text-sm" style={{ color: '#9CA3AF' }}>{label}</span>
      </div>
      <span className="text-sm font-medium text-white text-right">{value || 'Not provided'}</span>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [employee, setEmployee] = React.useState<ViewEmployee | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)
  const [tempPassword, setTempPassword] = React.useState('')
  const [resetting, setResetting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [loginSessions, setLoginSessions] = React.useState<any[]>([])
  const [loginSummary, setLoginSummary] = React.useState<any>(null)
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalance[]>([])
  const [editBalanceOpen, setEditBalanceOpen] = React.useState(false)
  const [editingBalance, setEditingBalance] = React.useState<LeaveBalance | null>(null)
  const [editForm, setEditForm] = React.useState({ entitled: 0, taken: 0, available: 0 })
  const [savingBalance, setSavingBalance] = React.useState(false)
  const [timeline, setTimeline] = React.useState<GroupedTimeline[]>([])
  const [timelineLoading, setTimelineLoading] = React.useState(false)
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear())

  React.useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${params.id}`)
        const data = await res.json()
        if (data.success) {
          setEmployee(data.data)
        } else {
          toast({ title: 'Error', description: 'Employee not found', variant: 'destructive' })
        }
      } catch (_e) {
        toast({ title: 'Error', description: 'Failed to load employee', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [params.id, toast])

  const fetchLeaveBalances = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/leave/balance/${params.id}?year=${currentYear}`)
      const data = await res.json()
      if (data.success) {
        setLeaveBalances(data.data.balances)
      }
    } catch (_e) {
      // silently fail
    }
  }, [params.id, currentYear])

  const fetchLoginHistory = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/employees/${params.id}/login-history`)
      const data = await res.json()
      if (data.success) {
        setLoginSessions(data.data.sessions)
        setLoginSummary(data.data.summary)
      }
    } catch (_e) {
      // silently fail for history
    }
  }, [params.id])

  const fetchTimeline = React.useCallback(async () => {
    setTimelineLoading(true)
    try {
      const res = await fetch(`/admin/employees/${params.id}/activity`)
      const data = await res.json()
      if (data.success) {
        setTimeline(data.data.activities)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load timeline', variant: 'destructive' })
    } finally {
      setTimelineLoading(false)
    }
  }, [params.id, toast])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${params.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Employee deleted' })
        window.location.href = '/admin/employees'
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete employee', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async () => {
    setResetting(true)
    try {
      const res = await fetch(`/api/employees/${params.id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTempPassword(data.data.tempPassword)
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to reset password', variant: 'destructive' })
        setResetDialogOpen(false)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' })
      setResetDialogOpen(false)
    } finally {
      setResetting(false)
    }
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEditBalance = (balance: LeaveBalance) => {
    setEditingBalance(balance)
    setEditForm({
      entitled: balance.entitled,
      taken: balance.taken,
      available: balance.available,
    })
    setEditBalanceOpen(true)
  }

  const handleSaveBalance = async () => {
    if (!editingBalance) return
    setSavingBalance(true)
    try {
      const res = await fetch(`/api/leave/balance/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: editingBalance.leaveType,
          entitled: editForm.entitled,
          taken: editForm.taken,
          available: editForm.available,
          year: currentYear,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Leave balance updated successfully' })
        setEditBalanceOpen(false)
        fetchLeaveBalances()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update balance', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update leave balance', variant: 'destructive' })
    } finally {
      setSavingBalance(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateHeader = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ background: '#1A1A1A' }} />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Employee not found</p>
      </div>
    )
  }

  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`
  const salary = employee.salaryStructures?.[0]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
          <Link href="/admin/employees">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Employee Details</h2>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>{employee.employeeCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="border-white/10 text-gray-300 hover:text-white hover:bg-white/10">
            <Link href={`/admin/employees/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setResetDialogOpen(true)} className="border-white/10 text-gray-300 hover:text-white hover:bg-white/10">
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </Button>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white">
                  {employee.firstName} {employee.lastName}
                </h3>
                <Badge className="text-white text-xs" style={{ background: statusColors[employee.status] || '#6B7280' }}>
                  {employee.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{employee.designation}</p>
              <div className="flex items-center gap-4 mt-2 text-sm flex-wrap" style={{ color: '#9CA3AF' }}>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  {employee.department}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                    {employee.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                  Joined {formatDate(employee.joiningDate, 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Overview</TabsTrigger>
          <TabsTrigger value="salary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Salary</TabsTrigger>
          <TabsTrigger value="leave" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Leave</TabsTrigger>
          <TabsTrigger value="security" onClick={fetchLoginHistory} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
            <ShieldCheck className="h-4 w-4 mr-1" /> Security
          </TabsTrigger>
          <TabsTrigger value="timeline" onClick={fetchTimeline} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
            <History className="h-4 w-4 mr-1" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <User className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Full Name" value={`${employee.firstName} ${employee.lastName}`} />
                <InfoRow label="Father's Name" value={employee.fatherName || ''} />
                <InfoRow label="Gender" value={employee.gender?.replace('_', ' ') || ''} />
                <InfoRow label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth, 'dd MMMM yyyy') : ''} />
                <InfoRow label="Marital Status" value={employee.maritalStatus || ''} />
                <InfoRow label="Email" value={employee.email} icon={Mail} />
                <InfoRow label="Phone" value={employee.phone || ''} icon={Phone} />
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Employee Code" value={employee.employeeCode} />
                <InfoRow label="Department" value={employee.department} icon={Building2} />
                <InfoRow label="Designation" value={employee.designation} />
                <InfoRow label="Employment Type" value={employee.employmentType.replace('_', ' ')} />
                <InfoRow label="Joining Date" value={formatDate(employee.joiningDate, 'dd MMMM yyyy')} icon={Calendar} />
                <InfoRow label="Status" value={employee.status.replace('_', ' ')} />
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Address" value={employee.address || ''} />
                <InfoRow label="City" value={employee.city || ''} />
                <InfoRow label="State" value={employee.state || ''} />
                <InfoRow label="Pincode" value={employee.pincode || ''} />
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                  Documents &amp; Banking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="PAN Number" value={employee.panNumber || ''} />
                <InfoRow label="Aadhaar Number" value={employee.aadhaarNumber || ''} />
                <InfoRow label="UAN Number" value={employee.uanNumber || ''} />
                <InfoRow label="PF Number" value={employee.pfNumber || ''} />
                <InfoRow label="Bank Name" value={employee.bankName || ''} />
                <InfoRow label="Account Number" value={employee.accountNumber ? `****${employee.accountNumber.slice(-4)}` : ''} />
                <InfoRow label="IFSC Code" value={employee.ifscCode || ''} />
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Contact Name" value={employee.emergencyContactName || ''} />
                <InfoRow label="Contact Phone" value={employee.emergencyContactPhone || ''} icon={Phone} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salary" className="mt-6">
          <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Current Salary Structure</CardTitle>
              <CardDescription className="text-gray-500">Active salary components</CardDescription>
            </CardHeader>
            <CardContent>
              {salary ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Basic Salary', value: formatCurrency(salary.basicSalary) },
                    { label: 'HRA', value: formatCurrency(salary.hra) },
                    { label: 'Conveyance', value: formatCurrency(salary.conveyanceAllowance) },
                    { label: 'Medical', value: formatCurrency(salary.medicalAllowance) },
                    { label: 'Special Allowance', value: formatCurrency(salary.specialAllowance) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className="text-lg font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No salary structure defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-base">Leave Balances</CardTitle>
                  <CardDescription className="text-gray-500">
                    Current year leave summary
                    <select
                      value={currentYear}
                      onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                      className="ml-2 bg-transparent text-gray-400 text-xs border border-white/10 rounded px-2 py-1"
                      onFocus={fetchLeaveBalances}
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                        <option key={y} value={y} style={{ background: '#1A1A1A' }}>{y}</option>
                      ))}
                    </select>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leaveBalances.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {leaveBalances.map((lb) => (
                    <div key={lb.leaveType} className="rounded-lg p-4 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white">{lb.leaveType.replace('_', ' ')}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => openEditBalance(lb)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Entitled</span>
                          <span className="text-white font-medium">{lb.entitled}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Taken</span>
                          <span className="text-red-400 font-medium">{lb.taken}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Pending</span>
                          <span className="text-yellow-400 font-medium">{lb.pending}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Available</span>
                          <span className="text-green-400 font-medium">{lb.available}</span>
                        </div>
                        <div className="w-full rounded-full h-2 mt-2" style={{ background: '#2D2D2D' }}>
                          <div className="h-2 rounded-full" style={{ background: '#8B5CF6', width: `${lb.entitled > 0 ? (lb.available / lb.entitled) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: '#8B5CF6' }} />
                  <p className="text-sm" style={{ color: '#6B7280' }}>No leave balances found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                    onClick={fetchLeaveBalances}
                  >
                    Load Balances
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg p-4 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Total Logins</p>
              </div>
              <p className="text-2xl font-bold text-white">{loginSummary?.totalLogins ?? '—'}</p>
            </div>
            <div className="rounded-lg p-4 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Active Sessions</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: loginSummary?.activeSessions > 0 ? '#22C55E' : '#9CA3AF' }}>
                {loginSummary?.activeSessions ?? '—'}
              </p>
            </div>
            <div className="rounded-lg p-4 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Last Login</p>
              </div>
              <p className="text-sm font-medium text-white truncate">
                {loginSummary?.lastLogin
                  ? new Date(loginSummary.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Login Sessions Table */}
          <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                Login Sessions
              </CardTitle>
              <CardDescription className="text-gray-500">Complete login history with IP addresses and devices</CardDescription>
            </CardHeader>
            <CardContent>
              {loginSessions.length === 0 ? (
                <div className="py-12 text-center">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: '#8B5CF6' }} />
                  <p className="text-sm" style={{ color: '#6B7280' }}>No login sessions found for this employee</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs font-medium" style={{ color: '#6B7280' }}>
                    <div>IP Address</div>
                    <div>Device</div>
                    <div>Browser / OS</div>
                    <div>Login Time</div>
                    <div>Status</div>
                  </div>
                  {loginSessions.map((session: any) => (
                    <div key={session.id} className="grid grid-cols-5 gap-2 px-3 py-3 rounded-lg items-center" style={{ background: '#0F0F0F', border: '1px solid #2D2D2D' }}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                        <span className="text-sm text-white font-mono">{session.ipAddress || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {session.deviceType === 'Mobile' ? (
                          <Smartphone className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                        ) : (
                          <Monitor className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
                        )}
                        <span className="text-sm text-gray-300">{session.deviceType}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-300">{session.browser}</span>
                        <span className="text-xs text-gray-600 ml-1">/ {session.os}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-300">
                          {new Date(session.loginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-gray-600 ml-1">
                          {new Date(session.loginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: session.isActive ? '#22C55E' : '#6B7280' }} />
                        <span className="text-sm font-medium" style={{ color: session.isActive ? '#22C55E' : '#6B7280' }}>
                          {session.isActive ? 'Active' : 'Logged out'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <History className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                Activity Timeline
              </CardTitle>
              <CardDescription className="text-gray-500">Recent employee activity and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-32 rounded mb-2" style={{ background: '#2D2D2D' }} />
                      <div className="h-12 rounded" style={{ background: '#0F0F0F' }} />
                    </div>
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: '#8B5CF6' }} />
                  <p className="text-sm" style={{ color: '#6B7280' }}>No activity found for this employee</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {timeline.map((group) => (
                    <div key={group.date}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>
                        {formatDateHeader(group.date)}
                      </h4>
                      <div className="relative pl-6 space-y-4">
                        {group.entries.map((entry, index) => {
                          const IconComponent = entry.action === 'LOGIN' ? LogIn : entry.action === 'LOGOUT' ? LogOut : moduleIcons[entry.module] || moduleIcons.DEFAULT
                          const iconColor = entry.action === 'LOGIN' ? '#22C55E' : entry.action === 'LOGOUT' ? '#6B7280' : moduleColors[entry.module] || moduleColors.DEFAULT

                          return (
                            <div key={entry.id} className="relative">
                              {index < group.entries.length - 1 && (
                                <div
                                  className="absolute left-[7px] top-6 bottom-0 w-px"
                                  style={{ background: '#2D2D2D' }}
                                />
                              )}
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10"
                                  style={{ background: `${iconColor}20`, border: `1px solid ${iconColor}` }}
                                >
                                  <IconComponent className="h-4 w-4" style={{ color: iconColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      className="text-[10px] px-1.5 py-0"
                                      style={{ background: `${iconColor}20`, color: iconColor, borderColor: `${iconColor}40` }}
                                    >
                                      {entry.module}
                                    </Badge>
                                    <span className="text-xs" style={{ color: '#6B7280' }}>
                                      {formatTimestamp(entry.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-white mt-0.5 break-words">{entry.description}</p>
                                  {entry.userEmail && (
                                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                      by {entry.userEmail}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Delete Employee</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete {employee.firstName} {employee.lastName}? This action will deactivate the employee.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="text-white" style={{ background: '#EF4444', borderColor: '#EF4444' }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Reset password for {employee?.firstName} {employee?.lastName}?
              A new temporary password will be generated.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-3 py-2">
              <div className="rounded-lg p-4 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold font-mono text-white tracking-wider">{tempPassword}</p>
                  <Button variant="ghost" size="icon" onClick={handleCopyPassword} className="text-gray-400 hover:text-white">
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-400">
                Share this password with the employee securely. They should change it after logging in.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            {tempPassword ? (
              <>
                <Button variant="ghost" onClick={() => { setResetDialogOpen(false); setTempPassword('') }} className="text-gray-400">
                  Close
                </Button>
                <Button variant="outline" onClick={() => { setTempPassword(''); handleResetPassword() }} className="border-white/10 text-gray-300 hover:text-white hover:bg-white/10">
                  Generate New
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setResetDialogOpen(false)} className="text-gray-400">Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
                  {resetting ? 'Generating...' : 'Generate Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Balance Dialog */}
      <Dialog open={editBalanceOpen} onOpenChange={setEditBalanceOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Edit Leave Balance
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingBalance?.leaveType.replace('_', ' ')} - {currentYear}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="entitled" className="text-gray-300">Entitled Days</Label>
              <Input
                id="entitled"
                type="number"
                min="0"
                value={editForm.entitled}
                onChange={(e) => setEditForm({ ...editForm, entitled: parseInt(e.target.value) || 0 })}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taken" className="text-gray-300">Taken Days</Label>
              <Input
                id="taken"
                type="number"
                min="0"
                value={editForm.taken}
                onChange={(e) => setEditForm({ ...editForm, taken: parseInt(e.target.value) || 0 })}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available" className="text-gray-300">Available Days</Label>
              <Input
                id="available"
                type="number"
                min="0"
                value={editForm.available}
                onChange={(e) => setEditForm({ ...editForm, available: parseInt(e.target.value) || 0 })}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-gray-400">
                Changes will be logged in the audit trail for compliance.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditBalanceOpen(false)} className="text-gray-400">Cancel</Button>
            <Button
              onClick={handleSaveBalance}
              disabled={savingBalance}
              className="text-white"
              style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
            >
              {savingBalance ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
