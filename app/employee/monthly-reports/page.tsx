'use client'

import * as React from 'react'
import { FileBarChart, Plus, Eye, Clock, CheckCircle, AlertCircle, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  reviewNotes: string | null
  reviewedAt: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

function getSubmissionWindow() {
  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  let reportMonth = currentMonth - 1
  let reportYear = currentYear
  if (reportMonth === 0) {
    reportMonth = 12
    reportYear = currentYear - 1
  }

  const isOpen = currentDay >= 1 && currentDay <= 3
  const daysLeft = isOpen ? 3 - currentDay + 1 : 0

  return { reportMonth, reportYear, isOpen, daysLeft, currentDay }
}

export default function EmployeeMonthlyReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = React.useState<MonthlyReport[]>([])
  const [loading, setLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [selectedReport, setSelectedReport] = React.useState<MonthlyReport | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [editingReport, setEditingReport] = React.useState<MonthlyReport | null>(null)

  const window = getSubmissionWindow()

  const [form, setForm] = React.useState({
    title: '',
    content: '',
    highlights: '',
    challenges: '',
    nextMonthPlan: '',
  })

  const fetchReports = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/monthly-reports')
      const data = await res.json()
      if (data.success) setReports(data.data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load reports', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => { fetchReports() }, [fetchReports])

  // Check if report already exists for this period
  const existingReport = reports.find(
    (r) => r.month === window.reportMonth && r.year === window.reportYear
  )

  const openForm = (report?: MonthlyReport) => {
    if (report) {
      setEditingReport(report)
      setForm({
        title: report.title,
        content: report.content,
        highlights: report.highlights || '',
        challenges: report.challenges || '',
        nextMonthPlan: report.nextMonthPlan || '',
      })
    } else {
      setEditingReport(null)
      setForm({
        title: `${MONTHS[window.reportMonth - 1]} ${window.reportYear} Report`,
        content: '',
        highlights: '',
        challenges: '',
        nextMonthPlan: '',
      })
    }
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) {
      toast({ title: 'Error', description: 'Title and report content are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const url = editingReport
        ? `/api/monthly-reports/${editingReport.id}`
        : '/api/monthly-reports'
      const method = editingReport ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: window.reportMonth,
          year: window.reportYear,
          ...form,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message || 'Report submitted successfully' })
        setFormOpen(false)
        setEditingReport(null)
        setForm({ title: '', content: '', highlights: '', challenges: '', nextMonthPlan: '' })
        fetchReports()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to submit report', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to submit report', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openView = (report: MonthlyReport) => { setSelectedReport(report); setViewOpen(true) }

  const stats = React.useMemo(() => ({
    total: reports.length,
    submitted: reports.filter((r) => r.status === 'SUBMITTED').length,
    reviewed: reports.filter((r) => r.status === 'REVIEWED').length,
    revision: reports.filter((r) => r.status === 'NEEDS_REVISION').length,
  }), [reports])

  return (
    <div className="space-y-6">
      {/* Submission Window Banner */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: window.isOpen
            ? 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))'
            : 'rgba(239,68,68,0.06)',
          borderColor: window.isOpen ? 'rgba(139,92,246,0.3)' : 'rgba(239,68,68,0.2)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {window.isOpen ? (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
                <Clock className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <AlertCircle className="h-5 w-5" style={{ color: '#EF4444' }} />
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm">
                {window.isOpen
                  ? `Submit your ${MONTHS[window.reportMonth - 1]} ${window.reportYear} report`
                  : 'Report submission window is closed'
                }
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {window.isOpen
                  ? `${window.daysLeft} day${window.daysLeft > 1 ? 's' : ''} remaining to submit • Window: 1st - 3rd of each month`
                  : `Next window opens on the 1st of ${MONTHS[new Date().getMonth()]} • Submit between 1st - 3rd`
                }
              </p>
            </div>
          </div>
          {window.isOpen && (
            <Button
              onClick={() => existingReport ? openForm(existingReport) : openForm()}
              className="text-white"
              style={{ background: '#8B5CF6' }}
            >
              {existingReport ? (
                <><Edit className="h-4 w-4 mr-2" /> Edit Report</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Submit Report</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, color: '#8B5CF6', icon: FileBarChart },
          { label: 'Submitted', value: stats.submitted, color: STATUS_COLORS.SUBMITTED, icon: Clock },
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

      {/* Reports List */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#2D2D2D' }}>
          <h3 className="text-white font-semibold">My Reports</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No reports submitted yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                {['Period', 'Title', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {MONTHS[report.month - 1]} {report.year}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-[250px] truncate">{report.title}</td>
                  <td className="px-4 py-3">
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[report.status] || '#6B7280' }}>
                      {STATUS_LABELS[report.status] || report.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(report.submittedAt)}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => openView(report)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {(report.status === 'NEEDS_REVISION' && window.isOpen) && (
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => openForm(report)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Submit / Edit Report Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingReport ? 'Edit Monthly Report' : 'Submit Monthly Report'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Report for {MONTHS[window.reportMonth - 1]} {window.reportYear}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Report Title</Label>
              <Input
                className="mt-1 border-white/10 bg-white/5 text-white"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., June 2026 Monthly Report"
              />
            </div>
            <div>
              <Label className="text-gray-300">Work Summary & Key Accomplishments *</Label>
              <Textarea
                className="mt-1 border-white/10 bg-white/5 text-white"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Describe what you worked on this month, tasks completed, deliverables..."
                rows={6}
              />
            </div>
            <div>
              <Label className="text-gray-300">Key Highlights & Achievements</Label>
              <Textarea
                className="mt-1 border-white/10 bg-white/5 text-white"
                value={form.highlights}
                onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                placeholder="Any notable achievements, milestones, or wins..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-gray-300">Challenges Faced</Label>
              <Textarea
                className="mt-1 border-white/10 bg-white/5 text-white"
                value={form.challenges}
                onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                placeholder="Any blockers, obstacles, or challenges..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-gray-300">Plan for Next Month</Label>
              <Textarea
                className="mt-1 border-white/10 bg-white/5 text-white"
                value={form.nextMonthPlan}
                onChange={(e) => setForm({ ...form, nextMonthPlan: e.target.value })}
                placeholder="What you plan to work on next month..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setFormOpen(false)} className="text-gray-400">Cancel</Button>
              <Button type="submit" disabled={submitting} className="text-white" style={{ background: '#8B5CF6' }}>
                {submitting ? 'Submitting...' : editingReport ? 'Update Report' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                      {MONTHS[selectedReport.month - 1]} {selectedReport.year} • Submitted on {formatDate(selectedReport.submittedAt)}
                    </DialogDescription>
                  </div>
                  <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedReport.status] || '#6B7280' }}>
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
                  {selectedReport.reviewedAt && (
                    <span>Reviewed: {formatDate(selectedReport.reviewedAt)}</span>
                  )}
                  <span>Last Updated: {formatDate(selectedReport.updatedAt)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
