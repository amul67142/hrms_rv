'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/core/utils'
import { Building2, MapPin, Phone, Mail, User } from 'lucide-react'
import type { PayrollItem, Employee, CompanySettings } from '@/types'
import { getMonthName } from '@/lib/core/utils'

interface SalarySlipPreviewProps {
  payrollItem: PayrollItem & { employee?: Employee }
  companySettings?: CompanySettings
}

export function SalarySlipPreview({ payrollItem, companySettings }: SalarySlipPreviewProps) {
  const { employee } = payrollItem

  return (
    <Card className="max-w-2xl mx-auto" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
      <CardContent className="p-6" style={{ color: '#FFFFFF' }}>
        {/* Header */}
        <div
          className="text-center pb-4 mb-4"
          style={{ borderBottomColor: '#2D2D2D', borderBottomWidth: '1px' }}
        >
          <h1 className="text-xl font-bold text-white">
            {companySettings?.companyName || 'Company Name'}
          </h1>
          <p className="text-sm text-gray-400">
            {companySettings?.companyAddress || 'Company Address'}
          </p>
          <p className="text-sm text-gray-400">
            PAN: {companySettings?.pan || 'N/A'} | TAN: {companySettings?.tan || 'N/A'}
          </p>
        </div>

        {/* Pay Period */}
        <div
          className="flex justify-between items-center mb-4 p-3 rounded-lg"
          style={{ background: '#262626' }}
        >
          <div>
            <p className="text-xs text-gray-400">Pay Period</p>
            <p className="text-sm font-semibold text-white">
              {getMonthName(payrollItem.month)} {payrollItem.year}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Pay Date</p>
            <p className="text-sm font-semibold text-white">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Employee Details */}
        <div
          className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-lg"
          style={{ borderColor: '#2D2D2D', borderWidth: '1px' }}
        >
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Employee Name</p>
            <p className="text-sm font-medium text-white">
              {employee ? `${employee.firstName} ${employee.lastName}` : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Employee Code</p>
            <p className="text-sm font-medium text-white">
              {employee?.employeeCode || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Department</p>
            <p className="text-sm font-medium text-white">
              {employee?.department || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Designation</p>
            <p className="text-sm font-medium text-white">
              {employee?.designation || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">UAN</p>
            <p className="text-sm font-medium text-white">
              {employee?.uanNumber || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Bank A/C</p>
            <p className="text-sm font-medium text-white">
              {employee?.accountNumber || 'N/A'}
            </p>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-6">
          {/* Earnings */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Basic Salary</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.basicSalary)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">HRA</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.hra)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Conveyance</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.conveyanceAllowance)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Medical</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.medicalAllowance)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Special Allowance</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.specialAllowance)}
                </span>
              </div>
              {payrollItem.bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bonus</span>
                  <span className="text-white font-medium">
                    {formatCurrency(payrollItem.bonus)}
                  </span>
                </div>
              )}
              <Separator style={{ background: '#2D2D2D' }} />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Gross Earnings</span>
                <span className="text-white">
                  {formatCurrency(payrollItem.grossSalary)}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Deductions</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">PF</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.pfDeduction)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">ESI</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.esiDeduction)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Professional Tax</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.professionalTax)}
                </span>
              </div>
              {(payrollItem.unpaidLeaveDeduction ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Leave Deduction</span>
                  <span className="text-white font-medium">
                    {formatCurrency(payrollItem.unpaidLeaveDeduction ?? 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TDS</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.tdsDeduction)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Other Deductions</span>
                <span className="text-white font-medium">
                  {formatCurrency(payrollItem.otherDeduction)}
                </span>
              </div>
              <Separator style={{ background: '#2D2D2D' }} />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Total Deductions</span>
                <span className="text-white">
                  {formatCurrency(payrollItem.totalDeduction)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div
          className="mt-6 p-4 rounded-lg"
          style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3B82F6', borderWidth: '1px' }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Working Days</p>
              <p className="text-sm font-medium text-white">{payrollItem.paidDays} days</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Net Pay</p>
              <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                {formatCurrency(payrollItem.netSalary)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-6 pt-4 text-center"
          style={{ borderTopColor: '#2D2D2D', borderTopWidth: '1px' }}
        >
          <p className="text-xs text-gray-500">
            {companySettings?.footerText || 'This is a system-generated salary slip and does not require a signature.'}
          </p>
        </div>
      </CardContent>

      {/* Print override: white background for printing */}
      <style>{`
        @media print {
          .max-w-2xl.mx-auto {
            background: #FFFFFF !important;
            border-color: #E5E7EB !important;
            color: #000000 !important;
          }
          .max-w-2xl.mx-auto * {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .max-w-2xl.mx-auto [style*="background: #262626"] {
            background: #F9FAFB !important;
          }
          .max-w-2xl.mx-auto [style*="borderColor: '#2D2D2D'"] {
            border-color: #E5E7EB !important;
          }
        }
      `}</style>
    </Card>
  )
}
