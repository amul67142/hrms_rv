'use client'

import * as React from 'react'
import { FileText, Download, Lock, Unlock, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/data-table'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, getMonthName } from '@/lib/core/utils'
import type { PayrollItem, PayrollStatus, Employee } from '@/types'
import Link from 'next/link'

const statusColors: Record<PayrollStatus, string> = {
  DRAFT: 'secondary',
  CALCULATED: 'warning',
  APPROVED: 'info',
  LOCKED: 'default',
  PAID: 'success',
}

interface PayrollRow extends PayrollItem {
  employee: Employee
}

const mockPayroll: PayrollRow[] = [
  { id: '1', employeeId: '1', month: 4, year: 2024, basicSalary: 50000, hra: 15000, conveyanceAllowance: 2000, medicalAllowance: 5000, specialAllowance: 8000, otherAllowance: 3000, bonus: 0, incentives: 0, grossSalary: 83000, pfDeduction: 1800, esiDeduction: 0, professionalTax: 200, tdsDeduction: 0, otherDeduction: 0, totalDeduction: 2000, netSalary: 81000, paidDays: 22, status: 'PAID', createdAt: new Date(), updatedAt: new Date(), employee: { id: '1', employeeCode: 'EMP001', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@example.com', department: 'Engineering', designation: 'Software Engineer', joiningDate: new Date(), employmentType: 'FULL_TIME', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } },
  { id: '2', employeeId: '2', month: 4, year: 2024, basicSalary: 60000, hra: 18000, conveyanceAllowance: 2000, medicalAllowance: 5000, specialAllowance: 10000, otherAllowance: 3000, bonus: 0, incentives: 0, grossSalary: 98000, pfDeduction: 1800, esiDeduction: 0, professionalTax: 200, tdsDeduction: 0, otherDeduction: 0, totalDeduction: 2000, netSalary: 96000, paidDays: 22, status: 'CALCULATED', createdAt: new Date(), updatedAt: new Date(), employee: { id: '2', employeeCode: 'EMP002', firstName: 'Priya', lastName: 'Patel', email: 'priya@example.com', department: 'Marketing', designation: 'Marketing Manager', joiningDate: new Date(), employmentType: 'FULL_TIME', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } },
  { id: '3', employeeId: '3', month: 4, year: 2024, basicSalary: 40000, hra: 12000, conveyanceAllowance: 2000, medicalAllowance: 3000, specialAllowance: 6000, otherAllowance: 2000, bonus: 0, incentives: 0, grossSalary: 65000, pfDeduction: 1800, esiDeduction: 0, professionalTax: 200, tdsDeduction: 0, otherDeduction: 0, totalDeduction: 2000, netSalary: 63000, paidDays: 22, status: 'DRAFT', createdAt: new Date(), updatedAt: new Date(), employee: { id: '3', employeeCode: 'EMP003', firstName: 'Amit', lastName: 'Singh', email: 'amit@example.com', department: 'Finance', designation: 'Accountant', joiningDate: new Date(), employmentType: 'FULL_TIME', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } },
]

const columns: Column<PayrollRow>[] = [
  {
    key: 'employee',
    header: 'Employee',
    render: (row) => (
      <div>
        <p className="font-medium text-white">{row.employee.firstName} {row.employee.lastName}</p>
        <p className="text-xs text-gray-400">{row.employee.employeeCode}</p>
      </div>
    ),
  },
  {
    key: 'basicSalary',
    header: 'Basic',
    render: (row) => formatCurrency(row.basicSalary),
  },
  {
    key: 'grossSalary',
    header: 'Gross',
    render: (row) => formatCurrency(row.grossSalary),
  },
  {
    key: 'totalDeduction',
    header: 'Deductions',
    render: (row) => <span className="text-red-400">{formatCurrency(row.totalDeduction)}</span>,
  },
  {
    key: 'netSalary',
    header: 'Net Salary',
    render: (row) => <span className="font-semibold text-white">{formatCurrency(row.netSalary)}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={statusColors[row.status] as 'secondary' | 'warning' | 'info' | 'pending' | 'success'}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    className: 'w-32',
    render: (row) => (
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
          <Link href={`/admin/salary-slips/${row.id}`}>
            <FileText className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]

export default function PayrollPage() {
  const { toast } = useToast()
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const [month, setMonth] = React.useState(String(currentMonth))
  const [year, setYear] = React.useState(String(currentYear))
  const [data, setData] = React.useState(mockPayroll)

  const handleGenerateAll = () => {
    setData(mockPayroll.map(p => ({ ...p, status: 'CALCULATED' as PayrollStatus })))
    toast({ title: 'Success', description: 'Payroll generated for all employees' })
  }

  const handleLockMonth = () => {
    setData(mockPayroll.map(p => ({ ...p, status: 'LOCKED' as PayrollStatus })))
    toast({ title: 'Locked', description: 'Payroll for this month has been locked' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll</h2>
          <p className="text-sm text-gray-400 mt-1">Monthly payroll management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleLockMonth}>
            <Lock className="mr-2 h-4 w-4" />
            Lock Month
          </Button>
          <Button onClick={handleGenerateAll}>
            <Play className="mr-2 h-4 w-4" />
            Generate Payroll
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Total Employees</p>
            <p className="text-2xl font-bold text-white">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Total Gross</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(data.reduce((s, p) => s + p.grossSalary, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Total Deductions</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(data.reduce((s, p) => s + p.totalDeduction, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Total Net</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(data.reduce((s, p) => s + p.netSalary, 0))}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable columns={columns} data={data} keyField="id" searchable={false} />
    </div>
  )
}
