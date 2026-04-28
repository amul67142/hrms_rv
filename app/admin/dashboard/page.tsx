'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  Building2,
  Plus,
  FileCheck,
  FileText,
  Upload,
  BarChart3,
  Bell,
  X,
  RefreshCw,
  TrendingUp,
  Calendar,
  Clock,
  UserPlus,
  CheckCircle,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { AuditLog } from '@/types'

const COLORS = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#3B0764']

const REFRESH_INTERVAL = 60_000 // 60 seconds

interface DashboardData {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  absentToday: number
  pendingLeaveRequests: number
  totalDepartments: number
  employeesByDepartment: { department: string; count: number }[]
  attendanceTrend: { date: string; present: number; absent: number }[]
  recentLeaveRequests: Array<{
    id: string
    employeeId: string
    leaveType: string
    startDate: Date | string
    endDate: Date | string
    totalDays: number
    reason?: string | null
    status: string
    appliedAt?: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
    employee?: {
      employeeCode: string
      firstName: string
      lastName: string
      department: string
    }
  }>
}

interface AttendanceTodayData {
  present: number
  absent: number
  halfDay: number
  leave: number
  weekOff: number
  holiday: number
  notMarked: number
  totalActive: number
}

interface AlertData {
  pendingApprovals: number
  missingAttendance: number
  upcomingResignations: number
  pendingDocuments: number
}

// --- Skeleton Components ---

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
    >
      <div className="p-5">
        <div className="h-3 w-24 rounded" style={{ background: '#262626' }} />
        <div className="h-9 w-16 mt-3 rounded" style={{ background: '#262626' }} />
        <div className="h-3 w-32 mt-3 rounded" style={{ background: '#262626' }} />
      </div>
    </div>
  )
}

function SkeletonChart() {
  return (
    <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
      <CardHeader>
        <div className="h-4 w-40 rounded animate-pulse" style={{ background: '#262626' }} />
      </CardHeader>
      <CardContent>
        <div className="h-[280px] rounded animate-pulse" style={{ background: '#262626' }} />
      </CardContent>
    </Card>
  )
}

// --- Toast Hook ---
function useToast() {
  const [toasts, setToasts] = React.useState<
    Array<{ id: number; message: string; variant: 'default' | 'success' | 'error' }>
  >([])
  const idRef = React.useRef(0)

  const toast = React.useCallback(
    (message: string, variant: 'default' | 'success' | 'error' = 'default') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    },
    []
  )

  return { toast, toasts }
}

// --- Time Greeting ---
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function formatIndianDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

// --- Audit Log Activity Item ---
const MODULE_ICONS: Record<string, React.ElementType> = {
  EMPLOYEE: Users,
  ATTENDANCE: UserCheck,
  LEAVE: CalendarClock,
  PAYROLL: DollarSign,
  SETTINGS: FileCheck,
  DASHBOARD: BarChart3,
  DOCUMENT: FileText,
  DEFAULT: Clock,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#4ADE80',
  UPDATE: '#60A5FA',
  DELETE: '#F87171',
  APPROVE: '#34D399',
  REJECT: '#F87171',
  LOGIN: '#A78BFA',
  LOGOUT: '#9CA3AF',
  EXPORT: '#60A5FA',
  IMPORT: '#FBBF24',
  LOCK: '#F87171',
  PAY: '#4ADE80',
  DEFAULT: '#9CA3AF',
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || ACTION_COLORS['DEFAULT']
}

