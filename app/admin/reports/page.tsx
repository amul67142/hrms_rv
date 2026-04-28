'use client'

import * as React from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  BarChart3,
  Calendar,
  Wallet,
  Users,
  Wrench,
  GraduationCap,
  X,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/data-table'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/core/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = 'excel' | 'pdf'

interface Department {
  id: string
  name: string
  code: string
}

interface LeaveType {
  value: string
  label: string
}

type LeaveStatus = 'APPROVED' | 'PENDING' | 'REJECTED'
type EmployeeStatus = 'ACTIVE' | 'INACTIVE'
type PayrollStatus = 'PROCESSED' | 'PENDING' | 'FAILED'

// ─── Shared column definitions ────────────────────────────────────────────────

const attendanceColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Code', header: 'Employee Code', sortable: true },
  { key: 'Employee Name', header: 'Employee Name', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Present', header: 'Present', sortable: true },
  { key: 'Absent', header: 'Absent', sortable: true },
  { key: 'Half Day', header: 'Half Day', sortable: true },
  { key: 'Week Off', header: 'Week Off', sortable: true },
  { key: 'Holiday', header: 'Holiday', sortable: true },
  { key: 'Leave', header: 'Leave', sortable: true },
  { key: 'Total Working Days', header: 'Total Days', sortable: true },
]

const leaveColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Code', header: 'Emp Code', sortable: true },
  { key: 'Employee Name', header: 'Employee Name', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Leave Type', header: 'Leave Type', sortable: true },
  { key: 'Start Date', header: 'Start Date', sortable: true },
  { key: 'End Date', header: 'End Date', sortable: true },
  { key: 'Total Days', header: 'Days', sortable: true },
  {
    key: 'Status',
    header: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row['Status'] || '')
      const color =
        s === 'APPROVED'
          ? '#22C55E'
          : s === 'PENDING'
          ? '#F59E0B'
          : s === 'REJECTED'
          ? '#EF4444'
          : '#9CA3AF'
      return <Badge style={{ background: color, color: '#fff', border: 'none' }}>{s}</Badge>
    },
  },
]

const payrollColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Code', header: 'Emp Code', sortable: true },
  { key: 'Employee Name', header: 'Employee Name', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Month', header: 'Month', sortable: true },
  { key: 'Gross Salary', header: 'Gross (₹)', sortable: true },
  { key: 'Total Deduction', header: 'Deductions (₹)', sortable: true },
  { key: 'Net Salary', header: 'Net Salary (₹)', sortable: true },
  {
    key: 'Status',
    header: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row['Status'] || '')
      const color =
        s === 'PROCESSED'
          ? '#22C55E'
          : s === 'PENDING'
          ? '#F59E0B'
          : '#EF4444'
      return <Badge style={{ background: color, color: '#fff', border: 'none' }}>{s}</Badge>
    },
  },
]

const employeeColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Code', header: 'Emp Code', sortable: true },
  { key: 'First Name', header: 'First Name', sortable: true },
  { key: 'Last Name', header: 'Last Name', sortable: true },
  { key: 'Email', header: 'Email', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Designation', header: 'Designation', sortable: true },
  { key: 'Employment Type', header: 'Type', sortable: true },
  {
    key: 'Status',
    header: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row['Status'] || '')
      const color = s === 'ACTIVE' ? '#22C55E' : s === 'INACTIVE' ? '#6B7280' : '#9CA3AF'
      return <Badge style={{ background: color, color: '#fff', border: 'none' }}>{s}</Badge>
    },
  },
]

const toolColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Name', header: 'Employee', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Tool Name', header: 'Tool Name', sortable: true },
  { key: 'Serial Number', header: 'Serial No.', sortable: true },
  { key: 'Assigned Date', header: 'Assigned Date', sortable: true },
  {
    key: 'Status',
    header: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row['Status'] || '')
      const color =
        s === 'ASSIGNED'
          ? '#22C55E'
          : s === 'RETURNED'
          ? '#6B7280'
          : s === 'DAMAGED'
          ? '#EF4444'
          : '#F59E0B'
      return <Badge style={{ background: color, color: '#fff', border: 'none' }}>{s}</Badge>
    },
  },
]

