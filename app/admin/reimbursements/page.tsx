'use client'

import * as React from 'react'
import {
  CheckCircle2,
  XCircle,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  XOctagon,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  employee?: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    department: string
    designation: string
  }
}

const statusColors: Record<ReimbursementStatus, 'pending' | 'approved' | 'rejected' | 'purple' | 'secondary'> = {
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

export default function AdminReimbursementsPage() {
  const { toast } = useToast()
  const [data, setData] = React.useState<Reimbursement[]>([])
  const [stats, setStats] = React.useState<{ total: number; pending: number; approved: number; rejected: number; paid: number } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedItem, setSelectedItem] = React.useState<Reimbursement | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false)
  const [actionType, setActionType] = React.useState<'approve' | 'reject' | 'pay'>('approve')
  const [actionNotes, setActionNotes] = React.useState('')
  const [processing, setProcessing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('pending')

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('status', activeTab.toUpperCase())

      const res = await fetch(`/api/reimbursements?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        if (json.stats) setStats(json.stats)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load reimbursements', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [activeTab, toast])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const openDetail = (item: Reimbursement) => {
    setSelectedItem(item)
    setDetailDialogOpen(true)
  }

  const openAction = (item: Reimbursement, type: 'approve' | 'reject' | 'pay') => {
    setSelectedItem(item)
    setActionType(type)
    setActionNotes('')
    setActionDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedItem) return
    setProcessing(true)
    try {
      const statusMap: Record<string, string> = { approve: 'APPROVED', reject: 'REJECTED', pay: 'PAID' }
      const res = await fetch(`/api/reimbursements/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[actionType], notes: actionNotes }),
      })
      const json = await res.json()
      if (json.success) {
        toast({
          title: actionType === 'approve' ? 'Approved' : actionType === 'reject' ? 'Rejected' : 'Marked as Paid',
          description: `Reimbursement "${selectedItem.title}" has been ${statusMap[actionType].toLowerCase()}.`,
        })
        setActionDialogOpen(false)
        fetchData()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update reimbursement', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (item: Reimbursement) => {
    if (!confirm(`Delete reimbursement "${item.title}"?`)) return
    try {
      const res = await fetch(`/api/reimbursements/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Deleted', description: 'Reimbursement has been deleted.' })
        fetchData()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete reimbursement', variant: 'destructive' })
    }
  }

  const statCards = stats
    ? [
        { label: 'Total', value: stats.total, icon: TrendingUp, color: '#A78BFA' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: '#FBBF24' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle, color: '#34D399' },
        { label: 'Rejected', value: stats.rejected, icon: XOctagon, color: '#F87171' },
        { label: 'Paid', value: stats.paid, icon: CreditCard, color: '#A78BFA' },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reimbursements</h2>
          <p className="text-sm text-gray-400 mt-1">Review and manage employee reimbursement requests</p>
        </div>
      </div>

      {/* Stats Row */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="border-0" style={{ background: '#1A1A1A' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{card.label}</span>
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats?.pending ?? 0})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats?.approved ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats?.rejected ?? 0})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({stats?.paid ?? 0})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {['pending', 'approved', 'rejected', 'paid', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#8B5CF6' }} />
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <DollarSign className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No reimbursement requests found</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#2D2D2D' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0F0F0F' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-t"
                        style={{
                          borderColor: '#2D2D2D',
                          background: idx % 2 === 0 ? '#1A1A1A' : 'rgba(26,26,26,0.5)',
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{item.employee?.firstName} {item.employee?.lastName}</p>
                          <p className="text-xs text-gray-500">{item.employee?.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-200 font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={categoryColors[item.category] as 'info' | 'warning' | 'success' | 'secondary' | 'destructive'}>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColors[item.status] as 'pending' | 'approved' | 'rejected' | 'purple'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(item.submittedAt, 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-400 hover:text-white"
                              onClick={() => openDetail(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.status === 'PENDING' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-400 hover:text-green-300"
                                  onClick={() => openAction(item, 'approve')}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-400 hover:text-red-300"
                                  onClick={() => openAction(item, 'reject')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {item.status === 'APPROVED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary-400 hover:text-primary-300"
                                onClick={() => openAction(item, 'pay')}
                              >
                                <CreditCard className="h-4 w-4" />
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Reimbursement Details</DialogTitle>
            <DialogDescription>Review the reimbursement request details</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Employee</Label>
                  <p className="text-white font-medium mt-1">
                    {selectedItem.employee?.firstName} {selectedItem.employee?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{selectedItem.employee?.employeeCode}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Category</Label>
                  <p className="mt-1">
                    <Badge variant={categoryColors[selectedItem.category] as 'info' | 'warning' | 'success' | 'secondary' | 'destructive'}>
                      {selectedItem.category}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Amount</Label>
                  <p className="text-white font-bold text-lg mt-1">{formatCurrency(selectedItem.amount)}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Status</Label>
                  <p className="mt-1">
                    <Badge variant={statusColors[selectedItem.status] as 'pending' | 'approved' | 'rejected' | 'purple'}>
                      {selectedItem.status}
                    </Badge>
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Title</Label>
                  <p className="text-white font-medium mt-1">{selectedItem.title}</p>
                </div>
                {selectedItem.description && (
                  <div className="col-span-2">
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Description</Label>
                    <p className="text-gray-300 text-sm mt-1">{selectedItem.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Submitted</Label>
                  <p className="text-gray-300 text-sm mt-1">{formatDate(selectedItem.submittedAt, 'dd MMM yyyy')}</p>
                </div>
                {selectedItem.reviewedAt && (
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Reviewed</Label>
                    <p className="text-gray-300 text-sm mt-1">{formatDate(selectedItem.reviewedAt, 'dd MMM yyyy')}</p>
                  </div>
                )}
                {selectedItem.notes && (
                  <div className="col-span-2">
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Notes</Label>
                    <p className="text-gray-300 text-sm mt-1">{selectedItem.notes}</p>
                  </div>
                )}
                {selectedItem.receiptUrl && (
                  <div className="col-span-2">
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Receipt</Label>
                    <a
                      href={selectedItem.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm mt-1 inline-block"
                      style={{ color: '#A78BFA' }}
                    >
                      View Receipt
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
            {selectedItem?.status === 'PENDING' && (
              <>
                <Button variant="destructive" onClick={() => { setDetailDialogOpen(false); openAction(selectedItem!, 'reject') }}>
                  Reject
                </Button>
                <Button onClick={() => { setDetailDialogOpen(false); openAction(selectedItem!, 'approve') }}>
                  Approve
                </Button>
              </>
            )}
            {selectedItem?.status === 'APPROVED' && (
              <Button onClick={() => { setDetailDialogOpen(false); openAction(selectedItem!, 'pay') }}>
                Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Mark as Paid'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approve reimbursement request "${selectedItem?.title}" for ${formatCurrency(selectedItem?.amount ?? 0)}?`
                : actionType === 'reject'
                ? `Reject reimbursement request "${selectedItem?.title}"?`
                : `Mark reimbursement "${selectedItem?.title}" as paid?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="actionNotes" className="text-gray-300">Notes (optional)</Label>
            <Textarea
              id="actionNotes"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Add any notes...'}
              rows={3}
              className="bg-surface border-border text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Mark Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
