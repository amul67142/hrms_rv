'use client'

import * as React from 'react'
import { CalendarDays, Download, FileText, CheckCircle2, XCircle, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table'
import type { Column } from '@/components/data-table'
import { AttendanceCalendar } from '@/components/attendance-calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { format, parseISO } from 'date-fns'
import type { AttendanceStatus } from '@/types'

interface AttendanceRecord {
  id: string
  employeeId: string
  date: Date | string
  status: AttendanceStatus
  inTime?: string | null
  outTime?: string | null
  hoursWorked?: number | null
  remarks?: string | null
  employee?: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    department: string
    designation: string
  }
}

interface AttendanceRow {
  id: string
  employeeId: string
  employee: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    department: string
    designation: string
  }
  status: AttendanceStatus
  checkIn?: string
  checkOut?: string
  remarks?: string
  date: string
}

interface RegularizationRequest {
  employeeId: string
  date: string
  type: 'LATE_ARRIVAL' | 'MISSED_PUNCH_IN' | 'MISSED_PUNCH_OUT' | 'OTHER'
  reason: string
}

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'success',
  ABSENT: 'destructive',
  HALF_DAY: 'warning',
  LATE: 'warning',
  WEEK_OFF: 'secondary',
  HOLIDAY: 'info',
  LEAVE: 'pending',
}

const statusOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'LEAVE', 'WEEK_OFF', 'HOLIDAY']

const regularizationTypes = [
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'MISSED_PUNCH_IN', label: 'Missed Punch-In' },
  { value: 'MISSED_PUNCH_OUT', label: 'Missed Punch-Out' },
  { value: 'OTHER', label: 'Other' },
]

