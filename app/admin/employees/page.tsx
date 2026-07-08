'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, Eye, Download, Trash, CheckSquare, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, Column } from '@/components/data-table'
import type { EmployeeStatus } from '@/types'
import { formatDate } from '@/lib/core/utils'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

const STATUS_OPTIONS: { value: EmployeeStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: '#22C55E' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#3B82F6' },
  { value: 'INACTIVE', label: 'Inactive', color: '#6B7280' },
  { value: 'RESIGNED', label: 'Resigned', color: '#F59E0B' },
  { value: 'TERMINATED', label: 'Terminated', color: '#EF4444' },
]

const statusColor = (s: EmployeeStatus) => STATUS_OPTIONS.find(o => o.value === s)?.color ?? '#6B7280'
const statusLabel = (s: EmployeeStatus) => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s

interface EmployeeRow {
  id: string
  employeeCode: string
  esslCode: string | null
  firstName: string
  lastName: string
  email: string
  department: string
  designation: string
  joiningDate: Date
  employmentType: string
  status: EmployeeStatus
  phone: string | null
  gender: string | null
  createdAt: Date
  updatedAt: Date
}

export default function EmployeesPage() {
  const { toast } = useToast()
  const [data, setData] = React.useState<EmployeeRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [search, setSearch] = React.useState('')

  // Single employee actions
  const [target, setTarget] = React.useState<EmployeeRow | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<EmployeeStatus>('ACTIVE')
  const [actionLoading, setActionLoading] = React.useState(false)

  // Bulk
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [bulkStatusOpen, setBulkStatusOpen] = React.useState(false)
  const [bulkStatus, setBulkStatus] = React.useState<EmployeeStatus>('ACTIVE')
  const [bulkLoading, setBulkLoading] = React.useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEmployees = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize), search })
      const res = await fetch(`/api/employees?${params}`)
      const result = await res.json()
      if (result.success) { setData(result.data); setTotal(result.total) }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, toast])

  React.useEffect(() => { fetchEmployees() }, [fetchEmployees])
  React.useEffect(() => { setSelectedIds(new Set()) }, [page])

  // ── Single delete ──────────────────────────────────────────────────────────
  const handleDelete = async (hard = false) => {
    if (!target) return
    setActionLoading(true)
    try {
      const url = hard ? `/api/employees/${target.id}?hard=true` : `/api/employees/${target.id}`
      const res = await fetch(url, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        toast({ title: 'Done', description: result.message })
        setDeleteOpen(false)
        setTarget(null)
        fetchEmployees()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete employee', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Single status change ───────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (!target) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/employees/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: 'Status updated', description: `${target.firstName} is now ${statusLabel(newStatus)}` })
        setStatusOpen(false)
        setTarget(null)
        fetchEmployees()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update status', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Bulk delete (single API call) ─────────────────────────────────────────
  const handleBulkDelete = async (hard = false) => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const url = hard ? '/api/employees/bulk-delete?hard=true' : '/api/employees/bulk-delete'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: '✅ Done', description: data.message })
        setBulkDeleteOpen(false)
        setSelectedIds(new Set())
        fetchEmployees()
      } else {
        toast({ title: 'Error', description: data.error || 'Operation failed', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Bulk delete failed:', err)
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Bulk status change ─────────────────────────────────────────────────────
  const handleBulkStatus = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    let success = 0; let failed = 0
    for (const id of Array.from(selectedIds)) {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: bulkStatus }),
      })
      const d = await res.json()
      if (d.success) success++; else failed++
    }
    setBulkLoading(false)
    setBulkStatusOpen(false)
    setSelectedIds(new Set())
    fetchEmployees()
    if (failed === 0) toast({ title: 'Done', description: `${success} employee(s) updated to ${statusLabel(bulkStatus)}` })
    else toast({ title: 'Partial success', description: `${success} updated, ${failed} failed`, variant: 'destructive' })
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: Column<EmployeeRow>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedIds.size === data.length && data.length > 0}
          onCheckedChange={(checked) => setSelectedIds(checked ? new Set(data.map(d => d.id)) : new Set())}
          aria-label="Select all"
        />
      ),
      className: 'w-12',
      render: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={(checked) => {
            const s = new Set(selectedIds)
            checked ? s.add(row.id) : s.delete(row.id)
            setSelectedIds(s)
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${row.firstName}`}
        />
      ),
    },
    {
      key: 'employeeCode',
      header: 'ID',
      sortable: true,
      className: 'font-mono text-xs text-gray-400',
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'esslCode',
      header: 'ESSL ID',
      render: (row: EmployeeRow) => (
        <span className="font-mono text-xs" style={{ color: row.esslCode ? '#A78BFA' : '#4B5563' }}>
          {row.esslCode || '\u2014'}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => <span className="text-gray-300">{row.department}</span>,
    },
    {
      key: 'designation',
      header: 'Designation',
      sortable: true,
      render: (row) => <span className="text-gray-300">{row.designation}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          className="text-white text-xs cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: statusColor(row.status) }}
          onClick={() => { setTarget(row); setNewStatus(row.status); setStatusOpen(true) }}
          title="Click to change status"
        >
          {statusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      sortable: true,
      render: (row) => (
        <span className="text-gray-400 text-sm">{formatDate(row.joiningDate.toString(), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-16',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-white/10 w-48" style={{ background: '#1A1A1A' }}>
            <DropdownMenuItem asChild>
              <Link href={`/admin/employees/${row.id}`} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <Eye className="mr-2 h-4 w-4" /> View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/employees/${row.id}/edit`} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="text-xs text-gray-500 px-2 py-1">Change Status</DropdownMenuLabel>
            {STATUS_OPTIONS.filter(o => o.value !== row.status).map(o => (
              <DropdownMenuItem
                key={o.value}
                className="text-gray-300 hover:text-white cursor-pointer"
                onClick={() => {
                  setTarget(row)
                  setNewStatus(o.value)
                  handleQuickStatus(row.id, o.value)
                }}
              >
                <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: o.color }} />
                {o.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-300 focus:bg-red-400/10 cursor-pointer"
              onClick={() => { setTarget(row); setDeleteOpen(true) }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Quick status change without dialog (from dropdown)
  const handleQuickStatus = async (id: string, status: EmployeeStatus) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: 'Status updated', description: `Changed to ${statusLabel(status)}` })
        fetchEmployees()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update status', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  const filteredData = React.useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(e =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    )
  }, [data, search])

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Employees</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            {total > 0 ? `${total} employee${total !== 1 ? 's' : ''} total` : 'Manage employee records'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-300 hover:text-white"
            onClick={fetchEmployees}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" asChild className="border-white/10 text-gray-300 hover:text-white hover:bg-white/10">
            <a href="/admin/employees/import">
              <Download className="mr-2 h-4 w-4" /> Import
            </a>
          </Button>
          <Button asChild className="text-white" style={{ background: '#8B5CF6' }}>
            <Link href="/admin/employees/add">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: '#8B5CF6' },
          { label: 'Active', value: data.filter(e => e.status === 'ACTIVE').length, color: '#22C55E' },
          { label: 'On Leave', value: data.filter(e => e.status === 'ON_LEAVE').length, color: '#3B82F6' },
          { label: 'Inactive', value: data.filter(e => ['RESIGNED', 'TERMINATED', 'INACTIVE'].includes(e.status)).length, color: '#F59E0B' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <div className="mt-2 h-0.5 rounded-full" style={{ background: stat.color, width: '40px' }} />
          </div>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl"
          style={{ background: '#1A1A1A', border: '1px solid #8B5CF6' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: '#8B5CF6' }}>
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">{selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''} selected</p>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-white">
                Clear selection
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkStatusOpen(true)}
              className="border-white/10 text-gray-300 hover:text-white"
            >
              <ChevronDown className="mr-1 h-4 w-4" /> Change Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              className="border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginatedData}
        keyField="id"
        loading={loading}
        searchPlaceholder="Search by name, email, code, department..."
        searchValue={search}
        onSearch={(val) => { setSearch(val); setPage(1) }}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        emptyMessage="No employees found"
      />

      {/* ── Single Delete Dialog ─────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-white/10 max-w-md" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <DialogTitle className="text-white">Delete Employee</DialogTitle>
            </div>
            <DialogDescription className="text-gray-400">
              What would you like to do with <strong className="text-white">{target?.firstName} {target?.lastName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Soft delete option */}
            <button
              onClick={() => handleDelete(false)}
              disabled={actionLoading}
              className="w-full text-left rounded-lg p-4 border transition-colors hover:border-yellow-500/50"
              style={{ background: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}
            >
              <p className="font-medium text-yellow-400 mb-1">Deactivate (Recommended)</p>
              <p className="text-xs text-gray-400">
                Sets status to Inactive and stamps a deleted date. Employee data is preserved. Can be reactivated anytime.
              </p>
            </button>

            {/* Hard delete option */}
            <button
              onClick={() => handleDelete(true)}
              disabled={actionLoading}
              className="w-full text-left rounded-lg p-4 border transition-colors hover:border-red-500/50"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="font-medium text-red-400">Permanently Delete</p>
              </div>
              <p className="text-xs text-gray-400">
                Removes the employee and ALL related data (attendance, salary, leaves, etc.) permanently. Cannot be undone.
              </p>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-white/10 text-gray-300" disabled={actionLoading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single Status Change Dialog ──────────────────────────────────────── */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="border-white/10 max-w-sm" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Change Status</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update status for <strong className="text-white">{target?.firstName} {target?.lastName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as EmployeeStatus)}>
              <SelectTrigger className="border-white/10 text-white" style={{ background: '#262626' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)} className="border-white/10 text-gray-300" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={actionLoading} className="text-white" style={{ background: '#8B5CF6' }}>
              {actionLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Dialog ───────────────────────────────────────────────── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(o) => { if (!bulkLoading) setBulkDeleteOpen(o) }}>
        <DialogContent className="border-white/10 max-w-md" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <DialogTitle className="text-white">
                Delete {selectedIds.size} Employee{selectedIds.size !== 1 ? 's' : ''}
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-400">
              Choose what to do with the <strong className="text-white">{selectedIds.size}</strong> selected employee{selectedIds.size !== 1 ? 's' : ''}:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Soft delete */}
            <button
              onClick={() => handleBulkDelete(false)}
              disabled={bulkLoading}
              className="w-full text-left rounded-lg p-4 border transition-colors hover:border-yellow-500/50 disabled:opacity-50"
              style={{ background: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}
            >
              <p className="font-medium text-yellow-400 mb-1">
                {bulkLoading ? 'Processing...' : `Deactivate ${selectedIds.size} Employee${selectedIds.size !== 1 ? 's' : ''} (Recommended)`}
              </p>
              <p className="text-xs text-gray-400">
                Sets all to Inactive and stamps a deleted date. Employee data is preserved. Can be reactivated anytime.
              </p>
            </button>

            {/* Hard delete */}
            <button
              onClick={() => handleBulkDelete(true)}
              disabled={bulkLoading}
              className="w-full text-left rounded-lg p-4 border transition-colors hover:border-red-500/50 disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="font-medium text-red-400">
                  {bulkLoading ? 'Processing...' : `Permanently Delete All ${selectedIds.size}`}
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Removes ALL data (attendance, salary, leaves, etc.) for every selected employee permanently. Cannot be undone.
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
