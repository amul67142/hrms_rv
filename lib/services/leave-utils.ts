import { LeaveType, LeaveStatus } from '@/types'

export interface LeaveEntitlement {
  casual: number
  sick: number
  maternity: number
  paternity: number
  bereavement: number
  compensatory: number
  wfh: number
  unpaid: number
}

export interface LeaveBalance {
  leaveType: LeaveType
  entitled: number
  taken: number
  pending: number
  available: number
}

export interface LeaveRequestInput {
  employeeId: string
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  reason?: string
}

const DEFAULT_ENTITLEMENTS: LeaveEntitlement = {
  casual: 12,
  sick: 12,
  maternity: 90,
  paternity: 15,
  bereavement: 5,
  compensatory: 0,
  wfh: 10,
  unpaid: 0,
}

export function getDefaultEntitlements(): LeaveEntitlement {
  return { ...DEFAULT_ENTITLEMENTS }
}

export function calculateLeaveBalance(
  leaveType: LeaveType,
  entitled: number,
  taken: number,
  pending: number
): LeaveBalance {
  return {
    leaveType,
    entitled,
    taken,
    pending,
    available: entitled - taken - pending,
  }
}

export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  excludeWeekends = true,
  holidays: Date[] = []
): number {
  const holidaySet = new Set(holidays.map(h => h.toDateString()))
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    if (!excludeWeekends) {
      if (!holidaySet.has(current.toDateString())) {
        count++
      }
    } else {
      const dayOfWeek = current.getDay()
      // Skip weekends (Sunday=0, Saturday=6)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Skip holidays
        if (!holidaySet.has(current.toDateString())) {
          count++
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

export function canApplyLeave(
  balance: LeaveBalance,
  requestedDays: number
): { allowed: boolean; reason?: string } {
  if (balance.available < requestedDays) {
    return {
      allowed: false,
      reason: `Insufficient leave balance. Available: ${balance.available} days, Requested: ${requestedDays} days`,
    }
  }
  return { allowed: true }
}

export function isLeaveTypePaid(leaveType: LeaveType): boolean {
  const paidTypes: LeaveType[] = [
    'CASUAL',
    'SICK',
    'MATERNITY',
    'PATERNITY',
    'BEREAVEMENT',
    'COMPENSATORY',
    'WFH',
  ]
  return paidTypes.includes(leaveType)
}

export function getLeaveTypeLabel(leaveType: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    CASUAL: 'Casual Leave',
    SICK: 'Sick Leave',
    MATERNITY: 'Maternity Leave',
    PATERNITY: 'Paternity Leave',
    BEREAVEMENT: 'Bereavement Leave',
    UNPAID: 'Unpaid Leave',
    COMPENSATORY: 'Compensatory Leave',
    WFH: 'Work From Home',
  }
  return labels[leaveType] || leaveType
}

export function getLeaveTypeColor(leaveType: LeaveType): string {
  const colors: Record<LeaveType, string> = {
    CASUAL: 'bg-blue-100 text-blue-800',
    SICK: 'bg-red-100 text-red-800',
    MATERNITY: 'bg-pink-100 text-pink-800',
    PATERNITY: 'bg-purple-100 text-purple-800',
    BEREAVEMENT: 'bg-gray-100 text-gray-800',
    UNPAID: 'bg-orange-100 text-orange-800',
    COMPENSATORY: 'bg-yellow-100 text-yellow-800',
    WFH: 'bg-cyan-100 text-cyan-800',
  }
  return colors[leaveType] || 'bg-gray-100 text-gray-800'
}

export function getLeaveStatusLabel(status: LeaveStatus): string {
  const labels: Record<LeaveStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  }
  return labels[status] || status
}

export function getLeaveStatusColor(status: LeaveStatus): string {
  const colors: Record<LeaveStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getMinimumNoticePeriod(leaveType: LeaveType): number {
  const noticePeriods: Record<LeaveType, number> = {
    CASUAL: 1,
    SICK: 0,
    MATERNITY: 30,
    PATERNITY: 7,
    BEREAVEMENT: 1,
    UNPAID: 1,
    COMPENSATORY: 1,
    WFH: 1,
  }
  return noticePeriods[leaveType] || 1
}

export function isLeaveInPast(startDate: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  return start < today
}

export function isLeaveOverlapping(
  startDate: Date,
  endDate: Date,
  existingLeaves: Array<{ startDate: Date; endDate: Date; status: LeaveStatus }>
): boolean {
  const newStart = new Date(startDate).getTime()
  const newEnd = new Date(endDate).getTime()

  return existingLeaves.some((leave) => {
    if (leave.status === 'REJECTED' || leave.status === 'CANCELLED') {
      return false
    }
    const existingStart = new Date(leave.startDate).getTime()
    const existingEnd = new Date(leave.endDate).getTime()
    return newStart <= existingEnd && newEnd >= existingStart
  })
}

export function validateLeaveRequest(
  balance: LeaveBalance,
  requestedDays: number,
  startDate: Date,
  leaveType: LeaveType
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (isLeaveInPast(startDate)) {
    errors.push('Cannot apply for leave in the past')
  }

  const noticePeriod = getMinimumNoticePeriod(leaveType)
  const daysFromNow = Math.ceil(
    (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (daysFromNow < noticePeriod && leaveType !== 'SICK') {
    errors.push(
      `${leaveType} requires at least ${noticePeriod} day(s) notice`
    )
  }

  const canApply = canApplyLeave(balance, requestedDays)
  if (!canApply.allowed) {
    errors.push(canApply.reason || 'Insufficient leave balance')
  }

  return { valid: errors.length === 0, errors }
}

export function getYearlyLeaveSummary(
  balances: LeaveBalance[]
): {
  totalEntitled: number
  totalTaken: number
  totalPending: number
  totalAvailable: number
} {
  return balances.reduce(
    (acc, b) => ({
      totalEntitled: acc.totalEntitled + b.entitled,
      totalTaken: acc.totalTaken + b.taken,
      totalPending: acc.totalPending + b.pending,
      totalAvailable: acc.totalAvailable + b.available,
    }),
    { totalEntitled: 0, totalTaken: 0, totalPending: 0, totalAvailable: 0 }
  )
}
