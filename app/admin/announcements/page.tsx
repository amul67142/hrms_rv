'use client'

import * as React from 'react'
import { Megaphone, Plus, Trash2, Mail, MailOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  priority: string
  isActive: boolean
  sentEmail: boolean
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  GENERAL: '#8B5CF6',
  LEAVE: '#3B82F6',
  PAYROLL: '#22C55E',
  EVENT: '#F59E0B',
  URGENT: '#EF4444',
}

const PRIORITY_BADGES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: '#262626', text: '#9CA3AF' },
  NORMAL: { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
  HIGH: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  URGENT: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
}

export default function AnnouncementsPage() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [showDelete, setShowDelete] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '',
    content: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    sendEmail: false,
  })

  const fetchAnnouncements = React.useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      const json = await res.json()
      if (json.success) setAnnouncements(json.data)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load announcements', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Success', description: 'Announcement created successfully' })
        setShowCreate(false)
        setForm({ title: '', content: '', type: 'GENERAL', priority: 'NORMAL', sendEmail: false })
        fetchAnnouncements()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Deleted', description: 'Announcement removed' })
        setShowDelete(null)
        fetchAnnouncements()
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Announcements</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Broadcast updates and notices to all employees
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border"
          style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(139,92,246,0.1)' }}>
            <Megaphone className="h-8 w-8" style={{ color: '#8B5CF6' }} />
          </div>
          <p className="text-white font-medium mb-1">No announcements yet</p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Create your first announcement to notify employees</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="rounded-xl border p-5"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{ background: `${TYPE_COLORS[a.type] || '#8B5CF6'}20`, color: TYPE_COLORS[a.type] || '#8B5CF6' }}>
                      {a.type}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ background: PRIORITY_BADGES[a.priority]?.bg, color: PRIORITY_BADGES[a.priority]?.text }}>
                      {a.priority === 'URGENT' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {a.priority}
                    </span>
                    {a.sentEmail && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                        <MailOpen className="h-3 w-3" /> Email Sent
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1">{a.title}</h3>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: '#9CA3AF' }}>
                    {a.content.length > 200 ? a.content.substring(0, 200) + '...' : a.content}
                  </p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    {formatDate(a.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-400"
                    style={{ background: 'transparent' }}
                    onClick={() => setShowDelete(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-xl border-0 max-w-lg"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white text-lg">New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white">Title <span className="text-red-400">*</span></Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Office Holiday Schedule for December"
                style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Type</Label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }}>
                  <option value="GENERAL">General</option>
                  <option value="LEAVE">Leave</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="EVENT">Event</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Priority</Label>
                <select
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Content <span className="text-red-400">*</span></Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Write your announcement message..."
                rows={5}
                style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={e => setForm(p => ({ ...p, sendEmail: e.target.checked }))}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#8B5CF6' }}
              />
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                <span className="text-sm text-white">Send email notification to all employees</span>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="rounded-xl border-0"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Are you sure you want to delete this announcement? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
