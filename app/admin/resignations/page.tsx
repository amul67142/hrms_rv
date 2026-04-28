'use client'

import * as React from 'react'
import { LogOut, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#22C55E',
  REJECTED: '#EF4444',
  SERVING_NOTICE: '#8B5CF6',
  COMPLETED: '#3B82F6',
}

const STATUS_BADGE_STYLE: Record<string, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SERVING_NOTICE: 'issued',
  COMPLETED: 'confirmed',
}

interface Resignation {
  id: string
  employeeId: string
  reason: string | null
  intendedLastDay: string
  status: string
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  actualLastDay: string | null
  createdAt: string
  employee?: { firstName: string; lastName: string; employeeCode: string; department: string }
}

const badgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'pending' | 'issued' | 'confirmed'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  SERVING_NOTICE: 'issued',
  COMPLETED: 'info',
}

export default function AdminResignationsPage() {
  const { toast } = useToast()
  const [resignations, setResignations] = React.useState<Resignation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [selectedResignation, setSelectedResignation] = React.useState<Resignation | null>(null)
  const [actionType, setActionType] = React.useState<string>('')
  const [reviewNotes, setReviewNotes] = React.useState('')
  const [actualLastDay, setActualLastDay] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const fetchResignations = React.useCallback(async () => {
    try {
      const res = await fetch('/api/resignations')
      const data = await res.json()
      if (data.success) setResignations(data.data)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load resignations', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => { fetchResignations() }, [fetchResignations])

  const stats = React.useMemo(() => ({
    pending: resignations.filter((r) => r.status === 'PENDING').length,
    approved: resignations.filter((r) => r.status === 'APPROVED').length,
    rejected: resignations.filter((r) => r.status === 'REJECTED').length,
    servingNotice: resignations.filter((r) => r.status === 'SERVING_NOTICE').length,
    completed: resignations.filter((r) => r.status === 'COMPLETED').length,
  }), [resignations])

  const openAction = (resignation: Resignation, type: string) => {
    setSelectedResignation(resignation)
    setActionType(type)
    setReviewNotes('')
    setActualLastDay('')
    setActionDialogOpen(true)
  }

  const openView = (resignation: Resignation) => {
    setSelectedResignation(resignation)
    setViewDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedResignation) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/resignations/${selectedResignation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: actionType, reviewNotes, actualLastDay }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: `Resignation ${actionType.toLowerCase().replace('_', ' ')}` })
        setActionDialogOpen(false)
        fetchResignations()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update resignation', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Pending', value: stats.pending, color: STATUS_COLORS.PENDING, icon: Clock },
            { label: 'Approved', value: stats.approved, color: STATUS_COLORS.APPROVED, icon: CheckCircle2 },
            { label: 'Rejected', value: stats.rejected, color: STATUS_COLORS.REJECTED, icon: XCircle },
            { label: 'Serving Notice', value: stats.servingNotice, color: STATUS_COLORS.SERVING_NOTICE, icon: LogOut },
            { label: 'Completed', value: stats.completed, color: STATUS_COLORS.COMPLETED, icon: CheckCircle2 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : resignations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <LogOut className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No resignations found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                  {['Employee', 'Applied Date', 'Intended Last Day', 'Status', 'Reason', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resignations.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{r.employee?.firstName} {r.employee?.lastName}</p>
                      <p className="text-xs text-gray-500">{r.employee?.employeeCode} &middot; {r.employee?.department}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-white">{formatDate(r.intendedLastDay)}</td>
                    <td className="px-4 py-3">
                      <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[r.status] || '#6B7280' }}>
                        {r.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate">{r.reason || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => openView(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {r.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-400/10" onClick={() => openAction(r, 'APPROVED')}>Approve</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" onClick={() => openAction(r, 'SERVING_NOTICE')}>Notice</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => openAction(r, 'REJECTED')}>Reject</Button>
                          </>
                        )}
                        {r.status === 'SERVING_NOTICE' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" onClick={() => openAction(r, 'COMPLETED')}>Complete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'APPROVED' ? 'Approve' : actionType === 'SERVING_NOTICE' ? 'Mark as Serving Notice' : actionType === 'REJECTED' ? 'Reject' : 'Complete'} Resignation
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedResignation?.employee?.firstName} {selectedResignation?.employee?.lastName} &middot; {selectedResignation?.employee?.employeeCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Review Notes</Label>
              <Textarea className="mt-1 border-white/10 bg-white/5 text-white" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes..." rows={3} />
            </div>
            {(actionType === 'COMPLETED' || actionType === 'APPROVED') && (
              <div>
                <Label className="text-gray-300">Actual Last Day</Label>
                <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={actualLastDay} onChange={(e) => setActualLastDay(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialogOpen(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={handleAction} disabled={submitting} className="text-white" style={{ background: actionType === 'REJECTED' ? '#EF4444' : '#8B5CF6', borderColor: actionType === 'REJECTED' ? '#EF4444' : '#8B5CF6' }}>
              {submitting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          {selectedResignation && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-white">Resignation Details</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">
                      {selectedResignation.employee?.firstName} {selectedResignation.employee?.lastName} &middot; {selectedResignation.employee?.employeeCode}
                    </DialogDescription>
                  </div>
                  <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedResignation.status] || '#6B7280' }}>
                    {selectedResignation.status.replace('_', ' ')}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <p className="text-xs text-gray-500 mb-1">Applied On</p>
                    <p className="text-sm text-white">{formatDate(selectedResignation.createdAt)}</p>
                  </div>
                  <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <p className="text-xs text-gray-500 mb-1">Intended Last Day</p>
                    <p className="text-sm text-white">{formatDate(selectedResignation.intendedLastDay)}</p>
                  </div>
                  {selectedResignation.actualLastDay && (
                    <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-1">Actual Last Day</p>
                      <p className="text-sm text-white">{formatDate(selectedResignation.actualLastDay)}</p>
                    </div>
                  )}
                  {selectedResignation.reviewedAt && (
                    <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-1">Reviewed On</p>
                      <p className="text-sm text-white">{formatDate(selectedResignation.reviewedAt)}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <div className="rounded-lg p-3 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                    {selectedResignation.reason || 'No reason provided.'}
                  </div>
                </div>
                {selectedResignation.reviewNotes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Review Notes</p>
                    <div className="rounded-lg p-3 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {selectedResignation.reviewNotes}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
