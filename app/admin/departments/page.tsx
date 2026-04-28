'use client'

import * as React from 'react'
import { Plus, Search, Edit, Trash2, Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Department {
  id: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  _count: {
    employees: number
    tasks: number
  }
}

interface DepartmentForm {
  name: string
  code: string
  description: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editDepartment, setEditDepartment] = React.useState<Department | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<DepartmentForm>({ name: '', code: '', description: '' })
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    fetchDepartments()
  }, [])

  async function fetchDepartments() {
    setLoading(true)
    try {
      const res = await fetch('/api/departments')
      const json = await res.json()
      if (json.success) setDepartments(json.data)
    } catch (_e) { /* silent */ }
    setLoading(false)
  }

  function openAdd() {
    setEditDepartment(null)
    setForm({ name: '', code: '', description: '' })
    setError('')
    setDialogOpen(true)
  }

  function openEdit(dept: Department) {
    setEditDepartment(dept)
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' })
    setError('')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editDepartment ? `/api/departments/${editDepartment.id}` : '/api/departments'
      const res = await fetch(url, {
        method: editDepartment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setDialogOpen(false)
        fetchDepartments()
      } else {
        setError(json.error || 'Something went wrong')
      }
    } catch (_e) { setError('Internal server error') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!departmentToDelete) return
    setSaving(true)
    try {
      const res = await fetch(`/api/departments/${departmentToDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setDeleteDialogOpen(false)
        fetchDepartments()
      } else {
        setError(json.error || 'Cannot delete')
      }
    } catch (_e) { setError('Internal server error') }
    setSaving(false)
  }

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Departments</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Manage company departments ({filtered.length} total)
          </p>
        </div>
        <Button
          onClick={openAdd}
          style={{ background: '#8B5CF6' }}
          className="hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7280' }} />
        <Input
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2D2D2D', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 className="h-12 w-12 mb-4" style={{ color: '#374151' }} />
            <p className="text-gray-400">No departments found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2D2D2D' }}>
                  {['Name', 'Code', 'Employees', 'Tasks', 'Active', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: '#6D28D9' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((dept, i) => (
                  <tr key={dept.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2D2D2D' : 'none' }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-medium text-white">{dept.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>{dept.code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="secondary" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                        {dept._count.employees}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="secondary" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                        {dept._count.tasks}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        dept.isActive ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-white/10"
                          onClick={() => openEdit(dept)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-900/20"
                          onClick={() => { setDepartmentToDelete(dept); setDeleteDialogOpen(true) }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#E5E7EB' }}>
              {editDepartment ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              {editDepartment ? 'Update department details below.' : 'Create a new department for your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dept-name" style={{ color: '#E5E7EB' }}>Department Name</Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering"
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code" style={{ color: '#E5E7EB' }}>Department Code</Label>
              <Input
                id="dept-code"
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. ENG"
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc" style={{ color: '#E5E7EB' }}>Description</Label>
              <textarea
                id="dept-desc"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-600"
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#E5E7EB' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              style={{ border: '1px solid #2D2D2D', color: '#E5E7EB' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#8B5CF6' }}
              className="hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#E5E7EB' }}>Delete Department</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Are you sure you want to delete <strong style={{ color: '#E5E7EB' }}>{departmentToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              style={{ border: '1px solid #2D2D2D', color: '#E5E7EB' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              style={{ background: '#EF4444' }}
              className="hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
