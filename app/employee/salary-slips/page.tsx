'use client'

import * as React from 'react'
import { Download, FileText, DollarSign, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/core/utils'
import type { PayrollStatus } from '@/types'

interface SalarySlip {
  id: string
  month: number
  year: number
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
  status: PayrollStatus
}

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const statusColors: Record<PayrollStatus, 'success' | 'info' | 'warning' | 'pending' | 'secondary'> = {
  DRAFT: 'secondary',
  CALCULATED: 'warning',
  APPROVED: 'info',
  LOCKED: 'pending',
  PAID: 'success',
}

export default function SalarySlipsPage() {
  const { toast } = useToast()
  const [slips, setSlips] = React.useState<SalarySlip[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSlip, setSelectedSlip] = React.useState<SalarySlip | null>(null)
  const [filterYear, setFilterYear] = React.useState(String(new Date().getFullYear()))
  const [filterMonth, setFilterMonth] = React.useState('all')
  const [downloading, setDownloading] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchSlips = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/salary-slips/me')
        const json = await res.json()
        if (json.success) {
          setSlips(json.data || [])
          if (json.data?.length > 0) {
            setSelectedSlip(json.data[0])
            setFilterYear(String(json.data[0].year))
          }
        } else {
          toast({ title: 'Error', description: json.error || 'Failed to load salary slips', variant: 'destructive' })
        }
      } catch (error) {
        console.error('Failed to fetch salary slips:', error)
        toast({ title: 'Error', description: 'Failed to load salary slips', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchSlips()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive available years from data
  const years = React.useMemo(() => {
    const uniqueYears = [...new Set(slips.map((s) => String(s.year)))].sort((a, b) => +b - +a)
    return uniqueYears.length > 0 ? uniqueYears : [String(new Date().getFullYear())]
  }, [slips])

  const filteredSlips = React.useMemo(() => {
    return slips.filter((s) => {
      const yearMatch = String(s.year) === filterYear
      const monthMatch = filterMonth === 'all' || s.month === parseInt(filterMonth)
      return yearMatch && monthMatch
    })
  }, [slips, filterYear, filterMonth])

  // Keep selectedSlip in sync with filter
  React.useEffect(() => {
    if (filteredSlips.length > 0) {
      const stillVisible = filteredSlips.find((s) => s.id === selectedSlip?.id)
      if (!stillVisible) setSelectedSlip(filteredSlips[0])
    } else {
      setSelectedSlip(null)
    }
  }, [filteredSlips, selectedSlip?.id])

  const handleDownload = async (slip: SalarySlip) => {
    setDownloading(slip.id)
    try {
      const res = await fetch(`/api/salary-slips/${slip.id}?format=pdf`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Salary_Slip_${monthNames[slip.month]}_${slip.year}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Download failed')
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to download salary slip', variant: 'destructive' })
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadAll = async () => {
    for (const slip of filteredSlips) {
      await handleDownload(slip)
      await new Promise((r) => setTimeout(r, 400))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Salary Slips</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>View and download your salary slips</p>
        </div>
        {filteredSlips.length > 1 && (
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={!!downloading}
            style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}
          >
            <Package className="mr-2 h-4 w-4" />
            {downloading ? 'Downloading…' : `Download All (${filteredSlips.length})`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filterYear}
          onValueChange={(v) => { setFilterYear(v); setSelectedSlip(null) }}
        >
          <SelectTrigger className="w-[140px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterMonth}
          onValueChange={(v) => { setFilterMonth(v); setSelectedSlip(null) }}
        >
          <SelectTrigger className="w-[160px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {monthNames.slice(1).map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm" style={{ color: '#6B7280' }}>
          {filteredSlips.length} record{filteredSlips.length !== 1 ? 's' : ''}
        </span>
      </div>

      {slips.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
        >
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-white" />
          <p className="text-sm font-medium text-white">No salary slips yet</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Your salary slips will appear here once payroll is processed
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slip List */}
          <div className="space-y-2">
            {filteredSlips.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl border"
                style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
              >
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30 text-white" />
                <p className="text-sm" style={{ color: '#6B7280' }}>No slips for this period</p>
              </div>
            ) : (
              filteredSlips.map((slip) => (
                <Card
                  key={slip.id}
                  className="cursor-pointer transition-all"
                  style={{
                    background: '#1A1A1A',
                    borderColor: selectedSlip?.id === slip.id ? '#8B5CF6' : '#2D2D2D',
                    borderWidth: selectedSlip?.id === slip.id ? '2px' : '1px',
                  }}
                  onClick={() => setSelectedSlip(slip)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">
                          {monthNames[slip.month]} {slip.year}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                          Net: {formatCurrency(slip.netSalary)}
                        </p>
                      </div>
                      <Badge variant={statusColors[slip.status]}>{slip.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Slip Detail */}
          <Card className="lg:col-span-2" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <CardHeader style={{ borderBottom: '1px solid #2D2D2D' }}>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="text-white">
                  {selectedSlip
                    ? `Salary Slip — ${monthNames[selectedSlip.month]} ${selectedSlip.year}`
                    : 'Salary Slip'}
                </span>
                {selectedSlip && (
                  <Button
                    size="sm"
                    onClick={() => handleDownload(selectedSlip)}
                    disabled={!!downloading}
                    style={{ background: '#8B5CF6' }}
                  >
                    {downloading === selectedSlip.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {selectedSlip ? (
                <div className="space-y-6">
                  {/* Earnings */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#4ADE80' }}>
                      <DollarSign className="h-3.5 w-3.5" />
                      Earnings
                    </h4>
                    <div className="space-y-0">
                      {[
                        { label: 'Basic Salary', value: selectedSlip.basicSalary },
                        { label: 'House Rent Allowance (HRA)', value: selectedSlip.hra },
                        { label: 'Conveyance Allowance', value: selectedSlip.conveyanceAllowance },
                        { label: 'Medical Allowance', value: selectedSlip.medicalAllowance },
                        { label: 'Special Allowance', value: selectedSlip.specialAllowance },
                        { label: 'Other Allowance', value: selectedSlip.otherAllowance },
                      ]
                        .filter((item) => item.value > 0)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between items-center py-2 border-b"
                            style={{ borderColor: '#262626' }}
                          >
                            <span className="text-sm" style={{ color: '#D1D5DB' }}>{item.label}</span>
                            <span className="text-sm font-medium text-white">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      <div
                        className="flex justify-between items-center py-2.5 px-3 rounded mt-2"
                        style={{ background: 'rgba(74,222,128,0.1)' }}
                      >
                        <span className="text-sm font-semibold" style={{ color: '#4ADE80' }}>Gross Salary</span>
                        <span className="text-sm font-bold" style={{ color: '#4ADE80' }}>{formatCurrency(selectedSlip.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#F87171' }}>
                      <DollarSign className="h-3.5 w-3.5" />
                      Deductions
                    </h4>
                    <div className="space-y-0">
                      {[
                        { label: 'Provident Fund (PF)', value: selectedSlip.pfDeduction },
                        { label: 'Employee State Insurance (ESI)', value: selectedSlip.esiDeduction },
                        { label: 'Professional Tax', value: selectedSlip.professionalTax },
                        { label: 'Other Deductions', value: selectedSlip.otherDeduction },
                      ]
                        .filter((item) => item.value > 0)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between items-center py-2 border-b"
                            style={{ borderColor: '#262626' }}
                          >
                            <span className="text-sm" style={{ color: '#D1D5DB' }}>{item.label}</span>
                            <span className="text-sm font-medium" style={{ color: '#F87171' }}>{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      <div
                        className="flex justify-between items-center py-2.5 px-3 rounded mt-2"
                        style={{ background: 'rgba(239,68,68,0.1)' }}
                      >
                        <span className="text-sm font-semibold" style={{ color: '#FCA5A5' }}>Total Deductions</span>
                        <span className="text-sm font-bold" style={{ color: '#FCA5A5' }}>{formatCurrency(selectedSlip.totalDeduction)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay */}
                  <div
                    className="flex justify-between items-center p-4 rounded-lg border"
                    style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}
                  >
                    <div>
                      <span className="text-base font-bold text-white">Net Pay</span>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Paid Days: {selectedSlip.paidDays?.toFixed(1)}</p>
                    </div>
                    <span className="text-xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(selectedSlip.netSalary)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16" style={{ color: '#6B7280' }}>
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a salary slip to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
