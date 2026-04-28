'use client'

import * as React from 'react'
import { Plus, Search, Trash2, CheckSquare, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  assignedTo: string
  assignedBy: string | null
  departmentId: string | null
  assignee: { firstName: string; lastName: string; department: string | null; employeeCode: string }
  department: { id: string; name: string } | null
}

interface Employee { id: string; firstName: string; lastName: string; employeeCode: string; department: string | null; designation: string | null }
interface Department { id: string; name: string; code: string }
interface TaskForm { title: string; description: string; assignedTo: string; departmentId: string; priority: string; dueDate: string }

const PRIORITY_COLOR: Record<string, string> = { LOW: '#6B7280', MEDIUM: '#8B5CF6', HIGH: '#F59E0B', URGENT: '#EF4444' }
const PRIORITY_BG: Record<string, string>    = { LOW: 'rgba(107,114,128,0.15)', MEDIUM: 'rgba(139,92,246,0.15)', HIGH: 'rgba(245,158,11,0.15)', URGENT: 'rgba(239,68,68,0.15)' }
const STATUS_COLOR: Record<string, string>   = { PENDING: '#F59E0B', IN_PROGRESS: '#8B5CF6', COMPLETED: '#22C55E', CANCELLED: '#6B7280' }
const STATUS_BG: Record<string, string>      = { PENDING: 'rgba(245,158,11,0.15)', IN_PROGRESS: 'rgba(139,92,246,0.15)', COMPLETED: 'rgba(34,197,94,0.15)', CANCELLED: 'rgba(107,114,128,0.15)' }

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
const TABS = ['ALL', ...STATUSES] as const

