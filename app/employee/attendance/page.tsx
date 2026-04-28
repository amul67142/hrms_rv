'use client'

import * as React from 'react'
import { AttendanceCalendar } from '@/components/attendance-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/core/utils'
import type { AttendanceStatus } from '@/types'
import { Loader2, LogIn, LogOut } from 'lucide-react'

interface AttendanceDay {
  date: Date
  status?: AttendanceStatus
  checkIn?: string
  checkOut?: string
  hoursWorked?: number
  remarks?: string
}

interface Holiday {
  id: string
  name: string
  date: Date
  year: number
  type?: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

interface LeaveDay {
  date: Date
  leaveType: string
  status: string
}

export default function EmployeeAttendancePage() {
  const [month, setMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [attendanceData, setAttendanceData] = React.useState<AttendanceDay[]>([])
  const [holidays, setHolidays] = React.useState<Holiday[]>([])
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveDay[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchAttendance = React.useCallback(async () => {
    setLoading(true)
    try {
      const year = month.getFullYear()
      const monthNum = month.getMonth() + 1

      const [attendanceRes, holidaysRes, leaveRes] = await Promise.all([
        fetch(`/api/attendance?month=${monthNum}&year=${year}&limit=100`),
        fetch(`/api/holidays?year=${year}`),
        fetch('/api/leave?status=APPROVED&limit=200')
      ])

      const attendanceJson = await attendanceRes.json()
      const holidaysJson = await holidaysRes.json()
      const leaveJson = await leaveRes.json()

      if (attendanceJson.success) {
        setAttendanceData(attendanceJson.data.map((d: any) => ({
          date: new Date(d.date),
          status: d.status,
          checkIn: d.inTime,
          checkOut: d.outTime,
          hoursWorked: d.hoursWorked,
          remarks: d.remarks
        })))
      }

      if (holidaysJson.success) {
        setHolidays(holidaysJson.data || [])
      }

      if (leaveJson.success) {
        const leaveDays: LeaveDay[] = []
        leaveJson.data.forEach((req: any) => {
          const start = new Date(req.startDate)
          const end = new Date(req.endDate)
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            leaveDays.push({
              date: new Date(d),
              leaveType: req.leaveType,
              status: req.status
            })
          }
        })
        setLeaveRequests(leaveDays)
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }, [month])

  React.useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const monthData = attendanceData
  const summary = {
    present: monthData.filter((d) => d.status === 'PRESENT').length,
    absent: monthData.filter((d) => d.status === 'ABSENT').length,
    leave: monthData.filter((d) => d.status === 'LEAVE').length,
    weekOff: monthData.filter((d) => d.status === 'WEEK_OFF').length,
  }

  const selectedDay = selectedDate ? monthData.find((d) => d.date.toDateString() === selectedDate.toDateString()) : null
  const selectedHoliday = selectedDate ? holidays.find((h) => new Date(h.date).toDateString() === selectedDate.toDateString()) : null
  const selectedLeave = selectedDate ? leaveRequests.find((l) => l.date.toDateString() === selectedDate.toDateString()) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">My Attendance</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>View your attendance record</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>{summary.present}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Present Days</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{summary.absent}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Absent Days</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{summary.leave}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Leave Days</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#9CA3AF' }}>{summary.weekOff}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Week Offs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <CardContent className="p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
              </CardContent>
            </Card>
          ) : (
            <AttendanceCalendar
              month={month}
              onMonthChange={setMonth}
              attendanceData={monthData}
              holidays={holidays}
              leaveRequests={leaveRequests}
              onDayClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
        </div>

        {/* Day Detail */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base text-white">Day Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                <div className="text-center p-4 rounded-lg" style={{ background: '#262626' }}>
                  <p className="text-sm font-medium text-white">
                    {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>Status</span>
                    <Badge variant={
                      selectedDay?.status === 'PRESENT' ? 'success' :
                      selectedDay?.status === 'ABSENT' ? 'destructive' :
                      selectedDay?.status === 'WEEK_OFF' ? 'secondary' :
                      selectedDay?.status === 'LEAVE' ? 'info' :
                      selectedDay?.status === 'LATE' ? 'warning' :
                      selectedDay?.status === 'HALF_DAY' ? 'warning' :
                      'secondary'
                    }>
                      {selectedDay?.status?.replace('_', ' ') || 'Not Marked'}
                    </Badge>
                  </div>
                  {selectedHoliday && (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)' }}>
                      <p className="text-sm font-medium" style={{ color: '#A78BFA' }}>Holiday: {selectedHoliday.name}</p>
                      {selectedHoliday.description && (
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{selectedHoliday.description}</p>
                      )}
                    </div>
                  )}
                  {selectedLeave && (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <p className="text-sm font-medium" style={{ color: '#60A5FA' }}>On Leave: {selectedLeave.leaveType.replace('_', ' ')}</p>
                    </div>
                  )}
                  {selectedDay?.checkIn && (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" style={{ color: '#4ADE80' }} />
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>Check In</span>
                        </div>
                        <span className="text-sm font-medium text-white">{selectedDay.checkIn}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <LogOut className="h-4 w-4" style={{ color: '#F87171' }} />
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>Check Out</span>
                        </div>
                        <span className="text-sm font-medium text-white">{selectedDay.checkOut || '-'}</span>
                      </div>
                      {selectedDay.hoursWorked && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>Hours Worked</span>
                          <span className="text-sm font-medium text-white">{selectedDay.hoursWorked.toFixed(1)} hrs</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedDay?.remarks && (
                    <div className="pt-2" style={{ borderTop: '1px solid #2D2D2D' }}>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Remarks</p>
                      <p className="text-sm text-white">{selectedDay.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: '#6B7280' }}>
                <p className="text-sm">Select a day on the calendar to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
