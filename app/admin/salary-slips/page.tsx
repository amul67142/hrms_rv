'use client'

import * as React from 'react'
import { Download, FileText, Send, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, getMonthName } from '@/lib/core/utils'
import Link from 'next/link'

interface SalarySlip {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  department: string
  month: number
  year: number
  netSalary: number
  status: string
  basicSalary?: number
  grossSalary?: number
}

const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

export default function SalarySlipsPage() {
  const { toast } = useToast()
  const [month, setMonth] = React.useState(String(currentMonth))
  const [year, setYear] = React.useState(String(currentYear))
  const [employeeFilter, setEmployeeFilter] = React.useState('all')
  const [data, setData] = React.useState<SalarySlip[]>([])
  const [employees, setEmployees] = React.useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = React.useState(true)
  const [downloading, setDownloading] = React.useState<string | null>(null)

  const years = [currentYear, currentYear - 1, currentYear - 2]

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [slipsRes, empRes] = await Promise.all([
        fetch(`/api/payroll?month=${month}&year=${year}`),
        fetch('/api/employees?limit=100')
      ])

      const slipsJson = await slipsRes.json()
      const empJson = await empRes.json()

      if (slipsJson.success) {
        setData(slipsJson.data.map((s: any) => ({
          id: s.id,
          employeeId: s.employeeId,
          employeeCode: s.employee?.employeeCode || '-',
          employeeName: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : '-',
          department: s.employee?.department || '-',
          month: s.month,
          year: s.year,
          netSalary: Number(s.netSalary),
          status: s.status,
          basicSalary: Number(s.basicSalary),
          grossSalary: Number(s.grossSalary)
        })))
      }

      if (empJson.success) {
        setEmployees(empJson.data.map((e: any) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`
        })))
      }
    } catch (error) {
      console.error('Failed to fetch salary slips:', error)
      toast({ title: 'Error', description: 'Failed to load salary slips', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [month, year, toast])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredData = data.filter((slip) => {
    const empMatch = employeeFilter === 'all' || slip.employeeId === employeeFilter
    return empMatch
  })

  const handleDownload = async (id: string) => {
    try {
      setDownloading(id)
      const res = await fetch(`/api/salary-slips/${id}?format=pdf`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Salary_Slip_${getMonthName(parseInt(month))}_${year}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Salary slip downloaded' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to download salary slip', variant: 'destructive' })
    } finally {
      setDownloading(null)
    }
  }

  const handleBulkDownload = async () => {
    if (filteredData.length === 0) return
    toast({ title: 'Downloading', description: `Downloading ${filteredData.length} salary slips...` })
    for (const slip of filteredData) {
      await handleDownload(slip.id)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Salary Slips</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Generate and download salary slips</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleBulkDownload}
            disabled={filteredData.length === 0 || loading}
            style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}
          >
            <Package className="mr-2 h-4 w-4" />
            Download All ({filteredData.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[150px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-[200px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}>
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Slips Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      ) : filteredData.length === 0 ? (
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: '#6B7280' }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>No salary slips found for the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((slip) => (
            <Card key={slip.id} style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{slip.employeeName}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{slip.employeeCode}</p>
                  </div>
                  <Badge variant={slip.status === 'PAID' ? 'success' : slip.status === 'Generated' ? 'info' : 'secondary'}>
                    {slip.status}
                  </Badge>
                </div>
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#9CA3AF' }}>Month</span>
                    <span className="font-medium text-white">{getMonthName(slip.month)} {slip.year}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#9CA3AF' }}>Department</span>
                    <span className="font-medium text-white">{slip.department}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#9CA3AF' }}>Net Salary</span>
                    <span className="font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(slip.netSalary)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}
                    asChild
                  >
                    <Link href={`/admin/salary-slips/${slip.id}`}>View</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(slip.id)}
                    disabled={downloading === slip.id}
                  >
                    {downloading === slip.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