export default function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks]             = React.useState<Task[]>([])
  const [loading, setLoading]         = React.useState(true)
  const [search, setSearch]           = React.useState('')
  const [filterStatus, setFilter]     = React.useState<string>('ALL')
  const [assignOpen, setAssignOpen]   = React.useState(false)
  const [deleteOpen, setDeleteOpen]   = React.useState(false)
  const [taskToDelete, setToDelete]   = React.useState<Task | null>(null)
  const [saving, setSaving]           = React.useState(false)
  const [statusLoading, setStatusLoading] = React.useState<string | null>(null)
  const [error, setError]             = React.useState('')
  const [employees, setEmployees]     = React.useState<Employee[]>([])
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [form, setForm]               = React.useState<TaskForm>({ title: '', description: '', assignedTo: '', departmentId: '', priority: 'MEDIUM', dueDate: '' })

  const fetchTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const json = await res.json()
      if (json.success) setTasks(json.data)
      else toast({ title: 'Error', description: json.error || 'Failed to load tasks', variant: 'destructive' })
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [toast])

  const fetchDropdowns = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([fetch('/api/employees/list'), fetch('/api/departments')])
      if (empRes.ok) {
        const empJson = await empRes.json()
        if (empJson.success) setEmployees(empJson.data)
      } else {
        toast({ title: 'Warning', description: 'Could not load employees list', variant: 'destructive' })
      }
      if (deptRes.ok) {
        const deptJson = await deptRes.json()
        if (deptJson.success) setDepartments(deptJson.data)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load form data — check your connection', variant: 'destructive' })
    }
  }

  React.useEffect(() => { fetchTasks() }, [fetchTasks])

  const openAssign = () => {
    setForm({ title: '', description: '', assignedTo: '', departmentId: '', priority: 'MEDIUM', dueDate: '' })
    setError('')
    fetchDropdowns()
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.assignedTo) { setError('Assignee is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, departmentId: form.departmentId || null, dueDate: form.dueDate || null }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: '✅ Task assigned', description: `"${form.title}" assigned — employee notified.` })
        setAssignOpen(false)
        fetchTasks()
      } else {
        setError(json.error || 'Something went wrong')
      }
    } catch (_e) { setError('Network error — try again') }
    setSaving(false)
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setStatusLoading(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        toast({ title: 'Status updated', description: `Task marked as ${newStatus.replace('_', ' ')}` })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally { setStatusLoading(null) }
  }

  const handleDelete = async () => {
    if (!taskToDelete) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Deleted', description: `"${taskToDelete.title}" removed` })
        setDeleteOpen(false)
        fetchTasks()
      } else {
        toast({ title: 'Error', description: json.error || 'Cannot delete', variant: 'destructive' })
      }
    } catch (_e) { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }) }
    setSaving(false)
  }

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      t.title.toLowerCase().includes(q) ||
      `${t.assignee.firstName} ${t.assignee.lastName}`.toLowerCase().includes(q) ||
      t.assignee.employeeCode.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Task Management</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Assign and track employee tasks ({filtered.length} shown)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTasks} className="border-white/10 text-gray-300 hover:text-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={openAssign} style={{ background: '#8B5CF6' }} className="hover:opacity-90 text-white">
            <Plus className="mr-2 h-4 w-4" /> Assign Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: '#8B5CF6' },
          { label: 'Pending', value: stats.pending, color: '#F59E0B' },
          { label: 'In Progress', value: stats.inProgress, color: '#8B5CF6' },
          { label: 'Completed', value: stats.completed, color: '#22C55E' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '12px' }} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: filterStatus === tab ? '#8B5CF6' : 'rgba(26,26,26,0.8)', color: filterStatus === tab ? '#fff' : '#9CA3AF', border: `1px solid ${filterStatus === tab ? '#8B5CF6' : '#2D2D2D'}` }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7280' }} />
        <Input placeholder="Search tasks or employee..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#E5E7EB' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2D2D2D', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckSquare className="h-12 w-12 mb-4" style={{ color: '#374151' }} />
            <p className="text-gray-400">No tasks found</p>
            <p className="text-sm text-gray-600 mt-1">Click &quot;Assign Task&quot; to create one</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2D2D2D' }}>
                  {['Task', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6D28D9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((task, i) => (
                  <tr key={task.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2D2D2D' : 'none' }} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4" style={{ maxWidth: '260px' }}>
                      <p className="font-medium text-white truncate">{task.title}</p>
                      {task.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B7280' }}>{task.description}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white">{task.assignee.firstName} {task.assignee.lastName}</p>
                      <p className="text-xs" style={{ color: '#A78BFA' }}>{task.assignee.employeeCode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: PRIORITY_BG[task.priority], color: PRIORITY_COLOR[task.priority] }}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {/* Inline status change dropdown */}
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}
                        disabled={statusLoading === task.id}
                      >
                        <SelectTrigger
                          className="h-7 px-2.5 py-0.5 rounded-full text-xs font-medium border-0 w-auto focus:ring-0"
                          style={{ background: STATUS_BG[task.status], color: STATUS_COLOR[task.status], minWidth: '110px' }}
                        >
                          {statusLoading === task.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <SelectValue />
                          }
                        </SelectTrigger>
                        <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} style={{ color: STATUS_COLOR[s] }}>
                              {s.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4">
                      {task.dueDate
                        ? <span className="text-sm text-gray-300">{new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        : <span className="text-sm" style={{ color: '#4B5563' }}>--</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-900/20"
                        onClick={() => { setToDelete(task); setDeleteOpen(true) }} title="Delete task">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Task Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '520px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#E5E7EB' }}>Assign Task</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>Create and assign a task — employee gets notified instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}
            <div className="space-y-2">
              <Label style={{ color: '#E5E7EB' }}>Task Title <span style={{ color: '#EF4444' }}>*</span></Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Enter task title..." style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }} />
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#E5E7EB' }}>Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..." rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-600"
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }} />
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#E5E7EB' }}>Assign To <span style={{ color: '#EF4444' }}>*</span></Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                <SelectTrigger style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}>
                  <SelectValue placeholder={employees.length === 0 ? 'Loading employees...' : 'Select employee...'} />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} style={{ color: '#E5E7EB' }}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode}){emp.designation ? ` — ${emp.designation}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#E5E7EB' }}>Department <span style={{ color: '#6B7280', fontSize: '11px' }}>(optional)</span></Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id} style={{ color: '#E5E7EB' }}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: '#E5E7EB' }}>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                      <SelectItem key={p} value={p} style={{ color: PRIORITY_COLOR[p] }}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#E5E7EB' }}>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} style={{ border: '1px solid #2D2D2D', color: '#E5E7EB' }}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving} style={{ background: '#8B5CF6' }} className="hover:opacity-90 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saving ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#E5E7EB' }}>Delete Task</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Delete <strong style={{ color: '#E5E7EB' }}>&quot;{taskToDelete?.title}&quot;</strong>? The assigned employee will be notified. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} style={{ border: '1px solid #2D2D2D', color: '#E5E7EB' }}>Cancel</Button>
            <Button onClick={handleDelete} disabled={saving} style={{ background: '#EF4444' }} className="hover:opacity-90 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saving ? 'Deleting...' : 'Delete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