export default function AttendancePage() {
  const { toast } = useToast()
  const [selectedDateStart, setSelectedDateStart] = React.useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDateEnd, setSelectedDateEnd] = React.useState(format(new Date(), 'yyyy-MM-dd'))
  const [departmentFilter, setDepartmentFilter] = React.useState('all')
  const [attendance, setAttendance] = React.useState<AttendanceRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [calendarMonth, setCalendarMonth] = React.useState(new Date())
  const [calendarData, setCalendarData] = React.useState<{ date: Date; status?: AttendanceStatus }[]>([])
  const [holidays, setHolidays] = React.useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = React.useState<any[]>([])

  // Row selection for bulk actions
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [selectedRowDetail, setSelectedRowDetail] = React.useState<AttendanceRow | null>(null)

  // Regularization dialog
  const [regularizationOpen, setRegularizationOpen] = React.useState(false)
  const [regEmployeeId, setRegEmployeeId] = React.useState('')
  const [regDate, setRegDate] = React.useState('')
  const [regType, setRegType] = React.useState<RegularizationRequest['type']>('LATE_ARRIVAL')
  const [regReason, setRegReason] = React.useState('')
  const [regSubmitting, setRegSubmitting] = React.useState(false)

  // Search
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch attendance for date range
  React.useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          startDate: selectedDateStart,
          endDate: selectedDateEnd,
        })
        const res = await fetch(`/api/attendance?${params}`)
        const json = await res.json()
        if (json.success) {
          const rows: AttendanceRow[] = (json.data || []).map((record: AttendanceRecord) => ({
            id: record.id,
            employeeId: record.employeeId,
            employee: record.employee || {
              id: '',
              employeeCode: '',
              firstName: '',
              lastName: '',
              department: '',
              designation: '',
            },
            status: record.status as AttendanceStatus,
            checkIn: record.inTime || undefined,
            checkOut: record.outTime || undefined,
            remarks: record.remarks || undefined,
            date: typeof record.date === 'string' ? record.date : (record.date as Date).toISOString().split('T')[0],
          }))
          setAttendance(rows)
        }
      } catch (_e) {
        toast({ title: 'Error', description: 'Failed to fetch attendance data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [selectedDateStart, selectedDateEnd, toast])

  // Fetch calendar month data
  React.useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth() + 1
        const params = new URLSearchParams({ month: String(month), year: String(year) })
        const res = await fetch(`/api/attendance?${params}`)
        const json = await res.json()
        if (json.success) {
          const data = (json.data || []).map((record: AttendanceRecord) => ({
            date: new Date(record.date),
            status: record.status as AttendanceStatus,
          }))
          setCalendarData(data)
        }

        // Fetch holidays for the year
        const holidaysRes = await fetch(`/api/holidays?year=${year}`)
        const holidaysJson = await holidaysRes.json()
        if (holidaysJson.success) {
          setHolidays(holidaysJson.data || [])
        }
      } catch (_e) {
        // silently fail for calendar data
      }
    }

    fetchCalendarData()
  }, [calendarMonth])

  // Fetch leave requests for calendar
  React.useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth() + 1
        const start = new Date(year, month - 1, 1)
        const end = new Date(year, month, 0)
        const params = new URLSearchParams({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        })
        const res = await fetch(`/api/leave?${params}`)
        const json = await res.json()
        if (json.success) {
          // Flatten leave requests to individual days
          const days: any[] = []
          for (const req of json.data || []) {
            if (req.status !== 'APPROVED') continue
            const current = new Date(req.startDate)
            const endDate = new Date(req.endDate)
            while (current <= endDate) {
              days.push({
                date: new Date(current),
                leaveType: req.leaveType,
                status: req.status,
              })
              current.setDate(current.getDate() + 1)
            }
          }
          setLeaveRequests(days)
        }
      } catch (_e) {
        // silently fail
      }
    }

    fetchLeaveRequests()
  }, [calendarMonth])

  const handleStatusChange = (id: string, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row))
    )
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const updates = attendance
        .filter((row) => row.id)
        .map((row) => ({
          employeeId: row.employeeId,
          date: row.date,
          status: row.status,
          inTime: row.checkIn,
          outTime: row.checkOut,
          remarks: row.remarks,
        }))

      await Promise.all(
        updates.map((data) =>
          fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        )
      )

      toast({ title: 'Success', description: 'Attendance saved successfully' })
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to save attendance', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: AttendanceStatus) => {
    if (selectedRows.size === 0) return
    setSaving(true)
    try {
      const selectedAttendance = attendance.filter((a) => selectedRows.has(a.id))
      await Promise.all(
        selectedAttendance.map((row) =>
          fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: row.employeeId,
              date: row.date,
              status: newStatus,
              inTime: row.checkIn,
              outTime: row.checkOut,
              remarks: row.remarks,
            }),
          })
        )
      )
      toast({ title: 'Success', description: `${selectedRows.size} records updated to ${newStatus}` })
      setSelectedRows(new Set())
      // Refresh
      const params = new URLSearchParams({ startDate: selectedDateStart, endDate: selectedDateEnd })
      const res = await fetch(`/api/attendance?${params}`)
      const json = await res.json()
      if (json.success) {
        const rows: AttendanceRow[] = (json.data || []).map((record: AttendanceRecord) => ({
          id: record.id,
          employeeId: record.employeeId,
          employee: record.employee || { id: '', employeeCode: '', firstName: '', lastName: '', department: '', designation: '' },
          status: record.status as AttendanceStatus,
          checkIn: record.inTime || undefined,
          checkOut: record.outTime || undefined,
          remarks: record.remarks || undefined,
          date: typeof record.date === 'string' ? record.date : (record.date as Date).toISOString().split('T')[0],
        }))
        setAttendance(rows)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update records', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredAttendance.map((a) => a.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  // Regularization submission
  const handleRegularizationSubmit = async () => {
    if (!regEmployeeId || !regDate || !regReason) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    setRegSubmitting(true)
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: regEmployeeId,
          date: regDate,
          type: regType,
          reason: regReason,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Success', description: 'Regularization request submitted' })
        setRegularizationOpen(false)
        setRegEmployeeId('')
        setRegDate('')
        setRegReason('')
        setRegType('LATE_ARRIVAL')
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to submit', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to submit regularization', variant: 'destructive' })
    } finally {
      setRegSubmitting(false)
    }
  }

  const filteredAttendance = React.useMemo(() => {
    let result = attendance
    if (departmentFilter !== 'all') {
      result = result.filter((row) => row.employee?.department === departmentFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (row) =>
          row.employee?.firstName?.toLowerCase().includes(q) ||
          row.employee?.lastName?.toLowerCase().includes(q) ||
          row.employee?.employeeCode?.toLowerCase().includes(q)
      )
    }
    return result
  }, [attendance, departmentFilter, searchQuery])

  const presentCount = filteredAttendance.filter((a) => a.status === 'PRESENT').length
  const absentCount = filteredAttendance.filter((a) => a.status === 'ABSENT').length
  const lateCount = filteredAttendance.filter((a) => a.status === 'LATE').length
  const halfDayCount = filteredAttendance.filter((a) => a.status === 'HALF_DAY').length
  const leaveCount = filteredAttendance.filter((a) => a.status === 'LEAVE').length
  const weekOffCount = filteredAttendance.filter((a) => a.status === 'WEEK_OFF').length
  const holidayCount = filteredAttendance.filter((a) => a.status === 'HOLIDAY').length

  const handleRowClick = (row: AttendanceRow) => {
    setSelectedRowDetail(row)
    setDetailModalOpen(true)
  }

  const summaryBadges = [
    { label: 'Present', count: presentCount, color: '#4ADE80', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.3)' },
    { label: 'Absent', count: absentCount, color: '#F87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    { label: 'Late', count: lateCount, color: '#FCD34D', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    { label: 'Half Day', count: halfDayCount, color: '#60A5FA', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    { label: 'On Leave', count: leaveCount, color: '#A78BFA', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
    { label: 'Week Off', count: weekOffCount, color: '#9CA3AF', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
    { label: 'Holiday', count: holidayCount, color: '#C084FC', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
  ]

  const allSelected = filteredAttendance.length > 0 && selectedRows.size === filteredAttendance.length

  const columns: Column<AttendanceRow>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedRows.has(row.id)}
          onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
        />
      ),
    },
    {
      key: 'employee',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => handleRowClick(row)}
          className="text-left hover:underline"
        >
          <p className="font-medium text-white">{row.employee.firstName} {row.employee.lastName}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>{row.employee.employeeCode}</p>
        </button>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => (
        <span style={{ color: '#D1D5DB' }}>{row.employee.department || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Select value={row.status} onValueChange={(v) => handleStatusChange(row.id, v as AttendanceStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                <Badge variant={statusColors[s] as 'success' | 'destructive' | 'warning' | 'secondary' | 'info' | 'pending'}>{s.replace('_', ' ')}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (row) => <span style={{ color: '#D1D5DB' }}>{row.checkIn || '-'}</span>,
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (row) => <span style={{ color: '#D1D5DB' }}>{row.checkOut || '-'}</span>,
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (row) => <span style={{ color: '#9CA3AF' }}>{row.remarks || '-'}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Daily attendance management</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setRegularizationOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Regularize
          </Button>
          <Button variant="outline" asChild>
            <a href="/admin/attendance/bulk">
              <Download className="mr-2 h-4 w-4" />
              Bulk Upload
            </a>
          </Button>
          <Button
            onClick={handleSaveAll}
            loading={saving}
            disabled={attendance.length === 0}
          >
            Save All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{ color: '#9CA3AF' }} />
          <span className="text-sm" style={{ color: '#9CA3AF' }}>From</span>
          <input
            type="date"
            value={selectedDateStart}
            onChange={(e) => setSelectedDateStart(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
          />
          <span className="text-sm" style={{ color: '#9CA3AF' }}>To</span>
          <input
            type="date"
            value={selectedDateEnd}
            onChange={(e) => setSelectedDateEnd(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
          />
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Human Resources">Human Resources</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
          <Input
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        {summaryBadges.map((badge) => (
          <div
            key={badge.label}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ background: badge.bg, borderColor: badge.border }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: badge.color }} />
            <span className="text-sm font-medium" style={{ color: badge.color }}>
              {badge.label}: {badge.count}
            </span>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedRows.size > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border"
          style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}
        >
          <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>
            {selectedRows.size} selected
          </span>
          <div className="flex items-center gap-2">
            {statusOptions.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange(s)}
                loading={saving}
              >
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div>
          <AttendanceCalendar
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            attendanceData={calendarData}
            holidays={holidays}
            leaveRequests={leaveRequests}
            selectedDate={selectedDateStart ? new Date(selectedDateStart) : undefined}
            onDayClick={(date) => {
              setSelectedDateStart(format(date, 'yyyy-MM-dd'))
              setSelectedDateEnd(format(date, 'yyyy-MM-dd'))
            }}
          />
        </div>

        {/* Data Table */}
        <div className="xl:col-span-3">
          <DataTable
            columns={columns}
            data={filteredAttendance}
            keyField="id"
            searchable={false}
            loading={loading}
            emptyMessage="No attendance records found for this date"
          />
        </div>
      </div>

      {/* Row detail modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Attendance Details</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              {selectedRowDetail?.employee?.firstName} {selectedRowDetail?.employee?.lastName}
              &nbsp;&middot;&nbsp;{selectedRowDetail?.employee?.employeeCode}
            </DialogDescription>
          </DialogHeader>
          {selectedRowDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Department</p>
                  <p className="text-sm text-white">{selectedRowDetail.employee?.department || '-'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Designation</p>
                  <p className="text-sm text-white">{selectedRowDetail.employee?.designation || '-'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Date</p>
                  <p className="text-sm text-white">{selectedRowDetail.date ? format(new Date(selectedRowDetail.date), 'dd MMM yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Status</p>
                  <Badge variant={statusColors[selectedRowDetail.status] as 'success' | 'destructive' | 'warning' | 'secondary' | 'info' | 'pending'}>
                    {selectedRowDetail.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Check In</p>
                  <p className="text-sm text-white">{selectedRowDetail.checkIn || '-'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Check Out</p>
                  <p className="text-sm text-white">{selectedRowDetail.checkOut || '-'}</p>
                </div>
              </div>
              {selectedRowDetail.remarks && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Remarks</p>
                  <p className="text-sm text-white">{selectedRowDetail.remarks}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regularization Dialog */}
      <Dialog open={regularizationOpen} onOpenChange={setRegularizationOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Attendance Regularization Request</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Submit a request to regularize a missed or incorrect attendance record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Employee</Label>
              <Input
                placeholder="Employee ID"
                value={regEmployeeId}
                onChange={(e) => setRegEmployeeId(e.target.value)}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Date</Label>
              <Input
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Type</Label>
              <Select value={regType} onValueChange={(v) => setRegType(v as RegularizationRequest['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regularizationTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Reason</Label>
              <Textarea
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                placeholder="Describe the reason for regularization..."
                rows={3}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegularizationOpen(false)}>Cancel</Button>
            <Button onClick={handleRegularizationSubmit} loading={regSubmitting}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
