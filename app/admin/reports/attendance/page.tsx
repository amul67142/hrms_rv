'use client'

import * as React from 'react'
import { Download, ArrowLeft, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'

interface AttendanceRecord {
  id: string
  employeeCode: string
  employeeName: string
  department: string
  date: string
  status: string
  checkIn: string
  checkOut: string
  hoursWorked: number
}

const mockData: AttendanceRecord[] = [
  { id: '1', employeeCode: 'EMP001', employeeName: 'Rahul Sharma', department: 'Engineering', date: '2024-04-15', status: 'PRESENT', checkIn: '09:15', checkOut: '18:30', hoursWorked: 9.25 },
  { id: '2', employeeCode: 'EMP002', employeeName: 'Priya Patel', department: 'Marketing', date: '2024-04-15', status: 'PRESENT', checkIn: '09:00', checkOut: '18:00', hoursWorked: 9.0 },
  { id: '3', employeeCode: 'EMP003', employeeName: 'Amit Singh', department: 'Finance', date: '2024-04-15', status: 'ABSENT', checkIn: '-', checkOut: '-', hoursWorked: 0 },
  { id: '4', employeeCode: 'EMP001', employeeName: 'Rahul Sharma', department: 'Engineering', date: '2024-04-16', status: 'PRESENT', checkIn: '09:20', checkOut: '18:45', hoursWorked: 9.42 },
  { id: '5', employeeCode: 'EMP002', employeeName: 'Priya Patel', department: 'Marketing', date: '2024-04-16', status: 'PRESENT', checkIn: '09:05', checkOut: '18:10', hoursWorked: 9.08 },
]

const columns: Column<AttendanceRecord>[] = [
  { key: 'employeeCode', header: 'Employee Code', sortable: true },
  { key: 'employeeName', header: 'Employee Name', sortable: true },
  { key: 'department', header: 'Department', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'checkIn', header: 'Check In' },
  { key: 'checkOut', header: 'Check Out' },
  { key: 'hoursWorked', header: 'Hours Worked', sortable: true, render: (row) => `${row.hoursWorked.toFixed(1)}h` },
]

export default function AttendanceReportPage() {
  const [startDate, setStartDate] = React.useState('2024-04-01')
  const [endDate, setEndDate] = React.useState('2024-04-30')
  const [department, setDepartment] = React.useState('all')
  const [search, setSearch] = React.useState('')

  const filteredData = React.useMemo(() => {
    return mockData.filter((r) => {
      const dateMatch = r.date >= startDate && r.date <= endDate
      const deptMatch = department === 'all' || r.department === department
      const searchMatch = !search || r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.employeeCode.toLowerCase().includes(search.toLowerCase())
      return dateMatch && deptMatch && searchMatch
    })
  }, [startDate, endDate, department, search])

  const summary = {
    totalDays: new Set(filteredData.map((r) => r.date)).size,
    totalPresent: filteredData.filter((r) => r.status === 'PRESENT').length,
    totalAbsent: filteredData.filter((r) => r.status === 'ABSENT').length,
    avgHours: filteredData.filter((r) => r.hoursWorked > 0).reduce((s, r) => s + r.hoursWorked, 0) / Math.max(1, filteredData.filter((r) => r.hoursWorked > 0).length),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Attendance Report</h2>
          <p className="text-sm text-slate-500">Attendance data with filters and export options</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{summary.totalDays}</p><p className="text-xs text-slate-500">Working Days</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{summary.totalPresent}</p><p className="text-xs text-slate-500">Present</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{summary.totalAbsent}</p><p className="text-xs text-slate-500">Absent</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{summary.avgHours.toFixed(1)}h</p><p className="text-xs text-slate-500">Avg Hours/Day</p></CardContent></Card>
      </div>

      <DataTable columns={columns} data={filteredData} keyField="id" searchValue={search} onSearch={setSearch} searchable={true} searchPlaceholder="Search by name or code..." />
    </div>
  )
}
