'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, Calendar, BarChart3, GitBranch, Settings2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/data-table'
import type { Column } from '@/components/data-table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns'
import type { LeaveRequest, LeaveStatus, LeaveType } from '@/types'

const statusColors: Record<LeaveStatus, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

const leaveTypeColors: Record<LeaveType, string> = {
  CASUAL: 'info',
  SICK: 'warning',
  MATERNITY: 'secondary',
  PATERNITY: 'secondary',
  BEREAVEMENT: 'secondary',
  UNPAID: 'destructive',
  COMPENSATORY: 'info',
  WFH: 'info',
}

const leaveTypeChartColors: Record<string, string> = {
  CASUAL: '#3b82f6',
  SICK: '#f59e0b',
  MATERNITY: '#ec4899',
  PATERNITY: '#f97316',
  BEREAVEMENT: '#6b7280',
  UNPAID: '#ef4444',
  COMPENSATORY: '#eab308',
  WFH: '#06b6d4',
}

interface CarryForwardConfig {
  leaveType: LeaveType
  carryForwardMax: number
  enabled: boolean
}

export default function LeavePage() {
  const { toast } = useToast()
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedRequest, setSelectedRequest] = React.useState<LeaveRequest | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false)
  const [actionType, setActionType] = React.useState<'approve' | 'reject'>('approve')
  const [remarks, setRemarks] = React.useState('')
  const [actionLoading, setActionLoading] = React.useState(false)

  // Carry-forward settings
  const [carryForwardOpen, setCarryForwardOpen] = React.useState(false)
  const [carryForwardConfig, setCarryForwardConfig] = React.useState<CarryForwardConfig[]>([
    { leaveType: 'CASUAL', carryForwardMax: 5, enabled: true },
    { leaveType: 'SICK', carryForwardMax: 0, enabled: false },
    { leaveType: 'MATERNITY', carryForwardMax: 0, enabled: false },
    { leaveType: 'PATERNITY', carryForwardMax: 0, enabled: false },
    { leaveType: 'BEREAVEMENT', carryForwardMax: 0, enabled: false },
    { leaveType: 'UNPAID', carryForwardMax: 0, enabled: false },
    { leaveType: 'COMPENSATORY', carryForwardMax: 0, enabled: false },
    { leaveType: 'WFH', carryForwardMax: 0, enabled: false },
  ])

  const fetchLeaveRequests = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leave?limit=200')
      const json = await res.json()
      if (json.success) {
        setLeaveRequests(json.data || [])
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load leave requests', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchLeaveRequests()
  }, [fetchLeaveRequests])

  const pending = leaveRequests.filter((r) => r.status === 'PENDING')
  const approved = leaveRequests.filter((r) => r.status === 'APPROVED')
  const rejected = leaveRequests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED')

  // Analytics data
  const analyticsData = React.useMemo(() => {
    const last12Months: { month: string; label: string; casual: number; sick: number; other: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i)
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const monthStr = format(month, 'yyyy-MM')
      const label = format(month, 'MMM yy')

      const requestsInMonth = leaveRequests.filter((r) => {
        const reqDate = new Date(r.startDate)
        return reqDate >= monthStart && reqDate <= monthEnd && r.status === 'APPROVED'
      })

      const casual = requestsInMonth.filter((r) => r.leaveType === 'CASUAL').reduce((sum, r) => sum + r.totalDays, 0)
      const sick = requestsInMonth.filter((r) => r.leaveType === 'SICK').reduce((sum, r) => sum + r.totalDays, 0)
      const other = requestsInMonth.filter((r) => r.leaveType !== 'CASUAL' && r.leaveType !== 'SICK').reduce((sum, r) => sum + r.totalDays, 0)

      last12Months.push({ month: monthStr, label, casual, sick, other })
    }
    return last12Months
  }, [leaveRequests])

  const maxMonthValue = React.useMemo(() => {
    return Math.max(...analyticsData.map((m) => m.casual + m.sick + m.other), 1)
  }, [analyticsData])

  // Pie chart data
  const pieData = React.useMemo(() => {
    const approvedRequests = leaveRequests.filter((r) => r.status === 'APPROVED')
    const byType: Record<string, number> = {}
    for (const req of approvedRequests) {
      byType[req.leaveType] = (byType[req.leaveType] || 0) + req.totalDays
    }
    const total = Object.values(byType).reduce((a, b) => a + b, 0) || 1
    return Object.entries(byType).map(([type, days]) => ({
      type,
      days,
      percentage: Math.round((days / total) * 100),
      color: leaveTypeChartColors[type] || '#6b7280',
    }))
  }, [leaveRequests])

  // Top leave-takers this month
  const topLeaveTakers = React.useMemo(() => {
    const monthStart = startOfMonth(new Date())
    const monthEnd = endOfMonth(new Date())
    const thisMonthRequests = leaveRequests.filter((r) => {
      const reqDate = new Date(r.startDate)
      return reqDate >= monthStart && reqDate <= monthEnd && r.status === 'APPROVED'
    })

    const byEmployee: Record<string, { name: string; code: string; days: number }> = {}
    for (const req of thisMonthRequests) {
      const key = req.employeeId
      if (!byEmployee[key]) {
        byEmployee[key] = {
          name: `${req.employee?.firstName || ''} ${req.employee?.lastName || ''}`.trim(),
          code: req.employee?.employeeCode || '-',
          days: 0,
        }
      }
      byEmployee[key].days += req.totalDays
    }

    return Object.values(byEmployee).sort((a, b) => b.days - a.days).slice(0, 5)
  }, [leaveRequests])

  // Timeline data
  const timelineData = React.useMemo(() => {
    // Group by employee for last 30 days
    const start = startOfWeek(new Date())
    const end = endOfWeek(addWeeks(new Date(), 2))

    const grouped: Record<string, {
      employeeId: string
      name: string
      code: string
      leaves: { start: Date; end: Date; type: string; totalDays: number }[]
    }> = {}

    for (const req of leaveRequests.filter((r) => r.status === 'APPROVED')) {
      const key = req.employeeId
      if (!grouped[key]) {
        grouped[key] = {
          employeeId: key,
          name: `${req.employee?.firstName || ''} ${req.employee?.lastName || ''}`.trim(),
          code: req.employee?.employeeCode || '-',
          leaves: [],
        }
      }
      grouped[key].leaves.push({
        start: new Date(req.startDate),
        end: new Date(req.endDate),
        type: req.leaveType,
        totalDays: req.totalDays,
      })
    }

    return Object.values(grouped).slice(0, 10)
  }, [leaveRequests])

  const handleSaveCarryForward = () => {
    toast({ title: 'Success', description: 'Carry-forward settings saved' })
    setCarryForwardOpen(false)
  }

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.employee?.firstName} {row.employee?.lastName}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>{row.employee?.employeeCode}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={leaveTypeColors[row.leaveType] as 'info' | 'warning' | 'success' | 'secondary' | 'destructive'}>
            {row.leaveType.replace('_', ' ')}
          </Badge>
          {row.halfDay && (
            <Badge variant="secondary">Half Day</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (row) => (
        <div>
          <p className="text-sm text-white">
            {formatDate(row.startDate.toString(), 'dd MMM')} - {formatDate(row.endDate.toString(), 'dd MMM yyyy')}
          </p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {row.totalDays} day{row.totalDays !== 1 ? 's' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-sm" style={{ color: '#D1D5DB' }}>
          {row.reason || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusColors[row.status] as 'pending' | 'approved' | 'rejected' | 'cancelled'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'appliedAt',
      header: 'Applied On',
      render: (row) => (
        <span style={{ color: '#9CA3AF' }}>
          {formatDate(row.appliedAt?.toString() || row.createdAt.toString(), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-32',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'PENDING' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                style={{ color: '#4ADE80' }}
                onClick={() => {
                  setSelectedRequest(row)
                  setActionType('approve')
                  setActionDialogOpen(true)
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                style={{ color: '#F87171' }}
                onClick={() => {
                  setSelectedRequest(row)
                  setActionType('reject')
                  setActionDialogOpen(true)
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const handleAction = async () => {
    if (!selectedRequest) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/leave/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
          remarks,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({
          title: actionType === 'approve' ? 'Leave Approved' : 'Leave Rejected',
          description: `Leave request for ${selectedRequest.employee?.firstName} ${selectedRequest.employee?.lastName} has been ${actionType === 'approve' ? 'approved' : 'rejected'}.`,
        })
        setActionDialogOpen(false)
        setRemarks('')
        setSelectedRequest(null)
        fetchLeaveRequests()
      } else {
        toast({ title: 'Error', description: json.error || 'Action failed', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to process action', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Leave Management</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Review and manage leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCarryForwardOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Carry Forward
          </Button>
          <Button variant="outline" asChild>
            <a href="/admin/leave/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Leave Calendar
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <DataTable
            columns={columns}
            data={pending}
            keyField="id"
            searchable={false}
            loading={loading}
            emptyMessage="No pending leave requests"
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <DataTable
            columns={columns}
            data={approved}
            keyField="id"
            searchable={false}
            loading={loading}
            emptyMessage="No approved leave requests"
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <DataTable
            columns={columns}
            data={rejected}
            keyField="id"
            searchable={false}
            loading={loading}
            emptyMessage="No rejected leave requests"
          />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <DataTable
            columns={columns}
            data={leaveRequests}
            keyField="id"
            searchable={false}
            loading={loading}
            emptyMessage="No leave requests found"
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div
              className="lg:col-span-2 rounded-xl border p-5"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <h3 className="text-base font-semibold text-white">Leave Usage (Last 12 Months)</h3>
              </div>
              <div className="flex items-end gap-1 h-40">
                {analyticsData.map((month) => {
                  const total = month.casual + month.sick + month.other
                  const height = Math.max((total / maxMonthValue) * 100, 4)
                  return (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t-sm transition-all hover:opacity-80 cursor-default"
                        style={{ height: `${height}%`, background: '#8B5CF6', minHeight: '4px' }}
                        title={`${month.label}: ${total} days`}
                      />
                      <span className="text-[9px] transform -rotate-45 origin-top-left whitespace-nowrap mt-1" style={{ color: '#6B7280' }}>
                        {month.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#3b82f6' }} />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Casual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f59e0b' }} />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Sick</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#8B5CF6' }} />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Other</span>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div
              className="rounded-xl border p-5"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <h3 className="text-base font-semibold text-white">Leave Distribution</h3>
              </div>
              {/* Simple donut chart */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {pieData.length > 0 && pieData.reduce((acc, slice, i) => {
                      const offset = acc.offset
                      const circumference = 2 * Math.PI * 35
                      const dashLength = (slice.percentage / 100) * circumference
                      const dashOffset = circumference - offset
                      acc.elements.push(
                        <circle
                          key={slice.type}
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="12"
                          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                          strokeDashoffset={-dashOffset}
                          className="transition-all"
                        />
                      )
                      acc.offset += dashLength
                      return acc
                    }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white" style={{ color: '#9CA3AF' }}>
                      {pieData.reduce((s, p) => s + p.days, 0)} days
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {pieData.map((slice) => (
                  <div key={slice.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: slice.color }} />
                      <span className="text-xs" style={{ color: '#D1D5DB' }}>{slice.type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{slice.days}d ({slice.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top leave-takers */}
            <div
              className="lg:col-span-3 rounded-xl border p-5"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <h3 className="text-base font-semibold text-white">Top Leave-Takers This Month</h3>
              </div>
              {topLeaveTakers.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>No leave taken this month</p>
              ) : (
                <div className="space-y-3">
                  {topLeaveTakers.map((emp, i) => (
                    <div key={emp.code} className="flex items-center gap-4">
                      <span className="text-xs font-bold w-5" style={{ color: '#6B7280' }}>#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{emp.name || 'Unknown'}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{emp.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min((emp.days / (topLeaveTakers[0]?.days || 1)) * 120, 120)}px`,
                            background: '#8B5CF6',
                          }}
                        />
                        <span className="text-sm font-medium text-white w-12 text-right">{emp.days}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-6">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
          >
            {/* Timeline header */}
            <div className="flex border-b" style={{ borderColor: '#2D2D2D' }}>
              <div className="w-48 flex-shrink-0 p-3" style={{ borderRight: '1px solid #2D2D2D' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Employee</span>
              </div>
              <div className="flex-1 flex overflow-x-auto">
                {Array.from({ length: 14 }).map((_, i) => {
                  const day = new Date()
                  day.setDate(day.getDate() + i - 3)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 w-10 text-center py-3"
                      style={{
                        borderRight: i < 13 ? '1px solid #1F1F1F' : 'none',
                        background: isWeekend ? '#0F0F0F' : 'transparent',
                      }}
                    >
                      <p className="text-[10px] font-medium uppercase" style={{ color: '#6B7280' }}>{format(day, 'EEE')}</p>
                      <p className="text-xs font-bold" style={{ color: isSameDay(day, new Date()) ? '#8B5CF6' : '#9CA3AF' }}>{format(day, 'd')}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Employee rows */}
            {timelineData.length === 0 ? (
              <div className="p-12 text-center" style={{ color: '#6B7280' }}>
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave records to display on timeline</p>
              </div>
            ) : (
              timelineData.map((emp, empIdx) => (
                <div
                  key={emp.employeeId}
                  className="flex border-b last:border-0"
                  style={{ borderColor: '#2D2D2D' }}
                >
                  <div className="w-48 flex-shrink-0 p-3" style={{ borderRight: '1px solid #2D2D2D' }}>
                    <p className="text-sm font-medium text-white truncate">{emp.name || 'Unknown'}</p>
                    <p className="text-xs truncate" style={{ color: '#6B7280' }}>{emp.code}</p>
                  </div>
                  <div className="flex-1 flex overflow-x-auto relative">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const day = new Date()
                      day.setDate(day.getDate() + i - 3)
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6
                      const isToday = isSameDay(day, new Date())

                      // Check if this day is covered by any leave
                      const coveringLeave = emp.leaves.find((l) =>
                        day >= l.start && day <= l.end
                      )

                      return (
                        <div
                          key={i}
                          className="flex-shrink-0 w-10 h-12 flex items-center justify-center"
                          style={{
                            borderRight: i < 13 ? '1px solid #1F1F1F' : 'none',
                            background: isWeekend ? '#0F0F0F' : 'transparent',
                          }}
                        >
                          {coveringLeave && (
                            <div
                              className="w-8 h-7 rounded-md flex items-center justify-center"
                              style={{
                                background: `${leaveTypeChartColors[coveringLeave.type] || '#8B5CF6'}33`,
                                border: `1px solid ${leaveTypeChartColors[coveringLeave.type] || '#8B5CF6'}66`,
                              }}
                              title={`${coveringLeave.type.replace('_', ' ')} - ${coveringLeave.totalDays}d`}
                            >
                              <span className="text-[9px] font-bold" style={{ color: leaveTypeChartColors[coveringLeave.type] || '#c084fc' }}>
                                {coveringLeave.type.slice(0, 1)}
                              </span>
                            </div>
                          )}
                          {isToday && !coveringLeave && (
                            <div className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 p-3" style={{ borderTop: '1px solid #2D2D2D', background: '#0F0F0F' }}>
              {Object.entries(leaveTypeChartColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: color }} />
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              {actionType === 'approve'
                ? `Approve leave request from ${selectedRequest?.employee?.firstName} ${selectedRequest?.employee?.lastName}?`
                : `Reject leave request from ${selectedRequest?.employee?.firstName} ${selectedRequest?.employee?.lastName}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-white">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Add any notes...'}
              rows={3}
              style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              loading={actionLoading}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry Forward Settings Dialog */}
      <Dialog open={carryForwardOpen} onOpenChange={setCarryForwardOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Carry Forward Settings</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Configure how many days from each leave type can be carried forward to the next year.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {carryForwardConfig.map((cfg) => (
              <div
                key={cfg.leaveType}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{cfg.leaveType.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) => {
                        setCarryForwardConfig((prev) =>
                          prev.map((c) =>
                            c.leaveType === cfg.leaveType ? { ...c, enabled: e.target.checked } : c
                          )
                        )
                      }}
                      className="w-4 h-4 rounded accent-[#8B5CF6]"
                    />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Enabled</span>
                  </label>
                  <span className="text-xs" style={{ color: '#6B7280' }}>Max</span>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={cfg.carryForwardMax}
                    onChange={(e) => {
                      setCarryForwardConfig((prev) =>
                        prev.map((c) =>
                          c.leaveType === cfg.leaveType ? { ...c, carryForwardMax: parseInt(e.target.value) || 0 } : c
                        )
                      )
                    }}
                    className="w-16 h-8 text-center text-sm"
                    style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
                  />
                  <span className="text-xs" style={{ color: '#6B7280' }}>days</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarryForwardOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCarryForward}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
