'use client'

import * as React from 'react'
import { LogOut, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#22C55E',
  REJECTED: '#EF4444',
  SERVING_NOTICE: '#8B5CF6',
  COMPLETED: '#3B82F6',
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
  updatedAt: string
}

export default function EmployeeResignationPage() {
  const { toast } = useToast()
  const [resignation, setResignation] = React.useState<Resignation | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [reason, setReason] = React.useState('')
  const [intendedLastDay, setIntendedLastDay] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const fetchResignation = React.useCallback(async () => {
    try {
      const res = await fetch('/api/resignations')
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setResignation(data.data[0])
      } else {
        setResignation(null)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load resignation', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => { fetchResignation() }, [fetchResignation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intendedLastDay) {
      toast({ title: 'Error', description: 'Please select your intended last working day', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/resignations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, intendedLastDay }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Resignation submitted successfully' })
        fetchResignation()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to submit resignation', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to submit resignation', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : resignation ? (
          /* Existing Resignation */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${STATUS_COLORS[resignation.status]}20` }}>
                <LogOut className="h-5 w-5" style={{ color: STATUS_COLORS[resignation.status] }} />
              </div>
              <div>
                <p className="text-white font-medium">Resignation {resignation.status.replace('_', ' ')}</p>
                <p className="text-sm text-gray-400">Submitted on {formatDate(resignation.createdAt)}</p>
              </div>
              <Badge className="ml-auto text-white" style={{ background: STATUS_COLORS[resignation.status] }}>
                {resignation.status.replace('_', ' ')}
              </Badge>
            </div>

            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Resignation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <p className="text-xs text-gray-500 mb-1">Applied On</p>
                    <p className="text-sm text-white">{formatDate(resignation.createdAt)}</p>
                  </div>
                  <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <p className="text-xs text-gray-500 mb-1">Intended Last Day</p>
                    <p className="text-sm text-white">{formatDate(resignation.intendedLastDay)}</p>
                  </div>
                  {resignation.actualLastDay && (
                    <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-1">Actual Last Day</p>
                      <p className="text-sm text-white">{formatDate(resignation.actualLastDay)}</p>
                    </div>
                  )}
                  {resignation.reviewedAt && (
                    <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-1">Reviewed On</p>
                      <p className="text-sm text-white">{formatDate(resignation.reviewedAt)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <div className="rounded-lg p-3 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                    {resignation.reason || 'No reason provided.'}
                  </div>
                </div>

                {resignation.reviewNotes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                    <div className="rounded-lg p-3 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {resignation.reviewNotes}
                    </div>
                  </div>
                )}

                {resignation.status === 'PENDING' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">Your resignation is pending review by HR. You cannot submit another resignation while this is active.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Submit Form */
          <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LogOut className="h-5 w-5" style={{ color: '#8B5CF6' }} />
                Submit Resignation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg p-3 border" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <p className="text-xs text-yellow-300">
                    Please provide at least 2 weeks notice before your intended last working day.
                    Your resignation will be reviewed by HR.
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Reason for Leaving</Label>
                  <Textarea
                    className="mt-1 border-white/10 bg-white/5 text-white"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Share your reason for leaving (optional)..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Intended Last Working Day <span className="text-red-400">*</span></Label>
                  <Input
                    type="date"
                    className="mt-1 border-white/10 bg-white/5 text-white"
                    value={intendedLastDay}
                    onChange={(e) => setIntendedLastDay(e.target.value)}
                    min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white"
                  style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Resignation'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
  )
}
