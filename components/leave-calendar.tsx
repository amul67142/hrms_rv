'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
} from 'date-fns'
import type { LeaveRequest } from '@/types'

interface LeaveCalendarProps {
  month: Date
  onMonthChange: (date: Date) => void
  leaveData?: LeaveRequest[]
  employeeFilter?: string
  onDayClick?: (date: Date) => void
  loading?: boolean
}

const leaveColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

export function LeaveCalendar({
  month,
  onMonthChange,
  leaveData = [],
  employeeFilter,
  onDayClick,
  loading = false,
}: LeaveCalendarProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)
  const today = new Date()

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getLeavesForDay = (date: Date) => {
    return leaveData.filter((leave) => {
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const leaveStartDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const leaveEndDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      return dayStart >= leaveStartDate && dayStart <= leaveEndDate
    })
  }

  const getLeaveColor = (index: number) => {
    return leaveColors[index % leaveColors.length]
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#1A1A1A', borderColor: '#2D2D2D', borderWidth: '1px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottomColor: '#2D2D2D', borderBottomWidth: '1px' }}
      >
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(month, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold text-white">
          {format(month, 'MMMM yyyy')}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days header */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottomColor: '#2D2D2D', borderBottomWidth: '1px' }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {loading ? (
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[80px] p-1 animate-pulse"
              style={{
                borderBottomColor: '#2D2D2D',
                borderBottomWidth: '1px',
                borderRightColor: '#2D2D2D',
                borderRightWidth: i % 7 !== 6 ? '1px' : '0',
                background: '#262626',
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[80px]"
                style={{ borderBottomColor: '#2D2D2D', borderBottomWidth: '1px', borderRightColor: '#2D2D2D', borderRightWidth: '1px', background: '#262626' }}
              />
            ))}

            {days.map((day) => {
              const leavesForDay = getLeavesForDay(day)
              const isToday = isSameDay(day, today)

              return (
                <div
                  key={day.toISOString()}
                  className={cn('min-h-[80px] p-1')}
                  style={{
                    borderBottomColor: '#2D2D2D',
                    borderBottomWidth: '1px',
                    borderRightColor: '#2D2D2D',
                    borderRightWidth: '1px',
                    background: isToday ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  }}
                >
                  <button
                    onClick={() => onDayClick?.(day)}
                    className="w-full text-left"
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full',
                        isToday ? 'bg-blue-600 text-white' : 'text-gray-300'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {leavesForDay.slice(0, 2).map((leave, idx) => (
                        <div
                          key={leave.id}
                          className={cn(
                            'text-[9px] text-white px-1 py-0.5 rounded truncate',
                            getLeaveColor(idx)
                          )}
                          title={`${leave.employee?.firstName} ${leave.employee?.lastName} - ${leave.leaveType}`}
                        >
                          {leave.employee?.firstName} {leave.leaveType.charAt(0)}
                        </div>
                      ))}
                      {leavesForDay.length > 2 && (
                        <div className="text-[9px] text-gray-400 px-1">
                          +{leavesForDay.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
      <div
        className="flex flex-wrap gap-3 p-3"
        style={{ borderTopColor: '#2D2D2D', borderTopWidth: '1px', background: '#262626' }}
      >
        {leaveData.slice(0, 6).map((leave, idx) => (
          <div key={leave.id} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded', getLeaveColor(idx))} />
            <span className="text-xs text-gray-400">
              {leave.employee?.firstName} {leave.employee?.lastName?.charAt(0)}.
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
