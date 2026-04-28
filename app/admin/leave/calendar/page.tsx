'use client'

import * as React from 'react'
import { LeaveCalendar } from '@/components/leave-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaveRequest } from '@/types'
import { format } from 'date-fns'

const mockLeaves: LeaveRequest[] = [
  { id: '1', employeeId: '1', leaveType: 'CASUAL', startDate: new Date('2024-04-15'), endDate: new Date('2024-04-17'), totalDays: 3, halfDay: false, status: 'APPROVED', createdAt: new Date(), updatedAt: new Date(), employee: { id: '1', employeeCode: 'EMP001', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@example.com', department: 'Engineering', designation: 'Software Engineer', joiningDate: new Date(), employmentType: 'FULL_TIME', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } },
  { id: '2', employeeId: '2', leaveType: 'SICK', startDate: new Date('2024-04-20'), endDate: new Date('2024-04-21'), totalDays: 2, halfDay: false, status: 'APPROVED', createdAt: new Date(), updatedAt: new Date(), employee: { id: '2', employeeCode: 'EMP002', firstName: 'Priya', lastName: 'Patel', email: 'priya@example.com', department: 'Marketing', designation: 'Marketing Manager', joiningDate: new Date(), employmentType: 'FULL_TIME', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } },
]

export default function LeaveCalendarPage() {
  const [month, setMonth] = React.useState(new Date())
  const [employeeFilter, setEmployeeFilter] = React.useState('all')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Calendar</h2>
          <p className="text-sm text-slate-500 mt-1">View approved leaves on calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="EMP001">Rahul Sharma</SelectItem>
              <SelectItem value="EMP002">Priya Patel</SelectItem>
              <SelectItem value="EMP003">Amit Singh</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <LeaveCalendar
        month={month}
        onMonthChange={setMonth}
        leaveData={mockLeaves}
        employeeFilter={employeeFilter}
      />
    </div>
  )
}
