'use client'

import * as React from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { formatCurrency, getMonthName } from '@/lib/core/utils'

interface PayrollRecord {
  id: string
  employeeCode: string
  employeeName: string
  department: string
  month: number
  year: number
  basicSalary: number
  grossSalary: number
  totalDeduction: number
  netSalary: number
}

const mockData: PayrollRecord[] = [
  { id: '1', employeeCode: 'EMP001', employeeName: 'Rahul Sharma', department: 'Engineering', month: 4, year: 2024, basicSalary: 50000, grossSalary: 83000, totalDeduction: 2000, netSalary: 81000 },
  { id: '2', employeeCode: 'EMP002', employeeName: 'Priya Patel', department: 'Marketing', month: 4, year: 2024, basicSalary: 60000, grossSalary: 98000, totalDeduction: 2000, netSalary: 96000 },
  { id: '3', employeeCode: 'EMP003', employeeName: 'Amit Singh', department: 'Finance', month: 4, year: 2024, basicSalary: 40000, grossSalary: 65000, totalDeduction: 2000, netSalary: 63000 },
]

const columns: Column<PayrollRecord>[] = [
  { key: 'employeeCode', header: 'Employee Code', sortable: true },
  { key: 'employeeName', header: 'Employee Name', sortable: true },
  { key: 'department', header: 'Department', sortable: true },
  { key: 'month', header: 'Period', sortable: true, render: (row) => `${getMonthName(row.month)} ${row.year}` },
  { key: 'basicSalary', header: 'Basic', render: (row) => formatCurrency(row.basicSalary) },
  { key: 'grossSalary', header: 'Gross', render: (row) => formatCurrency(row.grossSalary) },
  { key: 'totalDeduction', header: 'Deductions', render: (row) => formatCurrency(row.totalDeduction) },
  { key: 'netSalary', header: 'Net Pay', render: (row) => formatCurrency(row.netSalary) },
]

export default function PayrollReportPage() {
  const [month, setMonth] = React.useState('4')
  const [year, setYear] = React.useState('2024')
  const [department, setDepartment] = React.useState('all')

  const filteredData = mockData.filter((r) => {
    const monthMatch = String(r.month) === month
    const yearMatch = String(r.year) === year
    const deptMatch = department === 'all' || r.department === department
    return monthMatch && yearMatch && deptMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Payroll Report</h2>
          <p className="text-sm text-slate-500"> Payroll summaries and salary reports</p>
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
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2023, 2022].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{filteredData.length}</p><p className="text-xs text-slate-500">Employees</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatCurrency(filteredData.reduce((s, r) => s + r.grossSalary, 0))}</p><p className="text-xs text-slate-500">Total Gross</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{formatCurrency(filteredData.reduce((s, r) => s + r.totalDeduction, 0))}</p><p className="text-xs text-slate-500">Total Deductions</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-700">{formatCurrency(filteredData.reduce((s, r) => s + r.netSalary, 0))}</p><p className="text-xs text-slate-500">Total Net Pay</p></CardContent></Card>
      </div>

      <DataTable columns={columns} data={filteredData} keyField="id" searchable={false} />
    </div>
  )
}
