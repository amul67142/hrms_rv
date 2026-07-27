'use client'

import * as React from 'react'
import { FileBarChart, Eye, CheckCircle, AlertCircle, Clock, Send, Filter, Users, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'
import { apiFetch } from '@/lib/core/fetcher'

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#F59E0B',
  REVIEWED: '#22C55E',
  NEEDS_REVISION: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  NEEDS_REVISION: 'Needs Revision',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface MonthlyReport {
  id: string
  employeeId: string
  month: number
  year: number
  title: string
  content: string
  highlights: string | null
  challenges: string | null
  nextMonthPlan: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
  employee: {
    firstName: string
    lastName: string
    employeeCode: string
    department: string
    designation: string
  }
}

export default function AdminMonthlyReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = React.useState<MonthlyReport[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [selectedReport, setSelectedReport] = React.useState<MonthlyReport | null>(null)
  const [reviewForm, setReviewForm] = React.useState({ status: '', reviewNotes: '' })
  const [submitting, setSubmitting] = React.useState(false)
  const [sendingReminder, setSendingReminder] = React.useState(false)

  // Filters
  const now = new Date()
  let defaultMonth = now.getMonth() // previous month (0-indexed)
  let defaultYear = now.getFullYear()
  if (defaultMonth === 0) { defaultMonth = 12; defaultYear-- } // Jan -> Dec of prev year

  const [filterMonth, setFilterMonth] = React.useState<string>(String(defaultMonth))
  const [filterYear, setFilterYear] = React.useState<string>(String(defaultYear))
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL')

  const fetchReports = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterMonth !== 'ALL') params.set('month', filterMonth)
      if (filterYear !== 'ALL') params.set('year', filterYear)
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      const res = await apiFetch(`/api/monthly-reports?${params.toString()}`)
      const data = await res.json()
      if (data.success) setReports(data.data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load reports', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterYear, filterStatus, toast])

  React.useEffect(() => { fetchReports() }, [fetchReports])

  const openView = (report: MonthlyReport) => { setSelectedReport(report); setViewOpen(true) }

  const openReview = (report: MonthlyReport) => {
    setSelectedReport(report)
    setReviewForm({ status: '', reviewNotes: '' })
    setReviewOpen(true)
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport || !reviewForm.status) {
      toast({ title: 'Error', description: 'Please select a review status', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/monthly-reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Report reviewed successfully' })
        setReviewOpen(false)
        fetchReports()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to review', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to review report', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendReminders = async () => {
    setSendingReminder(true)
    try {
      const res = await apiFetch('/api/monthly-reports/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to send reminders', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send reminders', variant: 'destructive' })
    } finally {
      setSendingReminder(false)
    }
  }

  const stats = React.useMemo(() => ({
    total: reports.length,
    submitted: reports.filter((r) => r.status === 'SUBMITTED').length,
    reviewed: reports.filter((r) => r.status === 'REVIEWED').length,
    revision: reports.filter((r) => r.status === 'NEEDS_REVISION').length,
  }), [reports])

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, color: '#8B5CF6', icon: FileBarChart },
          { label: 'Pending Review', value: stats.submitted, color: STATUS_COLORS.SUBMITTED, icon: Clock },
          { label: 'Reviewed', value: stats.reviewed, color: STATUS_COLORS.REVIEWED, icon: CheckCircle },
          { label: 'Needs Revision', value: stats.revision, color: STATUS_COLORS.NEEDS_REVISION, icon: AlertCircle },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <div className="mt-2 h-1 rounded-full" style={{ background: stat.color, width: '40px' }} />
          </div>
        ))}
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filters:</span>
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-white text-sm h-9">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A' }}>
              <SelectItem value="ALL" className="text-white hover:bg-white/10">All Months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-white hover:bg-white/10">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[100px] border-white/10 bg-white/5 text-white text-sm h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A' }}>
              <SelectItem value="ALL" className="text-white hover:bg-white/10">All</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-white hover:bg-white/10">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-white text-sm h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: '#1A1A1A' }}>
              <SelectItem value="ALL" className="text-white hover:bg-white/10">All Status</SelectItem>
              <SelectItem value="SUBMITTED" className="text-white hover:bg-white/10">Submitted</SelectItem>
              <SelectItem value="REVIEWED" className="text-white hover:bg-white/10">Reviewed</SelectItem>
              <SelectItem value="NEEDS_REVISION" className="text-white hover:bg-white/10">Needs Revision</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSendReminders}
          disabled={sendingReminder}
          className="text-white"
          style={{ background: '#8B5CF6' }}
        >
          <Send className="h-4 w-4 mr-2" />
          {sendingReminder ? 'Sending...' : 'Send Reminders'}
        </Button>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#2D2D2D' }}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h3 className="text-white font-semibold">Employee Monthly Reports</h3>
          </div>
          <span className="text-sm text-gray-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No reports found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                  {['Employee', 'Department', 'Period', 'Title', 'Status', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-white font-medium">{report.employee.firstName} {report.employee.lastName}</p>
                        <p className="text-xs text-gray-500">{report.employee.employeeCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{report.employee.department}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {MONTHS[report.month - 1]} {report.year}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 max-w-[200px] truncate">{report.title}</td>
                    <td className="px-4 py-3">
                      <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[report.status] || '#6B7280' }}>
                        {STATUS_LABELS[report.status] || report.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(report.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => openView(report)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        {report.status === 'SUBMITTED' && (
                          <Button variant="ghost" size="sm" className="hover:text-white" style={{ color: '#8B5CF6' }} onClick={() => openReview(report)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Report Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1A1A1A' }}>
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-white text-lg">{selectedReport.title}</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">
                      {selectedReport.employee.firstName} {selectedReport.employee.lastName} ({selectedReport.employee.employeeCode})
                      <br />
                      {selectedReport.employee.department} • {selectedReport.employee.designation}
                      <br />
                      {MONTHS[selectedReport.month - 1]} {selectedReport.year} • Submitted on {formatDate(selectedReport.submittedAt)}
                    </DialogDescription>
                  </div>
                  <Badge className="text-white text-xs shrink-0" style={{ background: STATUS_COLORS[selectedReport.status] || '#6B7280' }}>
                    {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Work Summary</p>
                  <div className="rounded-lg p-4 border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                    {selectedReport.content}
                  </div>
                </div>
                {selectedReport.highlights && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Key Highlights</p>
                    <div className="rounded-lg p-4 border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {selectedReport.highlights}
                    </div>
                  </div>
                )}
                {selectedReport.challenges && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Challenges</p>
                    <div className="rounded-lg p-4 border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {selectedReport.challenges}
                    </div>
                  </div>
                )}
                {selectedReport.nextMonthPlan && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Next Month Plan</p>
                    <div className="rounded-lg p-4 border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {selectedReport.nextMonthPlan}
                    </div>
                  </div>
                )}
                {selectedReport.reviewNotes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Review Notes</p>
                    <div className="rounded-lg p-4 border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)', color: '#D1D5DB' }}>
                      {selectedReport.reviewNotes}
                    </div>
                  </div>
                )}
                <div className="flex gap-6 text-xs text-gray-500">
                  {selectedReport.reviewedAt && <span>Reviewed: {formatDate(selectedReport.reviewedAt)}</span>}
                  <span>Updated: {formatDate(selectedReport.updatedAt)}</span>
                </div>
              </div>
              {selectedReport.status === 'SUBMITTED' && (
                <DialogFooter>
                  <Button onClick={() => { setViewOpen(false); openReview(selectedReport) }} className="text-white" style={{ background: '#8B5CF6' }}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Review This Report
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Review Report</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {selectedReport.employee.firstName} {selectedReport.employee.lastName} — {MONTHS[selectedReport.month - 1]} {selectedReport.year}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReview} className="space-y-4 py-2">
                <div>
                  <Label className="text-gray-300">Review Decision</Label>
                  <Select value={reviewForm.status} onValueChange={(v) => setReviewForm({ ...reviewForm, status: v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select decision..." />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1A1A1A' }}>
                      <SelectItem value="REVIEWED" className="text-white hover:bg-white/10">
                        ✅ Approved / Reviewed
                      </SelectItem>
                      <SelectItem value="NEEDS_REVISION" className="text-white hover:bg-white/10">
                        🔄 Needs Revision
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Review Notes (optional)</Label>
                  <Textarea
                    className="mt-1 border-white/10 bg-white/5 text-white"
                    value={reviewForm.reviewNotes}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
                    placeholder="Add feedback or notes for the employee..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" type="button" onClick={() => setReviewOpen(false)} className="text-gray-400">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="text-white" style={{ background: '#8B5CF6' }}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
