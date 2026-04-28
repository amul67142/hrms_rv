'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SalarySlipPreview } from '@/components/salary-slip-preview'
import Link from 'next/link'
import type { PayrollItem, Employee } from '@/types'

const mockPayroll: PayrollItem & { employee?: Employee } = {
  id: '1',
  employeeId: '1',
  month: 4,
  year: 2024,
  basicSalary: 50000,
  hra: 15000,
  conveyanceAllowance: 2000,
  medicalAllowance: 5000,
  specialAllowance: 8000,
  otherAllowance: 3000,
  bonus: 0,
  incentives: 0,
  grossSalary: 83000,
  pfDeduction: 1800,
  esiDeduction: 0,
  professionalTax: 200,
  tdsDeduction: 0,
  otherDeduction: 0,
  totalDeduction: 2000,
  netSalary: 81000,
  paidDays: 22,
  status: 'PAID',
  createdAt: new Date(),
  updatedAt: new Date(),
  employee: {
    id: '1',
    employeeCode: 'EMP001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@example.com',
    department: 'Engineering',
    designation: 'Software Engineer',
    joiningDate: new Date('2023-01-15'),
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    uanNumber: '123456789012',
    accountNumber: '1234567890',
  },
}

export default function SalarySlipDetailPage() {
  const params = useParams()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/salary-slips">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Salary Slip</h2>
            <p className="text-sm text-slate-500">#{params.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Send to Employee
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="no-print flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <SalarySlipPreview payrollItem={mockPayroll} />
    </div>
  )
}
