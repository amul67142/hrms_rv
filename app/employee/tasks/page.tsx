'use client'

import * as React from 'react'
import { CheckSquare, Loader2, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  department: { id: string; name: string } | null
}

const priorityColors: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#8B5CF6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
}

const priorityBg: Record<string, string> = {
  LOW: 'rgba(107,114,128,0.15)',
  MEDIUM: 'rgba(139,92,246,0.15)',
  HIGH: 'rgba(245,158,11,0.15)',
  URGENT: 'rgba(239,68,68,0.15)',
}

const statusColors: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: '#8B5CF6',
  COMPLETED: '#22C55E',
  CANCELLED: '#6B7280',
}

const statusBg: Record<string, string> = {
  PENDING: 'rgba(245,158,11,0.15)',
  IN_PROGRESS: 'rgba(139,92,246,0.15)',
  COMPLETED: 'rgba(34,197,94,0.15)',
  CANCELLED: 'rgba(107,114,128,0.15)',
}

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterStatus, setFilterStatus] = React.useState('ALL')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tasks')
      const json = await res.json()
      if (json.success) setTasks(json.data)
      else setError(json.error || 'Failed to load tasks')
    } catch (_e) { setError('Failed to load tasks') }
    setLoading(false)
  }

  async function updateStatus(taskId: string, status: string) {
    setUpdatingId(taskId)
    setError('')
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as Task['status'], completedAt: status === 'COMPLETED' ? new Date().toISOString() : t.completedAt } : t))
      } else {
        setError(json.error || 'Failed to update task')
      }
    } catch (_e) { setError('Failed to update task') }
    setUpdatingId(null)
  }

  const filtered = filterStatus === 'ALL'
    ? tasks
    : tasks.filter(t => t.status === filterStatus)

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }

  const tabs = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ]

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false
    return new Date(task.dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">My Tasks</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          View and manage your assigned tasks ({filtered.length})
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: '#8B5CF6' },
          { label: 'Pending', value: stats.pending, color: '#F59E0B' },
          { label: 'In Progress', value: stats.inProgress, color: '#8B5CF6' },
          { label: 'Completed', value: stats.completed, color: '#22C55E' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '12px' }}
            className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: filterStatus === tab.key ? '#8B5CF6' : 'rgba(26,26,26,0.8)',
              color: filterStatus === tab.key ? '#fff' : '#9CA3AF',
              border: `1px solid ${filterStatus === tab.key ? '#8B5CF6' : '#2D2D2D'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Task Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2D2D2D' }}>
          <CheckSquare className="h-12 w-12 mb-4" style={{ color: '#374151' }} />
          <p className="text-gray-400">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue = isOverdue(task)
            const isExpanded = expandedId === task.id
            const isUpdating = updatingId === task.id

            return (
              <div
                key={task.id}
                style={{ background: '#1A1A1A', border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : '#2D2D2D'}`, borderRadius: '12px' }}
                className="overflow-hidden transition-all"
              >
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        <CheckSquare className="h-5 w-5 flex-shrink-0" style={{ color: statusColors[task.status] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: priorityBg[task.priority], color: priorityColors[task.priority] }}
                          >
                            {task.priority}
                          </span>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: statusBg[task.status], color: statusColors[task.status] }}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.department && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA' }}>
                              {task.department.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-sm" style={{ color: overdue ? '#F87171' : '#6B7280' }}>
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      )}
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      }
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5" style={{ borderTop: '1px solid #2D2D2D', paddingTop: '16px' }}>
                    {task.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#6D28D9' }}>Description</p>
                        <p className="text-sm" style={{ color: '#D1D5DB' }}>{task.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#6D28D9' }}>Created</p>
                        <p className="text-sm" style={{ color: '#9CA3AF' }}>
                          {new Date(task.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {task.completedAt && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#6D28D9' }}>Completed</p>
                          <p className="text-sm" style={{ color: '#22C55E' }}>
                            {new Date(task.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-2 flex-wrap pt-2" style={{ borderTop: '1px solid #2D2D2D' }}>
                        {task.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'IN_PROGRESS') }}
                            disabled={isUpdating}
                            style={{ background: '#8B5CF6' }}
                            className="hover:opacity-90"
                          >
                            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Mark In Progress
                          </Button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'COMPLETED') }}
                              disabled={isUpdating}
                              style={{ background: '#22C55E' }}
                              className="hover:opacity-90"
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                              Mark Complete
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); updateStatus(task.id, 'CANCELLED') }}
                          disabled={isUpdating}
                          style={{ border: '1px solid #2D2D2D', color: '#9CA3AF' }}
                          className="hover:bg-white/5"
                        >
                          {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
