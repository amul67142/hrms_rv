'use client'

import * as React from 'react'
import { Headphones, Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}

export default function EmployeeTicketsPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [form, setForm] = React.useState({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description) {
      toast({ title: 'Error', description: 'Title and description are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Ticket submitted successfully' })
        setFormOpen(false)
        setForm({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' })
        fetchTickets()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to submit ticket', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to submit ticket', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openView = (ticket: Ticket) => { setSelectedTicket(ticket); setViewOpen(true) }

  const stats = React.useMemo(() => ({
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length,
  }), [tickets])

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

        {/* New Ticket Button */}
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
            <Plus className="h-4 w-4 mr-2" /> New Ticket
          </Button>
        </div>

        {/* Tickets List */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Headphones className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No tickets found. Submit your first ticket.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                  {['Title', 'Category', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                    <td className="px-4 py-3 text-sm text-white max-w-[250px] truncate">{ticket.title}</td>
                    <td className="px-4 py-3">
                      <Badge className="text-white text-xs" style={{ background: CATEGORY_COLORS[ticket.category] }}>
                        {ticket.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="text-white text-xs" style={{ background: PRIORITY_COLORS[ticket.priority] }}>
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[ticket.status] }}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(ticket.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => openView(ticket)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      {/* New Ticket Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-white/10" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Raise a Ticket</DialogTitle>
            <DialogDescription className="text-gray-400">Submit a new support ticket to the HR/IT team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input className="mt-1 border-white/10 bg-white/5 text-white" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief summary of your issue" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A' }}>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
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
                      <SelectItem key={p} value={p} className="text-white hover:bg-white/10">{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea className="mt-1 border-white/10 bg-white/5 text-white" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your issue in detail..." rows={5} />
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setFormOpen(false)} className="text-gray-400">Cancel</Button>
              <Button type="submit" disabled={submitting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="border-white/10 max-w-2xl" style={{ background: '#1A1A1A' }}>
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-white text-lg">{selectedTicket.title}</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">Submitted on {formatDate(selectedTicket.createdAt)}</DialogDescription>
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
                  <span>Updated: {formatDate(selectedTicket.updatedAt)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
