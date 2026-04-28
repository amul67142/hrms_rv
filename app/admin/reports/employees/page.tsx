'use client'

import * as React from 'react'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table'
import type { Column } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDate } from '@/lib/core/utils'
import { useToast } from '@/components/ui/use-toast'
import type { EmployeeStatus } from '@/types'

interface EmployeeRecord {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  designation: string
  joiningDate: Date | string
  status: EmployeeStatus
  employmentType: string
}

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  RESIGNED: 'warning',
  TERMINATED: 'destructive',
  ON_LEAVE: 'info',
}

export default function EmployeeReportPage() {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [department, setDepartment] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const [loading, setLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)
  const [data, setData] = React.useState<EmployeeRecord[]>([])
  const [departments, setDepartments] = React.useState<string[]>([])
  const [summary, setSummary] = React.useState<any>({})
  const [page, setPage] = React.useState(1)

  const columns: Column<EmployeeRecord>[] = [
    { key: 'employeeCode', header: 'Code', sortable: true, className: 'font-mono text-xs text-gray-400' },
    {
      key: 'name', header: 'Name', sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'department', header: 'Department', sortable: true, render: (row) => <span className="text-gray-300">{row.department}</span> },
    { key: 'designation', header: 'Designation', sortable: true, render: (row) => <span className="text-gray-300">{row.designation}</span> },
    { key: 'employmentType', header: 'Type', sortable: true, render: (row) => <span className="text-gray-400 text-sm">{row.employmentType.replace('_', ' ')}</span> },
    {
      key: 'joiningDate', header: 'Joining Date', sortable: true,
      render: (row) => <span className="text-gray-400 text-sm">{formatDate(new Date(row.joiningDate).toISOString(), 'dd MMM yyyy')}</span>,
    },
    {
      key: 'status', header: 'Status', sortable: true,
      render: (row) => (
        <Badge className="text-white text-xs" variant={(statusColors[row.status] || 'secondary') as any}>
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
  ]

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (department !== 'all') params.set('department', department)
      if (status !== 'all') params.set('status', status)

      const res = await fetch(`/api/reports/employees?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setSummary(result.summary || {})
        // Extract unique departments from data
        const depts = [...new Set(result.data.map((e: any) => e.Department).filter(Boolean))]
        setDepartments(depts as string[])
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [department, status, toast])

  React.useEffect(() => { fetchData() }, [fetchData])

  const filteredData = React.useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter((r: any) =>
      r['First Name']?.toLowerCase().includes(q) ||
      r['Last Name']?.toLowerCase().includes(q) ||
      r['Email']?.toLowerCase().includes(q) ||
      r['Employee Code']?.toLowerCase().includes(q)
    )
  }, [data, search])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: 'excel' })
      if (department !== 'all') params.set('department', department)
      if (status !== 'all') params.set('status', status)

      const res = await fetch(`/api/reports/employees?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee_master_report_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast({ title: 'Success', description: 'Report exported successfully' })
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const total = summary.totalEmployees || filteredData.length || 0
  const active = summary.byStatus?.ACTIVE || filteredData.filter((r: any) => r.Status === 'ACTIVE').length || 0
  const resigned = (summary.byStatus?.RESIGNED || 0) + (summary.byStatus?.TERMINATED || 0) + (summary.byStatus?.INACTIVE || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Employee Master Report</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Complete employee database export</p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card className="border-0" style={{ background: '#1A1A1A' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search name, email, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs border-white/10 bg-white/5 text-white"
            />
            <Select value={department} onValueChange={(v) => { setDepartment(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="RESIGNED">Resigned</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Total Employees</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>{active}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Active</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{resigned}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Inactive / Resigned</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{departments.length}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Departments</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        keyField="id"
        loading={loading}
        searchPlaceholder="Search name, email, code..."
        searchValue={search}
        onSearch={setSearch}
        searchable={false}
        emptyMessage="No employees found"
      />
    </div>
  )
}
