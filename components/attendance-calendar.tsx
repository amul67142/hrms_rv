'use client'

import * as React from 'react'
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, Clock, Coffee, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/core/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isWeekend,
  isSameMonth,
} from 'date-fns'
import type { AttendanceStatus, Holiday } from '@/types'

interface LeaveDay {
  date: Date
  leaveType: string
  status: string
}

interface AttendanceDay {
  date: Date
  status?: AttendanceStatus
  checkIn?: string | null
  checkOut?: string | null
  hoursWorked?: number | null
  remarks?: string | null
}

interface AttendanceCalendarProps {
  month: Date
  onMonthChange: (date: Date) => void
  attendanceData?: AttendanceDay[]
  holidays?: Holiday[]
  leaveRequests?: LeaveDay[]
  onDayClick?: (date: Date) => void
  selectedDate?: Date
  loading?: boolean
}

interface DayDetailModalProps {
  open: boolean
  onClose: () => void
  date: Date | null
  attendance?: AttendanceDay
  holiday?: Holiday
  leaveDay?: LeaveDay
  isLate?: boolean
  isEarlyCheckout?: boolean
  event?: { name: string }
}

const statusColors: Record<AttendanceStatus, { bg: string; dot: string; text: string; label: string }> = {
  PRESENT: { bg: 'rgba(34, 197, 94, 0.2)', dot: '#22c55e', text: '#4ade80', label: 'Present' },
  ABSENT: { bg: 'rgba(239, 68, 68, 0.2)', dot: '#ef4444', text: '#f87171', label: 'Absent' },
  HALF_DAY: { bg: 'rgba(59, 130, 246, 0.2)', dot: '#3b82f6', text: '#60a5fa', label: 'Half Day' },
  LATE: { bg: 'rgba(245, 158, 11, 0.2)', dot: '#f59e0b', text: '#fbbf24', label: 'Late' },
  WEEK_OFF: { bg: 'rgba(107, 114, 128, 0.2)', dot: '#6b7280', text: '#9ca3af', label: 'Week Off' },
  HOLIDAY: { bg: 'rgba(168, 85, 247, 0.2)', dot: '#a855f7', text: '#c084fc', label: 'Holiday' },
  LEAVE: { bg: 'rgba(139, 92, 246, 0.2)', dot: '#8b5cf6', text: '#a78bfa', label: 'Leave' },
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DayDetailModal({ open, onClose, date, attendance, holiday, leaveDay, isLate, isEarlyCheckout, event }: DayDetailModalProps) {
  if (!open || !date) return null

  const isLeaveDay = !!leaveDay
  const isHoliday = !!holiday
  const isWeekendDay = isWeekend(date)

  const getSalaryImpact = () => {
    if (attendance?.status === 'HALF_DAY') return '0.5 day deducted'
    if (attendance?.status === 'ABSENT') return '1 day deducted'
    if (attendance?.status === 'LATE') return '0.25 day deducted (partial)'
    if (isLeaveDay) return leaveDay.leaveType ? `${leaveDay.leaveType} leave applied` : ''
    if (isHoliday) return 'No deduction (paid holiday)'
    if (isWeekendDay) return 'No deduction (weekend)'
    return 'Full day counted'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-xl border p-6 shadow-2xl"
        style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          style={{ color: '#9CA3AF' }}
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-semibold text-white mb-1">{format(date, 'EEEE')}</h3>
        <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>{format(date, 'MMMM d, yyyy')}</p>

        {/* Status badge */}
        {attendance?.status && (
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: statusColors[attendance.status]?.bg, color: statusColors[attendance.status]?.text }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: statusColors[attendance.status]?.dot }}
              />
              {statusColors[attendance.status]?.label}
            </span>
          </div>
        )}

        {isHoliday && (
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: statusColors.HOLIDAY.bg, color: statusColors.HOLIDAY.text }}
            >
              <Star className="h-3 w-3" />
              Holiday: {holiday.name}
            </span>
          </div>
        )}

        {isLeaveDay && (
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: statusColors.LEAVE.bg, color: statusColors.LEAVE.text }}
            >
              <Coffee className="h-3 w-3" />
              On Leave: {leaveDay.leaveType?.replace('_', ' ')}
            </span>
          </div>
        )}

        {isWeekendDay && !isHoliday && !isLeaveDay && !attendance?.status && (
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: statusColors.WEEK_OFF.bg, color: statusColors.WEEK_OFF.text }}
            >
              Weekend
            </span>
          </div>
        )}

        {/* Late Arrival indicator */}
        {isLate && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}
            >
              <AlertTriangle className="h-3 w-3" />
              Late Arrival (after 10:00 AM)
            </span>
          </div>
        )}

        {/* Early Checkout indicator */}
        {isEarlyCheckout && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <Clock className="h-3 w-3" />
              Early Checkout (before 6:00 PM)
            </span>
          </div>
        )}

        {/* Event indicator */}
        {event && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}
            >
              <Briefcase className="h-3 w-3" />
              Event: {event.name}
            </span>
          </div>
        )}

        {/* Time details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Check In</p>
              <p className="text-sm font-medium text-white">
                {attendance?.checkIn || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Check Out</p>
              <p className="text-sm font-medium text-white">
                {attendance?.checkOut || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Coffee className="h-4 w-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Hours Worked</p>
              <p className="text-sm font-medium text-white">
                {attendance?.hoursWorked != null ? `${attendance.hoursWorked.toFixed(1)} hrs` : '-'}
              </p>
            </div>
          </div>

          {attendance?.remarks && (
            <div className="pt-2" style={{ borderTop: '1px solid #2D2D2D' }}>
              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Remarks</p>
              <p className="text-sm text-white">{attendance.remarks}</p>
            </div>
          )}

          {isHoliday && holiday?.description && (
            <div className="pt-2" style={{ borderTop: '1px solid #2D2D2D' }}>
              <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Description</p>
              <p className="text-sm text-white">{holiday.description}</p>
            </div>
          )}

          {/* Salary impact */}
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <p className="text-xs mb-1" style={{ color: '#a78bfa' }}>Salary Impact</p>
            <p className="text-sm font-medium" style={{ color: '#c4b5fd' }}>{getSalaryImpact()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AttendanceCalendar({
  month,
  onMonthChange,
  attendanceData = [],
  holidays = [],
  leaveRequests = [],
  onDayClick,
  selectedDate,
  loading = false,
}: AttendanceCalendarProps) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)
  const today = new Date()

  const getDayData = (date: Date) => {
    return attendanceData.find((d) => isSameDay(new Date(d.date), date))
  }

  const getHoliday = (date: Date) => {
    return holidays.find((h) => isSameDay(new Date(h.date), date))
  }

  const getLeaveDay = (date: Date) => {
    return leaveRequests.find((l) => isSameDay(new Date(l.date), date))
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    setModalOpen(true)
    onDayClick?.(date)
  }

  const selectedDayAttendance = selectedDay ? getDayData(selectedDay) : undefined
  const selectedDayHoliday = selectedDay ? getHoliday(selectedDay) : undefined
  const selectedDayLeave = selectedDay ? getLeaveDay(selectedDay) : undefined

  // Determine effective status for a day
  const getEffectiveStatus = (date: Date): AttendanceStatus | null => {
    const dayData = getDayData(date)
    const holidayData = getHoliday(date)
    const leaveData = getLeaveDay(date)
    const isWeekendDay = isWeekend(date)

    if (holidayData) return 'HOLIDAY'
    if (leaveData) return 'LEAVE'
    if (dayData?.status) return dayData.status
    if (isWeekendDay) return 'WEEK_OFF'
    return null
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #2D2D2D' }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold text-white">
            {format(month, 'MMMM yyyy')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week days header */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid #2D2D2D' }}>
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#6B7280' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month start */}
          {loading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[80px] border-b border-r p-1 animate-pulse"
                style={{ borderColor: '#2D2D2D', background: '#0F0F0F' }}
              />
            ))
          ) : (
            <>
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[80px] border-b border-r p-1"
              style={{ borderColor: '#2D2D2D', background: '#0F0F0F' }}
            />
          ))}

          {/* Month days */}
          {days.map((day) => {
            const dayData = getDayData(day)
            const holidayData = getHoliday(day)
            const leaveData = getLeaveDay(day)
            const isToday = isSameDay(day, today)
            const isWeekendDay = isWeekend(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const effectiveStatus = getEffectiveStatus(day)

            const statusConfig = effectiveStatus ? statusColors[effectiveStatus] : null

            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] border-b border-r p-1"
                style={{
                  borderColor: '#2D2D2D',
                  background: isWeekendDay && !isSelected && !statusConfig ? '#0F0F0F' : 'transparent',
                }}
              >
                <button
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'w-full h-full flex flex-col items-center justify-start gap-1 p-1 rounded-lg transition-colors',
                    isToday && 'ring-2 ring-[#8B5CF6] ring-offset-1 ring-offset-[#1A1A1A]',
                    isSelected && !isToday && 'ring-2 ring-[#8B5CF6]/50 ring-offset-1 ring-offset-[#1A1A1A]',
                    !isToday && !isSelected && 'hover:bg-[#262626]'
                  )}
                  style={{
                    background: statusConfig?.bg || (isWeekendDay && !isSelected ? '#0F0F0F' : 'transparent'),
                  }}
                >
                  <span
                    className="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      color: isToday ? '#8B5CF6' : isWeekendDay ? '#4B5563' : '#E5E7EB',
                    }}
                  >
                    {format(day, 'd')}
                  </span>

                  {effectiveStatus && (
                    <div className="flex items-center gap-1">
                      {effectiveStatus === 'HOLIDAY' ? (
                        <Star className="h-2.5 w-2.5" style={{ color: statusConfig?.dot }} />
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: statusConfig?.dot }}
                        />
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 p-3" style={{ borderTop: '1px solid #2D2D2D', background: '#0F0F0F' }}>
          {Object.entries(statusColors).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              {status === 'HOLIDAY' ? (
                <Star className="h-3 w-3" style={{ color: config.dot }} />
              ) : (
                <span className="w-2 h-2 rounded-full" style={{ background: config.dot }} />
              )}
              <span className="text-sm capitalize" style={{ color: '#9CA3AF' }}>
                {status.replace('_', ' ').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DayDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedDay}
        attendance={selectedDayAttendance}
        holiday={selectedDayHoliday}
        leaveDay={selectedDayLeave}
        isLate={!!selectedDayAttendance?.checkIn && selectedDayAttendance.checkIn > '10:00'}
        isEarlyCheckout={!!selectedDayAttendance?.checkOut && selectedDayAttendance.checkOut < '18:00'}
        event={undefined}
      />
    </>
  )
}
