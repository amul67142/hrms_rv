'use client'

import * as React from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/core/utils'
import type { LeaveType, LeaveStatus } from '@/types'

interface LeaveRecord {
  id: string
  employeeCode: string
  employeeName: string
  department: string
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  totalDays: number
  status: LeaveStatus
  appliedDate: Date
}

const mockData: LeaveRecord[] = [
  { id: '1', employeeCode: 'EMP001', employeeName: 'Rahul Sharma', department: 'Engineering', leaveType: 'CASUAL', startDate: new Date('2024-04-15'), endDate: new Date('2024-04-17'), totalDays: 3, status: 'APPROVED', appliedDate: new Date('2024-04-10') },
  { id: '2', employeeCode: 'EMP002', employeeName: 'Priya Patel', department: 'Marketing', leaveType: 'SICK', startDate: new Date('2024-04-20'), endDate: new Date('2024-04-21'), totalDays: 2, status: 'APPROVED', appliedDate: new Date('2024-04-18') },
  { id: '4', employeeCode: 'EMP004', employeeName: 'Sneha Gupta', department: 'HR', leaveType: 'MATERNITY', startDate: new Date('2024-04-10'), endDate: new Date('2024-07-10'), totalDays: 90, status: 'APPROVED', appliedDate: new Date('2024-04-01') },
]

const statusColors: Record<LeaveStatus, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

const columns: Column<LeaveRecord>[] = [
  { key: 'employeeCode', header: 'Employee Code', sortable: true },
  { key: 'employeeName', header: 'Employee Name', sortable: true },
  { key: 'department', header: 'Department', sortable: true },
  { key: 'leaveType', header: 'Leave Type', sortable: true },
  {
    key: 'dates',
    header: 'Duration',
    render: (row) => `${formatDate(row.startDate.toString(), 'dd MMM')} - ${formatDate(row.endDate.toString(), 'dd MMM yyyy')}`,
  },
  { key: 'totalDays', header: 'Days', sortable: true },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={statusColors[row.status] as 'pending' | 'approved' | 'rejected' | 'cancelled'}>
        {row.status}
      </Badge>
    ),
  },
]

export default function LeaveReportPage() {
  const [startDate, setStartDate] = React.useState('2024-01-01')
  const [endDate, setEndDate] = React.useState('2024-12-31')
  const [department, setDepartment] = React.useState('all')
  const [leaveType, setLeaveType] = React.useState('all')
  const [search, setSearch] = React.useState('')

  const filteredData = React.useMemo(() => {
    return mockData.filter((r) => {
      const dateMatch = r.startDate >= new Date(startDate) && r.endDate <= new Date(endDate)
      const deptMatch = department === 'all' || r.department === department
      const typeMatch = leaveType === 'all' || r.leaveType === leaveType
      const searchMatch = !search || r.employeeName.toLowerCase().includes(search.toLowerCase())
      return dateMatch && deptMatch && typeMatch && searchMatch
    })
  }, [startDate, endDate, department, leaveType, search])

  const totalDays = filteredData.reduce((s, r) => s + r.totalDays, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Leave Report</h2>
          <p className="text-sm text-slate-500">Leave utilization and history reports</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Leave Type</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                  <SelectItem value="SICK">Sick</SelectItem>
                  <SelectItem value="MATERNITY">Maternity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{filteredData.length}</p><p className="text-xs text-slate-500">Total Requests</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{totalDays}</p><p className="text-xs text-slate-500">Total Days Taken</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{filteredData.filter(r => r.status === 'APPROVED').length}</p><p className="text-xs text-slate-500">Approved</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{filteredData.filter(r => r.status === 'PENDING').length}</p><p className="text-xs text-slate-500">Pending</p></CardContent></Card>
      </div>

      <DataTable columns={columns} data={filteredData} keyField="id" searchValue={search} onSearch={setSearch} searchable={true} searchPlaceholder="Search employee..." />
    </div>
  )
}
