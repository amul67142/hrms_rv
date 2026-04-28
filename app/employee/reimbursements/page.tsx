'use client'

import * as React from 'react'
import { Plus, DollarSign, Clock, CheckCircle, XOctagon, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatCurrency } from '@/lib/core/utils'

type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'

interface Reimbursement {
  id: string
  employeeId: string
  title: string
  description?: string | null
  amount: number
  category: string
  status: ReimbursementStatus
  receiptUrl?: string | null
  submittedAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

const statusColors: Record<ReimbursementStatus, 'pending' | 'approved' | 'rejected' | 'purple'> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'purple',
}

const categoryColors: Record<string, 'info' | 'warning' | 'success' | 'secondary' | 'destructive'> = {
  TRAVEL: 'info',
  MEALS: 'warning',
  EQUIPMENT: 'success',
  MEDICAL: 'destructive',
  OTHER: 'secondary',
}

export default function EmployeeReimbursementsPage() {
  const { toast } = useToast()
  const [data, setData] = React.useState<Reimbursement[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reimbursements')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load reimbursements', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCancel = async (item: Reimbursement) => {
    if (!confirm(`Cancel reimbursement "${item.title}"?`)) return
    try {
      const res = await fetch(`/api/reimbursements/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Cancelled', description: 'Reimbursement has been cancelled.' })
        fetchData()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to cancel reimbursement', variant: 'destructive' })
    }
  }

  const pending = data.filter((r) => r.status === 'PENDING')
  const approved = data.filter((r) => r.status === 'APPROVED' || r.status === 'PAID')
  const rejected = data.filter((r) => r.status === 'REJECTED')

  const totalSubmitted = data.length
  const totalAmount = data.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My Reimbursements</h2>
          <p className="text-sm text-gray-400 mt-1">Submit and track your reimbursement requests</p>
        </div>
        <Button asChild>
          <Link href="/employee/reimbursements/submit">
            <Plus className="mr-2 h-4 w-4" />
            Submit New
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Submitted</span>
              <DollarSign className="h-4 w-4" style={{ color: '#A78BFA' }} />
            </div>
            <p className="text-2xl font-bold text-white">{totalSubmitted}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(totalAmount)} total</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending</span>
              <Clock className="h-4 w-4" style={{ color: '#FBBF24' }} />
            </div>
            <p className="text-2xl font-bold text-white">{pending.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Approved</span>
              <CheckCircle className="h-4 w-4" style={{ color: '#34D399' }} />
            </div>
            <p className="text-2xl font-bold text-white">{approved.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rejected</span>
              <XOctagon className="h-4 w-4" style={{ color: '#F87171' }} />
            </div>
            <p className="text-2xl font-bold text-white">{rejected.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reimbursements List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#8B5CF6' }} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <DollarSign className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-300 mb-1">No reimbursements yet</p>
          <p className="text-sm text-gray-500 mb-6">Submit your first reimbursement request</p>
          <Button asChild>
            <Link href="/employee/reimbursements/submit">
              <Plus className="mr-2 h-4 w-4" />
              Submit New Reimbursement
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-white truncate">{item.title}</h3>
                  <Badge variant={categoryColors[item.category] as 'info' | 'warning' | 'success' | 'secondary' | 'destructive'}>
                    {item.category}
                  </Badge>
                  <Badge variant={statusColors[item.status] as 'pending' | 'approved' | 'rejected' | 'purple'}>
                    {item.status}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{item.description}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  Submitted {formatDate(item.submittedAt, 'dd MMM yyyy')}
                  {item.notes && <span className="ml-2">- {item.notes}</span>}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{formatCurrency(item.amount)}</p>
                </div>
                {item.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => handleCancel(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
