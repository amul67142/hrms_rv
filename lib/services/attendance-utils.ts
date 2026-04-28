import type { AttendanceStatus } from '@/types'
import { getMonthDays } from '@/lib/core/utils'

export interface AttendanceSummary {
  workingDays: number
  presentDays: number
  absentDays: number
  halfDays: number
  weekOffs: number
  holidays: number
  paidDays: number
  unpaidLeaveDays: number
  totalPaidDays: number
}

export function calculateAttendanceSummary(
  attendanceList: Array<{ status: AttendanceStatus }>,
  month: number,
  year: number
): AttendanceSummary {
  const workingDays = countWorkingDays(month, year)

  let presentDays = 0,
    absentDays = 0,
    halfDays = 0,
    weekOffs = 0,
    holidays = 0,
    leaveDays = 0

  for (const att of attendanceList) {
    switch (att.status) {
      case 'PRESENT':
        presentDays++
        break
      case 'ABSENT':
        absentDays++
        break
      case 'HALF_DAY':
        halfDays++
        break
      case 'WEEK_OFF':
        weekOffs++
        break
      case 'HOLIDAY':
        holidays++
        break
      case 'LEAVE':
        leaveDays++
        break
      case 'LATE':
        // Late counts as present but with penalty
        presentDays++
        break
    }
  }

  const paidDays = presentDays + halfDays * 0.5 + weekOffs + holidays
  const unpaidLeaveDays = leaveDays

  return {
    workingDays,
    presentDays,
    absentDays,
    halfDays,
    weekOffs,
    holidays,
    paidDays: Math.round(paidDays * 100) / 100,
    unpaidLeaveDays: Math.round(unpaidLeaveDays * 100) / 100,
    totalPaidDays: Math.round((paidDays + unpaidLeaveDays) * 100) / 100,
  }
}

function countWorkingDays(month: number, year: number): number {
  const days = getMonthDays(month, year)
  let count = 0
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month - 1, d)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
  }
  return count
}

export function getAttendanceStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'text-green-600 bg-green-50'
    case 'ABSENT':
      return 'text-red-600 bg-red-50'
    case 'HALF_DAY':
      return 'text-yellow-600 bg-yellow-50'
    case 'LATE':
      return 'text-amber-600 bg-amber-50'
    case 'WEEK_OFF':
      return 'text-blue-600 bg-blue-50'
    case 'HOLIDAY':
      return 'text-purple-600 bg-purple-50'
    case 'LEAVE':
      return 'text-orange-600 bg-orange-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function getAttendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'Present'
    case 'ABSENT':
      return 'Absent'
    case 'HALF_DAY':
      return 'Half Day'
    case 'LATE':
      return 'Late'
    case 'WEEK_OFF':
      return 'Week Off'
    case 'HOLIDAY':
      return 'Holiday'
    case 'LEAVE':
      return 'Leave'
    default:
      return status
  }
}

export function isValidAttendanceTransition(
  currentStatus: AttendanceStatus,
  newStatus: AttendanceStatus
): boolean {
  const allowedTransitions: Record<AttendanceStatus, AttendanceStatus[]> = {
    PRESENT: ['ABSENT', 'HALF_DAY', 'LATE', 'LEAVE'],
    ABSENT: ['PRESENT', 'LEAVE'],
    HALF_DAY: ['PRESENT', 'ABSENT', 'LEAVE'],
    LATE: ['PRESENT', 'ABSENT', 'LEAVE'],
    WEEK_OFF: ['PRESENT', 'ABSENT', 'LEAVE'],
    HOLIDAY: [],
    LEAVE: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'],
  }
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false
}

export function calculateMonthlyAttendanceRate(
  attendanceList: Array<{ status: AttendanceStatus }>,
  month: number,
  year: number
): number {
  const summary = calculateAttendanceSummary(attendanceList, month, year)
  if (summary.workingDays === 0) return 0
  const rate = (summary.presentDays / summary.workingDays) * 100
  return Math.round(rate * 100) / 100
}
