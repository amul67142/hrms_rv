'use client'

import * as React from 'react'
import { Headphones, Plus, Eye, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

const CATEGORY_COLORS: Record<string, string> = {
  GENERAL: '#8B5CF6',
  IT: '#3B82F6',
  HR: '#22C55E',
  PAYROLL: '#F59E0B',
  LEAVE: '#06B6D4',
  OTHER: '#9CA3AF',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  RESOLVED: '#22C55E',
  CLOSED: '#6B7280',
  REJECTED: '#EF4444',
}

const CATEGORIES = ['GENERAL', 'IT', 'HR', 'PAYROLL', 'LEAVE', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']

interface Ticket {
  id: string
  employeeId: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  assignedTo: string | null
  resolution: string | null
  createdAt: string
  updatedAt: string
  employee?: { firstName: string; lastName: string; employeeCode: string }
}

export default function AdminTicketsPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState('all')
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [form, setForm] = React.useState({ status: '', priority: '', resolution: '' })
  const [submitting, setSubmitting] = React.useState(false)

  const fetchTickets = React.useCallback(async () => {
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      if (data.success) setTickets(data.data)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load tickets', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => { fetchTickets() }, [fetchTickets])

  const filteredTickets = React.useMemo(() => {
    if (activeTab === 'all') return tickets
    if (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(activeTab)) return tickets.filter((t) => t.status === activeTab)
    return tickets.filter((t) => t.category === activeTab)
  }, [tickets, activeTab])

  const stats = React.useMemo(() => ({
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length,
  }), [tickets])

  const openView = (ticket: Ticket) => { setSelectedTicket(ticket); setViewDialogOpen(true) }

  const openUpdate = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setForm({ status: ticket.status, priority: ticket.priority, resolution: ticket.resolution || '' })
    setUpdateDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedTicket) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Ticket updated' })
        setUpdateDialogOpen(false)
        fetchTickets()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Open', value: stats.open, color: STATUS_COLORS.OPEN },
            { label: 'In Progress', value: stats.inProgress, color: STATUS_COLORS.IN_PROGRESS },
            { label: 'Resolved', value: stats.resolved, color: STATUS_COLORS.RESOLVED },
            { label: 'Closed', value: stats.closed, color: STATUS_COLORS.CLOSED },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <div className="mt-2 h-1 rounded-full" style={{ background: stat.color, width: '40px' }} />
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
            <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed</TabsTrigger>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Headphones className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  No tickets found
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                      {['Employee', 'Title', 'Category', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{ticket.employee?.firstName} {ticket.employee?.lastName}</p>
                          <p className="text-xs text-gray-500">{ticket.employee?.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-white max-w-[200px] truncate">{ticket.title}</td>
                        <td className="px-4 py-3">
                          <Badge className="text-white text-xs" style={{ background: CATEGORY_COLORS[ticket.category] || CATEGORY_COLORS.OTHER }}>
                            {ticket.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="text-white text-xs" style={{ background: PRIORITY_COLORS[ticket.priority] || '#6B7280' }}>
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[ticket.status] || '#6B7280' }}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDate(ticket.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => openView(ticket)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => openUpdate(ticket)}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-white/10 max-w-2xl" style={{ background: '#1A1A1A' }}>
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-white text-lg">{selectedTicket.title}</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">
                      {selectedTicket.employee?.firstName} {selectedTicket.employee?.lastName} &middot; {selectedTicket.employee?.employeeCode}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-white text-xs" style={{ background: CATEGORY_COLORS[selectedTicket.category] }}>
                      {selectedTicket.category}
                    </Badge>
                    <Badge className="text-white text-xs" style={{ background: PRIORITY_COLORS[selectedTicket.priority] }}>
                      {selectedTicket.priority}
                    </Badge>
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedTicket.status] }}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <div className="rounded-lg p-4 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                    {selectedTicket.description}
                  </div>
                </div>
                {selectedTicket.resolution && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Resolution</p>
                    <div className="rounded-lg p-4 border text-sm leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                      {selectedTicket.resolution}
                    </div>
                  </div>
                )}
                <div className="flex gap-6 text-xs text-gray-500">
                  <span>Created: {formatDate(selectedTicket.createdAt)}</span>
                  <span>Updated: {formatDate(selectedTicket.updatedAt)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Update Ticket</DialogTitle>
            <DialogDescription className="text-gray-400">{selectedTicket?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A' }}>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A' }}>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-white hover:bg-white/10">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Resolution Notes</Label>
              <Textarea className="mt-1 border-white/10 bg-white/5 text-white" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="Describe the resolution..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpdateDialogOpen(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
              {submitting ? 'Updating...' : 'Update Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
