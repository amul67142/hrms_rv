'use client'

import * as React from 'react'
import { useSession } from '@/lib/core/auth-client'
import { CalendarDays, Clock, FileText, BookOpen, Award, User, LogIn, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/core/utils'
import Link from 'next/link'

interface LeaveBalanceItem {
  id: string | null
  employeeId: string
  leaveType: string
  year: number
  entitled: number
  taken: number
  pending: number
  available: number
}

interface LeaveBalanceSummary {
  year: number
  totalEntitled: number
  totalTaken: number
  totalPending: number
  totalAvailable: number
}

interface LeaveBalanceData {
  balances: LeaveBalanceItem[]
  summary: LeaveBalanceSummary
}

interface AttendanceRecord {
  id: string
  employeeId: string
  date: Date | string
  status: string
  inTime?: string | null
  outTime?: string | null
  hoursWorked?: number | null
  remarks?: string | null
}

interface LeaveRequestRecord {
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
}

interface SalarySlip {
  id: string
  employeeId: string
  month: number
  year: number
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  bonus: number
  incentives: number
  grossSalary: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  tdsDeduction: number
  otherDeduction: number
  totalDeduction: number
  netSalary: number
  paidDays: number
  status: string
}

interface LearningProgressItem {
  id: string
  employeeId: string
  moduleId: string
  progress: number
  status: string
  lastAccessedAt: Date | string
  completedAt?: Date | string | null
  module?: {
    id: string
    title: string
    description?: string | null
  }
}

interface EmployeeInfo {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  department?: string
  designation?: string
}

interface TodayAttendance {
  present: number
  absent: number
  halfDay: number
  leave: number
  weekOff: number
  holiday: number
}

const leaveTypeColors: Record<string, string> = {
  CASUAL: '#3B82F6',
  SICK: '#22C55E',
  MATERNITY: '#EC4899',
  PATERNITY: '#F97316',
  BEREAVEMENT: '#6B7280',
  UNPAID: '#EF4444',
  COMPENSATORY: '#14B8A6',
  WFH: '#06B6D4',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return date.toLocaleString('en-US', { month: 'long' })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#262626' }} />
      <div className="h-4 w-72 rounded animate-pulse" style={{ background: '#262626' }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }} />
        ))}
      </div>
    </div>
  )
}