const learningColumns: Column<Record<string, unknown>>[] = [
  { key: 'Employee Name', header: 'Employee', sortable: true },
  { key: 'Department', header: 'Department', sortable: true },
  { key: 'Course Name', header: 'Course Name', sortable: true },
  { key: 'Request Date', header: 'Requested On', sortable: true },
  {
    key: 'Status',
    header: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row['Status'] || '')
      const color =
        s === 'APPROVED'
          ? '#22C55E'
          : s === 'PENDING'
          ? '#F59E0B'
          : s === 'REJECTED'
          ? '#EF4444'
          : s === 'COMPLETED'
          ? '#3B82F6'
          : '#9CA3AF'
      return <Badge style={{ background: color, color: '#fff', border: 'none' }}>{s}</Badge>
    },
  },
  { key: 'Remarks', header: 'Remarks', sortable: false },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => ({
  value: String(y),
  label: String(y),
}))

const STATUSES_LEAVE: { value: LeaveStatus; label: string }[] = [
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
]

const STATUSES_EMPLOYEE: { value: EmployeeStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

// ─── PDF Window Renderer ──────────────────────────────────────────────────────

function buildPrintWindow(title: string, headers: string[], rows: Record<string, unknown>[]): void {
  const tableRows = rows
    .slice(0, 200)
    .map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '-')}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #8B5CF6; color: #fff; padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .footer { margin-top: 16px; font-size: 11px; color: #999; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated on ${new Date().toLocaleDateString('en-IN')} — ${rows.length} record${rows.length !== 1 ? 's' : ''}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="footer">HRMS Portal — Confidential</p>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

// ─── Format selector pill ─────────────────────────────────────────────────────

interface FormatPillProps {
  value: ExportFormat
  onChange: (v: ExportFormat) => void
}

