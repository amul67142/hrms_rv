'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { differenceInDays } from 'date-fns'
import Link from 'next/link'

interface LeaveBalance {
  leaveType: string
  entitled: number
  available: number
  pending: number
  taken: number
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  CASUAL: 'Casual Leave',
  SICK: 'Sick Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  BEREAVEMENT: 'Bereavement Leave',
  UNPAID: 'Unpaid Leave',
  COMPENSATORY: 'Compensatory Leave',
  WFH: 'Work From Home',
}

export default function ApplyLeavePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [balancesLoading, setBalancesLoading] = React.useState(true)
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalance[]>([])
  const [leaveType, setLeaveType] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    const fetchBalances = async () => {
      setBalancesLoading(true)
      try {
        const meRes = await fetch('/api/me')
        const meJson = await meRes.json()
        if (!meJson.success || !meJson.data?.id) return

        const balanceRes = await fetch(`/api/leave/balance/${meJson.data.id}`)
        const balanceJson = await balanceRes.json()
        if (balanceJson.success && balanceJson.data?.balances) {
          // Also include UNPAID and COMPENSATORY which have no balance tracking
          const fetched: LeaveBalance[] = balanceJson.data.balances
          const trackedTypes = new Set(fetched.map((b: LeaveBalance) => b.leaveType))
          const extraTypes: LeaveBalance[] = ['UNPAID', 'COMPENSATORY']
            .filter((t) => !trackedTypes.has(t))
            .map((t) => ({ leaveType: t, entitled: 0, available: 0, pending: 0, taken: 0 }))
          setLeaveBalances([...fetched, ...extraTypes])
        }
      } catch (error) {
        console.error('Failed to fetch leave balances:', error)
      } finally {
        setBalancesLoading(false)
      }
    }
    fetchBalances()
  }, [])

  const days =
    startDate && endDate
      ? Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)) + 1)
      : 0

  const selectedBalance = leaveBalances.find((l) => l.leaveType === leaveType)
  const isUnlimited = leaveType === 'UNPAID' || leaveType === 'COMPENSATORY'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveType) {
      toast({ title: 'Error', description: 'Please select a leave type', variant: 'destructive' })
      return
    }
    if (days === 0) {
      toast({ title: 'Error', description: 'Please select valid dates', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      })

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to submit')
      }

      toast({ title: 'Success', description: 'Leave application submitted successfully' })
      router.push('/employee/leave')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit leave application',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
          <Link href="/employee/leave">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Apply for Leave</h2>
          <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>Submit a new leave request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader style={{ borderBottom: '1px solid #2D2D2D' }}>
            <CardTitle className="text-white">Leave Details</CardTitle>
            <CardDescription style={{ color: '#9CA3AF' }}>
              Fill in the details for your leave request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Leave Type */}
            <div className="space-y-2">
              <Label className="text-white">Leave Type</Label>
              {balancesLoading ? (
                <div className="flex items-center gap-2 h-10">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#8B5CF6' }} />
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading leave balances…</span>
                </div>
              ) : (
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger
                    className="text-white"
                    style={{ background: '#262626', borderColor: '#3D3D3D' }}
                  >
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
                    {leaveBalances.map((b) => {
                      const isExtra = b.leaveType === 'UNPAID' || b.leaveType === 'COMPENSATORY'
                      const label = LEAVE_TYPE_LABELS[b.leaveType] || b.leaveType.replace(/_/g, ' ')
                      const suffix = isExtra ? '' : ` (${b.available} available)`
                      return (
                        <SelectItem
                          key={b.leaveType}
                          value={b.leaveType}
                          className="text-white"
                        >
                          {label}{suffix}
                        </SelectItem>
                      )
                    })}
                    {leaveBalances.length === 0 && (
                      <>
                        <SelectItem value="CASUAL" className="text-white">Casual Leave</SelectItem>
                        <SelectItem value="SICK" className="text-white">Sick Leave</SelectItem>
                        <SelectItem value="UNPAID" className="text-white">Unpaid Leave</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
              {selectedBalance && !isUnlimited && (
                <div className="flex items-center justify-between text-xs px-1" style={{ color: '#9CA3AF' }}>
                  <span>Available: <strong className="text-white">{selectedBalance.available}</strong> days</span>
                  <span>Taken: {selectedBalance.taken} | Pending: {selectedBalance.pending}</span>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value)
                  }}
                  required
                  className="text-white"
                  style={{ background: '#262626', borderColor: '#3D3D3D' }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                  className="text-white"
                  style={{ background: '#262626', borderColor: '#3D3D3D' }}
                />
              </div>
            </div>

            {/* Day count */}
            {days > 0 && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                <Calendar className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <span className="text-sm" style={{ color: '#C4B5FD' }}>
                  Total days requested:{' '}
                  <strong className="text-white">
                    {days} day{days !== 1 ? 's' : ''}
                  </strong>
                </span>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-white">Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for your leave request…"
                rows={4}
                required
                className="text-white resize-none"
                style={{ background: '#262626', borderColor: '#3D3D3D' }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            asChild
            style={{ borderColor: '#3D3D3D', color: '#9CA3AF' }}
          >
            <Link href="/employee/leave">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading || days === 0 || !leaveType}
            style={{ background: '#8B5CF6' }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