function AuditLogItem({ log }: { log: AuditLog }) {
  const Icon = MODULE_ICONS[log.module] || MODULE_ICONS['DEFAULT']
  const color = getActionColor(log.action)
  const timeAgo = formatTimeAgo(
    Math.floor((Date.now() - new Date(log.createdAt).getTime()) / 1000)
  )

  return (
    <div className="flex items-start gap-3 pb-3 last:border-0 last:pb-0" style={{ borderBottom: '1px solid #1F1F1F' }}>
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">
          {log.description || `${log.action} on ${log.module}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium" style={{ color }}>
            {log.action}
          </span>
          <span className="text-xs" style={{ color: '#6B7280' }}>
            {log.module}
          </span>
          <span className="text-xs" style={{ color: '#4B5563' }}>
            {timeAgo}
          </span>
        </div>
        {log.employee && (
          <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>
            {log.employee.firstName} {log.employee.lastName}
          </p>
        )}
      </div>
    </div>
  )
}

// --- Alert Card ---
interface AlertCardProps {
  icon: React.ElementType
  title: string
  count: number
  viewHref: string
  onDismiss: () => void
  color: string
  alertKey: string
}

function AlertCard({ icon: Icon, title, count, viewHref, onDismiss, color, alertKey }: AlertCardProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (dismissed) return null

  return (
    <div
      className="relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
      style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-lg font-bold" style={{ color }}>
          {count}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" asChild style={{ borderColor: '#2D2D2D' }}>
          <Link href={viewHref}>View</Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors hover:bg-white/5"
          style={{ color: '#6B7280' }}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// --- Quick Action Button ---
interface QuickActionProps {
  icon: React.ElementType
  label: string
  href: string
  color: string
  onClick?: () => void
}

function QuickActionButton({ icon: Icon, label, href, color, onClick }: QuickActionProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) onClick()
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 group"
      style={{
        background: '#1A1A1A',
        border: '1px solid #2D2D2D',
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl transition-colors"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-6 w-6 transition-colors" style={{ color }} />
      </div>
      <span className="text-xs font-medium text-center leading-tight" style={{ color: '#D1D5DB' }}>
        {label}
      </span>
    </button>
  )
}

// --- Main Component ---
export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast, toasts } = useToast()

  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null)
  const [attendanceToday, setAttendanceToday] = React.useState<AttendanceTodayData | null>(null)
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([])
  const [alertData, setAlertData] = React.useState<AlertData>({
    pendingApprovals: 0,
    missingAttendance: 0,
    upcomingResignations: 0,
    pendingDocuments: 0,
  })

  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  // Update "seconds ago" counter
  React.useEffect(() => {
    if (!lastUpdated) return
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Initial fetch + polling
  React.useEffect(() => {
    const fetchAll = async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const [dashRes, todayRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/attendance/today'),
        ])

        if (!dashRes.ok || !todayRes.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashJson = await dashRes.json()
        const todayJson = await todayRes.json()

        if (dashJson.success) setDashboardData(dashJson.data)
        if (todayJson.success) setAttendanceToday(todayJson.data)
        setLastUpdated(new Date())
        setSecondsAgo(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchAll()

    const pollInterval = setInterval(() => fetchAll(true), REFRESH_INTERVAL)
    return () => clearInterval(pollInterval)
  }, [])

  // Fetch audit logs
  React.useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const res = await fetch('/api/audit-log?limit=10')
        if (res.ok) {
          const json = await res.json()
          if (json.success) setAuditLogs(json.data)
        }
      } catch (_e) {
        // silently fail — audit log is non-critical
      }
    }
    fetchAuditLogs()
    const interval = setInterval(fetchAuditLogs, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Fetch alerts
  React.useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [leaveRes, attendanceRes, resignRes, docsRes] = await Promise.all([
          fetch('/api/leave?status=PENDING&limit=1'),
          fetch('/api/attendance/today'),
          fetch('/api/resignations'),
          fetch('/api/documents?status=PENDING&limit=1'),
        ])

        const [leaveJson, attendanceJson, resignJson, docsJson] = await Promise.all([
          leaveRes.ok ? leaveRes.json() : { success: false },
          attendanceRes.ok ? attendanceRes.json() : { success: false },
          resignRes.ok ? resignRes.json() : { success: false },
          docsRes.ok ? docsRes.json() : { success: false },
        ])

        const pendingApprovals = leaveJson.total ?? 0
        const missingAttendance = attendanceJson.success ? attendanceJson.data.notMarked : 0
        const upcomingResignations = resignJson.success
          ? (resignJson.data as any[]).filter((r: any) => r.status === 'PENDING').length
          : 0
        const pendingDocuments = docsJson.total ?? 0

        setAlertData({
          pendingApprovals,
          missingAttendance,
          upcomingResignations,
          pendingDocuments,
        })
      } catch (_e) {
        // silently fail — alerts are non-critical
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // --- Computed data ---
  const pieData = React.useMemo(() => {
    if (!dashboardData?.employeesByDepartment) return []
    return dashboardData.employeesByDepartment.map((d) => ({
      name: d.department || 'Unknown',
      value: d.count,
    }))
  }, [dashboardData])

  const todayPresent = attendanceToday?.present ?? dashboardData?.presentToday ?? 0
  const todayOnLeave = attendanceToday?.leave ?? 0
  const todayAbsent = attendanceToday?.absent ?? dashboardData?.absentToday ?? 0

  const hasActiveAlerts =
    alertData.pendingApprovals > 0 ||
    alertData.missingAttendance > 0 ||
    alertData.upcomingResignations > 0 ||
    alertData.pendingDocuments > 0

  // --- Navigation handlers ---
  const navigateTo = (href: string, message: string) => {
    toast(message)
    router.push(href)
  }

  // --- Chart click handlers ---
  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]) {
      const dateStr = data.activePayload[0].payload.date
      toast(`Filtering attendance for ${dateStr}`)
      router.push(`/admin/attendance?date=${dateStr}`)
    }
  }

  const handlePieClick = (data: any) => {
    if (data?.name) {
      toast(`Filtering employees in ${data.name}`)
      router.push(`/admin/employees?department=${encodeURIComponent(data.name)}`)
    }
  }

  // --- Render ---
  if (error && !dashboardData) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-lg p-8 text-center flex flex-col items-center gap-4"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
        >
          <AlertCircle className="h-10 w-10" style={{ color: '#F87171' }} />
          <p className="text-sm" style={{ color: '#F87171' }}>
            {error}
          </p>
          <Button
            onClick={() => window.location.reload()}
            style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* --- Toast Container --- */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2"
        style={{ pointerEvents: 'none' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2"
            style={{
              background: '#1A1A1A',
              border: `1px solid ${t.variant === 'error' ? '#F87171' : t.variant === 'success' ? '#4ADE80' : '#8B5CF6'}`,
              pointerEvents: 'auto',
              minWidth: 240,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background:
                  t.variant === 'error' ? '#F87171' : t.variant === 'success' ? '#4ADE80' : '#8B5CF6',
              }}
            />
            <span className="text-sm text-white">{t.message}</span>
          </div>
        ))}
      </div>

      {/* --- Page Header --- */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            {refreshing && (
              <RefreshCw
                className="h-4 w-4 animate-spin"
                style={{ color: '#8B5CF6' }}
              />
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Overview of your HRMS system
          </p>
        </div>

        {/* Last Updated Counter */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
        >
          <Clock className="h-3 w-3" style={{ color: '#6B7280' }} />
          <span style={{ color: '#6B7280' }}>Last updated</span>
          <span className="font-medium" style={{ color: '#D1D5DB' }}>
            {lastUpdated ? formatTimeAgo(secondsAgo) : '—'}
          </span>
        </div>
      </div>

      {/* --- Today at a Glance --- */}
      <div
        className="relative rounded-2xl overflow-hidden px-6 py-5"
        style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #1E1530 100%)', border: '1px solid #2D2D2D' }}
      >
        {/* Decorative bg elements */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: '#8B5CF6', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5" style={{ background: '#A78BFA', transform: 'translate(-30%, 30%)' }} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-white">{greeting}, Admin!</p>
            <p className="text-sm mt-1" style={{ color: '#A78BFA' }}>
              {formatIndianDate(new Date())}
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#4ADE80' }} />
              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                <span className="font-semibold text-white">{todayPresent}</span> present
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                <span className="font-semibold text-white">{todayOnLeave}</span> on leave
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                <span className="font-semibold text-white">{todayAbsent}</span> absent
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Critical Alerts --- */}
      {hasActiveAlerts && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4" style={{ color: '#F59E0B' }} />
            <h3 className="text-sm font-semibold text-white">Critical Alerts</h3>
            <Badge variant="destructive" className="text-xs">
              {alertData.pendingApprovals + alertData.missingAttendance + alertData.upcomingResignations + alertData.pendingDocuments}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AlertCard
              alertKey="pending"
              icon={CalendarClock}
              title="Pending Approvals"
              count={alertData.pendingApprovals}
              viewHref="/admin/leave?status=PENDING"
              color="#F59E0B"
              onDismiss={() => setAlertData((p) => ({ ...p, pendingApprovals: 0 }))}
            />
            <AlertCard
              alertKey="missing"
              icon={AlertCircle}
              title="Missing Attendance"
              count={alertData.missingAttendance}
              viewHref="/admin/attendance?filter=not_marked"
              color="#EF4444"
              onDismiss={() => setAlertData((p) => ({ ...p, missingAttendance: 0 }))}
            />
            <AlertCard
              alertKey="resignations"
              icon={UserX}
              title="Upcoming Resignations"
              count={alertData.upcomingResignations}
              viewHref="/admin/resignations"
              color="#A78BFA"
              onDismiss={() => setAlertData((p) => ({ ...p, upcomingResignations: 0 }))}
            />
            <AlertCard
              alertKey="documents"
              icon={FileText}
              title="Pending Documents"
              count={alertData.pendingDocuments}
              viewHref="/admin/documents"
              color="#60A5FA"
              onDismiss={() => setAlertData((p) => ({ ...p, pendingDocuments: 0 }))}
            />
          </div>
        </div>
      )}

      {/* --- Stats Row --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Total Employees */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
              }}
              onClick={() => navigateTo('/admin/employees', 'Showing all employees')}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#3D3D3D')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D2D')
              }
            >
              <StatCard
                colorIndex={0}
                title="Total Employees"
                value={dashboardData?.totalEmployees ?? 0}
                icon={Users}
                changeLabel={dashboardData ? `${dashboardData.activeEmployees} active` : undefined}
              />
            </div>

            {/* Present Today */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
              }}
              onClick={() => navigateTo('/admin/attendance?filter=today', 'Showing today\'s attendance')}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#3D3D3D')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D2D')
              }
            >
              <StatCard
                colorIndex={1}
                title="Present Today"
                value={todayPresent}
                icon={UserCheck}
                changeLabel={
                  attendanceToday
                    ? `${attendanceToday.notMarked} not marked`
                    : 'vs yesterday'
                }
              />
            </div>

            {/* Absent Today */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
              }}
              onClick={() => navigateTo('/admin/attendance?filter=absent', 'Showing absent employees')}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#3D3D3D')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D2D')
              }
            >
              <StatCard
                colorIndex={2}
                title="Absent Today"
                value={todayAbsent}
                icon={UserX}
                changeLabel="not marked excluded"
              />
            </div>

            {/* Pending Leave */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
              }}
              onClick={() => navigateTo('/admin/leave?status=PENDING', 'Showing pending leave requests')}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#3D3D3D')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D2D')
              }
            >
              <StatCard
                colorIndex={3}
                title="Pending Leaves"
                value={dashboardData?.pendingLeaveRequests ?? 0}
                icon={CalendarClock}
                changeLabel="need review"
              />
            </div>

            {/* Departments */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
              }}
              onClick={() => navigateTo('/admin/departments', 'Showing all departments')}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#3D3D3D')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D2D')
              }
            >
              <StatCard
                colorIndex={4}
                title="Departments"
                value={dashboardData?.totalDepartments ?? 0}
                icon={Building2}
                changeLabel="total"
              />
            </div>
          </>
        )}
      </div>

      {/* --- Quick Actions --- */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <QuickActionButton
            icon={Plus}
            label="Add Employee"
            href="/admin/employees/add"
            color="#8B5CF6"
          />
          <QuickActionButton
            icon={FileCheck}
            label="Approve Leave"
            href="/admin/leave?status=PENDING"
            color="#F59E0B"
          />
          <QuickActionButton
            icon={FileText}
            label="Generate Letter"
            href="/admin/letters"
            color="#60A5FA"
          />
          <QuickActionButton
            icon={Upload}
            label="Upload Attendance"
            href="/admin/attendance/bulk"
            color="#34D399"
          />
          <QuickActionButton
            icon={BarChart3}
            label="View Reports"
            href="/admin/reports"
            color="#A78BFA"
          />
          <QuickActionButton
            icon={Settings}
            label="Manage Tools"
            href="/admin/settings"
            color="#06B6D4"
          />
        </div>
      </div>

      {/* --- Charts Row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-2" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white">Attendance Trend (Last 7 Days)</CardTitle>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                Click a bar to filter
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] rounded animate-pulse" style={{ background: '#262626' }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={dashboardData?.attendanceTrend ?? []}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  onClick={handleBarClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#2D2D2D" />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#2D2D2D" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2D2D2D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'white',
                    }}
                    cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
                  <Bar
                    dataKey="present"
                    name="Present"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar
                    dataKey="absent"
                    name="Absent"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white">Employees by Department</CardTitle>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                Click slice to filter
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] rounded animate-pulse" style={{ background: '#262626' }} />
            ) : pieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center" style={{ color: '#6B7280' }}>
                <p className="text-sm">No department data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    onClick={handlePieClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#1A1A1A"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2D2D2D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'white',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
                    onClick={handlePieClick}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Bottom Row: Activity Feed + Recent Leaves --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                Recent Activity
              </CardTitle>
              <Link
                href="/admin/reports"
                className="text-xs flex items-center gap-1 transition-colors hover:text-purple-400"
                style={{ color: '#6B7280' }}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10" style={{ color: '#6B7280' }}>
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              auditLogs.slice(0, 8).map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                Recent Leave Requests
              </CardTitle>
              <Link
                href="/admin/leave"
                className="text-xs flex items-center gap-1 transition-colors hover:text-purple-400"
                style={{ color: '#6B7280' }}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg" style={{ background: '#262626' }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded" style={{ background: '#262626' }} />
                      <div className="h-3 w-48 rounded" style={{ background: '#262626' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.recentLeaveRequests && dashboardData.recentLeaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10" style={{ color: '#6B7280' }}>
                <Calendar className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent leave requests</p>
              </div>
            ) : (
              (dashboardData?.recentLeaveRequests ?? []).slice(0, 6).map((req) => {
                const leaveTypeColors: Record<string, string> = {
                  CASUAL: '#60A5FA',
                  SICK: '#F59E0B',
                  MATERNITY: '#A78BFA',
                  PATERNITY: '#A78BFA',
                  BEREAVEMENT: '#9CA3AF',
                  UNPAID: '#F87171',
                  COMPENSATORY: '#8B5CF6',
                  WFH: '#06B6D4',
                }
                const color = leaveTypeColors[req.leaveType] || '#9CA3AF'

                return (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 pb-3 last:border-0 last:pb-0"
                    style={{ borderBottom: '1px solid #1F1F1F' }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      <CalendarClock className="h-4 w-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                          {req.employee?.firstName} {req.employee?.lastName}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ background: `${color}18`, color, borderColor: `${color}30` }}
                        >
                          {req.leaveType.replace('_', ' ')}
                        </Badge>
                        {req.status === 'PENDING' && (
                          <Badge variant="destructive" className="text-xs">
                            Pending
                          </Badge>
                        )}
                        {req.status === 'APPROVED' && (
                          <Badge className="text-xs" style={{ background: '#052e1640', color: '#4ADE80' }}>
                            Approved
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                        <span>
                          {new Date(req.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} -{' '}
                          {new Date(req.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        <span>
                          ({req.totalDays} day{req.totalDays !== 1 ? 's' : ''})
                        </span>
                      </div>
                      {req.employee && (
                        <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>
                          {req.employee.department}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
