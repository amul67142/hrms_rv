'use client'

import * as React from 'react'
import { FileText, Download, Lock, Play, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
    key: 'paidDays',
    header: 'Paid Days',
    render: (row) => <span className="text-gray-300">{row.paidDays}</span>,
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
  const [data, setData] = React.useState<PayrollRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [locking, setLocking] = React.useState(false)

  const fetchPayroll = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, year, limit: '100' })
      const res = await fetch(`/api/payroll?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data || [])
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load payroll data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [month, year, toast])

  React.useEffect(() => {
    fetchPayroll()
  }, [fetchPayroll])

  const handleGenerateAll = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/payroll/bulk-generate/${month}/${year}`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Success', description: json.message || 'Payroll generated for all employees' })
        fetchPayroll()
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to generate payroll', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleLockMonth = async () => {
    setLocking(true)
    try {
      const res = await fetch(`/api/payroll/lock/${month}/${year}`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Locked', description: json.message || 'Payroll for this month has been locked' })
        fetchPayroll()
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to lock payroll', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setLocking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll</h2>
          <p className="text-sm text-gray-400 mt-1">Monthly payroll management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayroll} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={handleLockMonth} disabled={locking || data.length === 0}>
            {locking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Lock Month
          </Button>
          <Button onClick={handleGenerateAll} disabled={generating} style={{ background: '#8B5CF6' }} className="text-white">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {generating ? 'Generating...' : 'Generate Payroll'}
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

      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        loading={loading}
        searchable={false}
        emptyMessage={`No payroll records for ${getMonthName(parseInt(month))} ${year}. Click "Generate Payroll" to calculate salaries based on attendance.`}
      />
    </div>
  )
}
