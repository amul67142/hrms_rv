'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Lock, Play, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, getMonthName } from '@/lib/core/utils'
import Link from 'next/link'

interface PayrollItem {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowance: number
  grossSalary: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  otherDeduction: number
  totalDeduction: number
  netSalary: number
  paidDays: number
  status: string
}

const mockData: PayrollItem[] = [
  { id: '1', employeeId: '1', employeeCode: 'EMP001', employeeName: 'Rahul Sharma', basicSalary: 50000, hra: 15000, conveyanceAllowance: 2000, medicalAllowance: 5000, specialAllowance: 8000, otherAllowance: 3000, grossSalary: 83000, pfDeduction: 1800, esiDeduction: 0, professionalTax: 200, otherDeduction: 0, totalDeduction: 2000, netSalary: 81000, paidDays: 22, status: 'DRAFT' },
  { id: '2', employeeId: '2', employeeCode: 'EMP002', employeeName: 'Priya Patel', basicSalary: 60000, hra: 18000, conveyanceAllowance: 2000, medicalAllowance: 5000, specialAllowance: 10000, otherAllowance: 3000, grossSalary: 98000, pfDeduction: 1800, esiDeduction: 0, professionalTax: 200, otherDeduction: 0, totalDeduction: 2000, netSalary: 96000, paidDays: 22, status: 'DRAFT' },
]

export default function MonthlyPayrollPage() {
  const params = useParams()
  const { toast } = useToast()
  const month = Number(params.month)
  const year = Number(params.year)
  const [data, setData] = React.useState(mockData)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const handleGenerateAll = () => {
    setData(data.map(d => ({ ...d, status: 'CALCULATED' })))
    toast({ title: 'Generated', description: 'Payroll calculated for all employees' })
  }

  const handleLockMonth = () => {
    setData(data.map(d => ({ ...d, status: 'LOCKED' })))
    toast({ title: 'Locked', description: 'Payroll locked for the month' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/payroll">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">
            Payroll - {getMonthName(month)} {year}
          </h2>
          <p className="text-sm text-slate-500">Detailed payroll for the selected month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleLockMonth}>
            <Lock className="mr-2 h-4 w-4" />
            Lock Month
          </Button>
          <Button onClick={handleGenerateAll}>
            <Play className="mr-2 h-4 w-4" />
            Generate All
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Employees</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Gross</p><p className="text-2xl font-bold">{formatCurrency(data.reduce((s, d) => s + d.grossSalary, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Deductions</p><p className="text-2xl font-bold text-red-600">{formatCurrency(data.reduce((s, d) => s + d.totalDeduction, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Net</p><p className="text-2xl font-bold text-green-700">{formatCurrency(data.reduce((s, d) => s + d.netSalary, 0))}</p></CardContent></Card>
      </div>

      {/* Payroll Items */}
      <div className="space-y-4">
        {data.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{item.employeeName}</CardTitle>
                  <Badge variant="secondary">{item.employeeCode}</Badge>
                  <Badge variant={item.status === 'DRAFT' ? 'secondary' : item.status === 'CALCULATED' ? 'warning' : 'success'}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(editingId === item.id ? null : item.id)}>
                    {editingId === item.id ? 'Hide' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-slate-500">Basic</p><p className="text-sm font-medium">{formatCurrency(item.basicSalary)}</p></div>
                <div><p className="text-xs text-slate-500">HRA</p><p className="text-sm font-medium">{formatCurrency(item.hra)}</p></div>
                <div><p className="text-xs text-slate-500">Gross</p><p className="text-sm font-medium">{formatCurrency(item.grossSalary)}</p></div>
                <div><p className="text-xs text-slate-500">Net Pay</p><p className="text-lg font-bold text-green-700">{formatCurrency(item.netSalary)}</p></div>
              </div>
              {editingId === item.id && (
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Edit Salary Components</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['basicSalary', 'hra', 'conveyanceAllowance', 'medicalAllowance', 'specialAllowance', 'otherAllowance', 'pfDeduction', 'professionalTax'].map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                        <Input type="number" defaultValue={(item as unknown as Record<string, number>)[field]} className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm"><Save className="mr-2 h-4 w-4" />Save Changes</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