function FormatPill({ value, onChange }: FormatPillProps) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5 gap-0.5"
      style={{ background: '#262626', border: '1px solid #2D2D2D' }}
    >
      {(['excel', 'pdf'] as ExportFormat[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: value === f ? '#8B5CF6' : 'transparent',
            color: value === f ? '#fff' : '#9CA3AF',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {f === 'excel' ? (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ─── Filter Card ──────────────────────────────────────────────────────────────

interface FilterCardProps {
  title: string
  description: string
  children: React.ReactNode
  onExport: () => void
  onPreview: () => void
  exporting: boolean
  previewing: boolean
  format: ExportFormat
  onFormatChange: (f: ExportFormat) => void
}

function FilterCard({
  title,
  description,
  children,
  onExport,
  onPreview,
  exporting,
  previewing,
  format,
  onFormatChange,
}: FilterCardProps) {
  return (
    <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-white text-base">{title}</CardTitle>
            <CardDescription className="text-[#9CA3AF] text-xs mt-1">{description}</CardDescription>
          </div>
          <FormatPill value={format} onChange={onFormatChange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          {children}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              disabled={previewing}
              style={{ borderColor: '#2D2D2D', color: '#9CA3AF', background: 'transparent' }}
            >
              {previewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-1.5">Preview</span>
            </Button>
            <Button
              size="sm"
              onClick={onExport}
              disabled={exporting}
              style={{ background: '#8B5CF6', borderColor: '#8B5CF6', color: '#fff' }}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-1.5">Export {format.toUpperCase()}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-xl border"
      style={{ borderColor: '#2D2D2D', background: '#1A1A1A' }}
    >
      <FileSpreadsheet className="h-10 w-10 mb-3" style={{ color: '#4B5563' }} />
      <p className="text-sm" style={{ color: '#6B7280' }}>
        {message}
      </p>
    </div>
  )
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

interface SummaryProps {
  items: { label: string; value: string | number; color?: string }[]
}

function SummaryStrip({ items }: SummaryProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: '#262626', border: '1px solid #2D2D2D' }}
        >
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {item.label}
          </span>
          <span className="text-sm font-semibold" style={{ color: item.color ?? '#fff' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Preview Dialog ───────────────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean
  onClose: () => void
  title: string
  columns: Column<Record<string, unknown>>[]
  data: Record<string, unknown>[]
  loading: boolean
}

function PreviewDialog({ open, onClose, title, columns, data, loading }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b" style={{ borderColor: '#2D2D2D' }}>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-base">{title} — Preview</DialogTitle>
            <button
              onClick={onClose}
              className="rounded p-1 transition-colors"
              style={{ color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
            </div>
          ) : data.length === 0 ? (
            <EmptyState message="No records match the selected filters." />
          ) : (
            <DataTable
              columns={columns}
              data={data}
              keyField={Object.keys(data[0] ?? {})[0] ?? 'key' as never}
              searchable={true}
              searchPlaceholder="Search records..."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Attendance Report ────────────────────────────────────────────────────────

function AttendanceReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [month, setMonth] = React.useState(String(currentMonth))
  const [year, setYear] = React.useState(String(currentYear))
  const [department, setDepartment] = React.useState('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
  }, [])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/attendance?${params}`)
      const json = await res.json()
      setPreviewData(json.success ? json.data ?? [] : [])
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load preview data', variant: 'destructive' })
    } finally {
      setPreviewLoading(false)
      setPreviewing(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: format })
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/attendance?${params}`)
      if (format === 'excel') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance_report_${year}_${month}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Attendance report exported successfully' })
      } else {
        const json = await res.json()
        if (json.success) {
          const rows: Record<string, unknown>[] = json.data ?? []
          buildPrintWindow('Attendance Report', attendanceColumns.map((c) => String(c.key)), rows)
        }
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Attendance Report"
        description="Monthly attendance summary per employee with present, absent, leave counts."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Month</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '140px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Year</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '110px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Attendance Report"
        columns={attendanceColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Leave Report ─────────────────────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = [
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'CASUAL_LEAVE', label: 'Casual Leave' },
  { value: 'EARNED_LEAVE', label: 'Earned Leave' },
  { value: 'MATERNITY_LEAVE', label: 'Maternity Leave' },
  { value: 'PATERNITY_LEAVE', label: 'Paternity Leave' },
  { value: 'BEREAVEMENT_LEAVE', label: 'Bereavement Leave' },
  { value: 'UNPAID_LEAVE', label: 'Unpaid Leave' },
]

function LeaveReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [leaveType, setLeaveType] = React.useState('all')
  const [status, setStatus] = React.useState<LeaveStatus | 'all'>('all')
  const [department, setDepartment] = React.useState('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
  }, [])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (leaveType !== 'all') params.set('leaveType', leaveType)
      if (status !== 'all') params.set('status', status)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/leave?${params}`)
      const json = await res.json()
      setPreviewData(json.success ? json.data ?? [] : [])
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load preview data', variant: 'destructive' })
    } finally {
      setPreviewLoading(false)
      setPreviewing(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: format })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (leaveType !== 'all') params.set('leaveType', leaveType)
      if (status !== 'all') params.set('status', status)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/leave?${params}`)
      if (format === 'excel') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leave_report.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Leave report exported successfully' })
      } else {
        const json = await res.json()
        if (json.success) {
          const rows: Record<string, unknown>[] = json.data ?? []
          buildPrintWindow('Leave Report', leaveColumns.map((c) => String(c.key)), rows)
        }
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Leave Report"
        description="Leave requests with type, duration, status, and department breakdown."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>From Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '150px' }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>To Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '150px' }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Leave Type</label>
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '150px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Types</SelectItem>
              {LEAVE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as LeaveStatus | 'all')}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '130px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES_LEAVE.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Leave Report"
        columns={leaveColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Payroll Report ───────────────────────────────────────────────────────────

function PayrollReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [month, setMonth] = React.useState(String(currentMonth))
  const [year, setYear] = React.useState(String(currentYear))
  const [department, setDepartment] = React.useState('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [summary, setSummary] = React.useState({ total: 0, gross: 0, net: 0, deductions: 0 })

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
  }, [])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/payroll?${params}`)
      const json = await res.json()
      if (json.success) {
        setPreviewData(json.data ?? [])
        if (json.summary) {
          setSummary({
            total: json.summary.totalEmployees ?? 0,
            gross: json.summary.totalGrossSalary ?? 0,
            net: json.summary.totalNetSalary ?? 0,
            deductions: json.summary.totalDeductions ?? 0,
          })
        }
      } else {
        setPreviewData([])
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load preview data', variant: 'destructive' })
    } finally {
      setPreviewLoading(false)
      setPreviewing(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: format })
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      if (department !== 'all') params.set('department', department)
      const res = await fetch(`/api/reports/payroll?${params}`)
      if (format === 'excel') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll_report_${year}_${month}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Payroll report exported successfully' })
      } else {
        const json = await res.json()
        if (json.success) {
          const rows: Record<string, unknown>[] = json.data ?? []
          buildPrintWindow('Payroll Report', payrollColumns.map((c) => String(c.key)), rows)
        }
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Payroll Report"
        description="Salary breakdowns with gross, deductions, and net pay per employee."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Month</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '140px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Year</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '110px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>

      {summary.total > 0 && (
        <SummaryStrip
          items={[
            { label: 'Employees', value: summary.total },
            {
              label: 'Total Gross',
              value: formatCurrency(summary.gross),
              color: '#8B5CF6',
            },
            {
              label: 'Total Deductions',
              value: formatCurrency(summary.deductions),
              color: '#EF4444',
            },
            {
              label: 'Total Net Pay',
              value: formatCurrency(summary.net),
              color: '#22C55E',
            },
          ]}
        />
      )}

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Payroll Report"
        columns={payrollColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Employee Report ───────────────────────────────────────────────────────────

function EmployeeReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [department, setDepartment] = React.useState('all')
  const [status, setStatus] = React.useState<EmployeeStatus | 'all'>('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [summary, setSummary] = React.useState({ total: 0, active: 0, inactive: 0 })

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
  }, [])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (department !== 'all') params.set('department', department)
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/reports/employees?${params}`)
      const json = await res.json()
      if (json.success) {
        setPreviewData(json.data ?? [])
        if (json.summary) {
          setSummary({
            total: json.summary.totalEmployees ?? 0,
            active: json.summary.byStatus?.ACTIVE ?? 0,
            inactive: json.summary.byStatus?.INACTIVE ?? 0,
          })
        }
      } else {
        setPreviewData([])
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load preview data', variant: 'destructive' })
    } finally {
      setPreviewLoading(false)
      setPreviewing(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: format })
      if (department !== 'all') params.set('department', department)
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/reports/employees?${params}`)
      if (format === 'excel') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `employee_master_report_${department === 'all' ? 'all' : department}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Employee report exported successfully' })
      } else {
        const json = await res.json()
        if (json.success) {
          const rows: Record<string, unknown>[] = json.data ?? []
          buildPrintWindow('Employee Master Report', employeeColumns.map((c) => String(c.key)), rows)
        }
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Employee Master Report"
        description="Complete employee database with personal, employment, and salary details."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as EmployeeStatus | 'all')}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '130px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES_EMPLOYEE.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>

      {summary.total > 0 && (
        <SummaryStrip
          items={[
            { label: 'Total Employees', value: summary.total, color: '#8B5CF6' },
            { label: 'Active', value: summary.active, color: '#22C55E' },
            { label: 'Inactive', value: summary.inactive, color: '#6B7280' },
          ]}
        />
      )}

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Employee Master Report"
        columns={employeeColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Tool Assignment Report ───────────────────────────────────────────────────

function ToolAssignmentReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [department, setDepartment] = React.useState('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [toolAssignments, setToolAssignments] = React.useState<Record<string, unknown>[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
    // Load tool assignments (tool-requests)
    fetch('/api/tool-requests')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const rows = d.data.map((t: any) => ({
            'Employee Name': `${t.employeeName ?? t.employee?.firstName ?? ''} ${t.employee?.lastName ?? ''}`.trim() || t.employee?.email || '-',
            'Department': t.department ?? t.employee?.department ?? '-',
            'Tool Name': t.toolName ?? t.itemName ?? t.name ?? '-',
            'Serial Number': t.serialNumber ?? t.assetId ?? '-',
            'Assigned Date': t.assignedDate ?? t.createdAt ? new Date(String(t.assignedDate ?? t.createdAt)).toLocaleDateString('en-IN') : '-',
            'Status': t.status ?? 'PENDING',
            'Remarks': t.remarks ?? t.reason ?? '-',
          }))
          setToolAssignments(rows)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const filteredData = React.useMemo(() => {
    if (!loaded) return []
    return toolAssignments.filter((r) => department === 'all' || r['Department'] === department)
  }, [toolAssignments, department, loaded])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(false)
    setPreviewData(filteredData)
    setPreviewing(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      if (format === 'excel') {
        const data = filteredData.length > 0 ? filteredData : toolAssignments
        if (data.length === 0) {
          toast({ title: 'No data', description: 'No tool assignments to export.', variant: 'destructive' })
          setExporting(false)
          return
        }
        const headers = toolColumns.map((c) => String(c.key))
        const rows = data.map((r) => headers.map((h) => String(r[h] ?? '-')))
        const csvContent = [headers, ...rows]
          .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
          .join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tool_assignment_report.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Tool assignment report exported.' })
      } else {
        buildPrintWindow('Tool Assignment Report', toolColumns.map((c) => String(c.key)), filteredData)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Tool Assignment Report"
        description="Asset and tool assignments with serial numbers, dates, and status."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      ) : toolAssignments.length === 0 ? (
        <EmptyState message="No tool assignment records found. Assign tools to employees to see data here." />
      ) : null}

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Tool Assignment Report"
        columns={toolColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Learning Request Report ──────────────────────────────────────────────────

function LearningRequestReport() {
  const { toast } = useToast()
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [department, setDepartment] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const [format, setFormat] = React.useState<ExportFormat>('excel')
  const [exporting, setExporting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [learningRequests, setLearningRequests] = React.useState<Record<string, unknown>[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data) })
      .catch(() => {})
    fetch('/api/learning-requests')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const rows = d.data.map((lr: any) => ({
            'Employee Name': `${lr.employee?.firstName ?? ''} ${lr.employee?.lastName ?? ''}`.trim() || '-',
            'Department': lr.employee?.department ?? '-',
            'Course Name': lr.courseName ?? lr.title ?? lr.moduleName ?? '-',
            'Request Date': lr.requestDate ?? lr.appliedAt ?? lr.createdAt
              ? new Date(String(lr.requestDate ?? lr.appliedAt ?? lr.createdAt)).toLocaleDateString('en-IN')
              : '-',
            'Status': lr.status ?? 'PENDING',
            'Remarks': lr.remarks ?? lr.reason ?? '-',
          }))
          setLearningRequests(rows)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const filteredData = React.useMemo(() => {
    if (!loaded) return []
    return learningRequests.filter((r) => {
      const deptMatch = department === 'all' || r['Department'] === department
      const statusMatch = status === 'all' || r['Status'] === status
      return deptMatch && statusMatch
    })
  }, [learningRequests, department, status, loaded])

  async function handlePreview() {
    setPreviewing(true)
    setPreviewOpen(true)
    setPreviewLoading(false)
    setPreviewData(filteredData)
    setPreviewing(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      if (format === 'excel') {
        const data = filteredData.length > 0 ? filteredData : learningRequests
        if (data.length === 0) {
          toast({ title: 'No data', description: 'No learning requests to export.', variant: 'destructive' })
          setExporting(false)
          return
        }
        const headers = learningColumns.map((c) => String(c.key))
        const rows = data.map((r) => headers.map((h) => String(r[h] ?? '-')))
        const csvContent = [headers, ...rows]
          .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
          .join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `learning_request_report.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Success', description: 'Learning request report exported.' })
      } else {
        buildPrintWindow('Learning Request Report', learningColumns.map((c) => String(c.key)), filteredData)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Export failed. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterCard
        title="Learning Request Report"
        description="Training and learning requests with course details and approval status."
        onExport={handleExport}
        onPreview={handlePreview}
        exporting={exporting}
        previewing={previewing}
        format={format}
        onFormatChange={setFormat}
      >
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: '#9CA3AF' }}>Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff', width: '130px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <SelectItem value="all">All Statuses</SelectItem>
              {['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterCard>

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      ) : learningRequests.length === 0 ? (
        <EmptyState message="No learning request records found." />
      ) : null}

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Learning Request Report"
        columns={learningColumns}
        data={previewData}
        loading={previewLoading}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TAB_ICONS = {
  attendance: BarChart3,
  leave: Calendar,
  payroll: Wallet,
  employee: Users,
  tool: Wrench,
  learning: GraduationCap,
} as const

const TABS = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'leave', label: 'Leave' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'employee', label: 'Employee' },
  { value: 'tool', label: 'Tool Assignment' },
  { value: 'learning', label: 'Learning Request' },
] as const

export default function ReportsPage() {
  const [activeTab, setActiveTab] = React.useState<string>('attendance')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
          Reports
        </h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Generate and export HRMS reports in Excel or PDF format
        </p>
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.value as keyof typeof TAB_ICONS]
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs px-3 py-2"
                style={{ color: activeTab === tab.value ? '#FFFFFF' : '#9CA3AF' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceReport />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveReport />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollReport />
        </TabsContent>
        <TabsContent value="employee">
          <EmployeeReport />
        </TabsContent>
        <TabsContent value="tool">
          <ToolAssignmentReport />
        </TabsContent>
        <TabsContent value="learning">
          <LearningRequestReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