export default function EmployeeDashboardPage() {
  const { data: session } = useSession()
  const [employee, setEmployee] = React.useState<EmployeeInfo | null>(null)
  const [leaveBalanceData, setLeaveBalanceData] = React.useState<LeaveBalanceData | null>(null)
  const [recentAttendance, setRecentAttendance] = React.useState<AttendanceRecord[]>([])
  const [recentLeaveRequests, setRecentLeaveRequests] = React.useState<LeaveRequestRecord[]>([])
  const [salarySlips, setSalarySlips] = React.useState<SalarySlip[]>([])
  const [learningProgress, setLearningProgress] = React.useState<LearningProgressItem[]>([])
  const [todayAttendance, setTodayAttendance] = React.useState<TodayAttendance | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const employeeId = (session?.user as { employeeId?: string })?.employeeId

  React.useEffect(() => {
    if (!employeeId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dashboardRes, todayRes, learningRes] = await Promise.all([
          fetch(`/api/dashboard/employee/${employeeId}`),
          fetch('/api/attendance/today'),
          fetch('/api/learning/progress'),
        ])

        const dashboardJson = await dashboardRes.json()
        const todayJson = await todayRes.json()
        const learningJson = await learningRes.json()

        if (!dashboardRes.ok) throw new Error('Failed to load dashboard')
        if (dashboardJson.success) {
          const data = dashboardJson.data
          setEmployee(data.employee)
          setRecentAttendance(data.recentAttendance || [])
          setRecentLeaveRequests(data.recentLeaveRequests || [])
          setSalarySlips(data.salarySlips || [])
        }

        if (todayJson.success) {
          setTodayAttendance({
            present: todayJson.data.present,
            absent: todayJson.data.absent,
            halfDay: todayJson.data.halfDay,
            leave: todayJson.data.leave,
            weekOff: todayJson.data.weekOff,
            holiday: todayJson.data.holiday,
          })
        }

        if (learningJson.success) {
          setLearningProgress(learningJson.data || [])
        }

        // Also fetch leave balance
        const balanceRes = await fetch(`/api/leave/balance/${employeeId}`)
        const balanceJson = await balanceRes.json()
        if (balanceJson.success) {
          setLeaveBalanceData(balanceJson.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [employeeId])

  if (loading && !employee) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg p-6 text-center" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const firstName = employee?.firstName || 'there'
  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-white">{greeting}, {firstName}</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          {employee?.designation || 'Employee'} {employee?.department ? `- ${employee.department} Department` : ''}
        </p>
      </div>

      {/* Today's Summary */}
      {todayAttendance && (
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Today&apos;s Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm" style={{ color: '#4ADE80' }}>
                  Present: {todayAttendance.present > 0 ? 'You are marked present' : 'Not marked'}
                </span>
              </div>
              {todayAttendance.leave > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm" style={{ color: '#60A5FA' }}>On Leave</span>
                </div>
              )}
              {todayAttendance.weekOff > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Week Off</span>
                </div>
              )}
              {todayAttendance.holiday > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-sm" style={{ color: '#A78BFA' }}>Holiday</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Balance Cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
          Leave Balance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(leaveBalanceData?.balances || []).map((balance) => {
            const color = leaveTypeColors[balance.leaveType] || '#8B5CF6'
            const pct = balance.entitled > 0 ? (balance.available / balance.entitled) * 100 : 0
            return (
              <Card key={balance.leaveType} style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      {balance.leaveType.replace('_', ' ')}
                    </p>
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <p className="text-2xl font-bold text-white">{balance.available}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>of {balance.entitled}</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{balance.taken} days taken{balance.pending > 0 ? ` (${balance.pending} pending)` : ''}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
          <Link href="/employee/leave/apply">Apply for Leave</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/employee/attendance">View Attendance</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/employee/salary-slips">My Salary Slips</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/employee/learning">Learning Center</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="text-center py-6" style={{ color: '#6B7280' }}>
                <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendance.slice(0, 5).map((day) => (
                  <div key={day.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#2D2D2D' }}>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {(() => { const d = day.date?.toString() || ''; if (!d || d === '') return 'N/A'; return formatDate(d, 'EEEE, dd MMM'); })()}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {day.inTime ? `${day.inTime}${day.outTime ? ` - ${day.outTime}` : ''}` : '-'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        day.status === 'PRESENT' ? 'success' :
                        day.status === 'ABSENT' ? 'destructive' :
                        day.status === 'HALF_DAY' ? 'warning' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {day.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2D2D2D' }}>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/employee/attendance">View All Attendance</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Recent Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeaveRequests.length === 0 ? (
              <div className="text-center py-6" style={{ color: '#6B7280' }}>
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeaveRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#2D2D2D' }}>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {req.leaveType.replace('_', ' ')}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {formatDate(req.startDate?.toString() || '', 'dd MMM')}
                        {' - '}
                        {formatDate(req.endDate?.toString() || '', 'dd MMM yyyy')}
                        {' '}
                        ({req.totalDays}d)
                      </p>
                    </div>
                    <Badge
                      variant={
                        req.status === 'APPROVED' ? 'success' :
                        req.status === 'REJECTED' ? 'destructive' :
                        req.status === 'PENDING' ? 'pending' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2D2D2D' }}>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/employee/leave">View All Requests</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Slips */}
      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />
            Recent Salary Slips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salarySlips.length === 0 ? (
            <div className="text-center py-6" style={{ color: '#6B7280' }}>
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No salary slips found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salarySlips.map((slip) => (
                <div key={slip.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#2D2D2D' }}>
                  <div>
                    <p className="text-sm font-medium text-white">{getMonthName(slip.month)} {slip.year}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      Net: {formatCurrency(slip.netSalary)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={slip.status === 'PAID' ? 'success' : slip.status === 'DRAFT' ? 'warning' : 'info'}
                      className="text-xs"
                    >
                      {slip.status}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                      <Link href={`/employee/salary-slips/${slip.id}`}>
                        <FileText className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2D2D2D' }}>
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/employee/salary-slips">View All Salary Slips</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Learning Progress */}
      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: '#8B5CF6' }} />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {learningProgress.length === 0 ? (
            <div className="text-center py-6" style={{ color: '#6B7280' }}>
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No learning modules started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {learningProgress.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Link
                      href={`/employee/learning/${item.moduleId}`}
                      className="text-sm font-medium text-white hover:text-[#A78BFA] transition-colors"
                    >
                      {item.module?.title || `Module ${item.moduleId}`}
                    </Link>
                    <span
                      className="text-xs font-medium"
                      style={{ color: item.progress === 100 ? '#22C55E' : '#A78BFA' }}
                    >
                      {item.progress}%
                      {item.progress === 100 && <Award className="inline-block ml-1 h-3 w-3" />}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.progress}%`,
                        background: item.progress === 100 ? '#22C55E' : '#8B5CF6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: '#2D2D2D' }}>
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/employee/learning">Browse All Modules</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
