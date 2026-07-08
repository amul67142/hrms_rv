'use client'

import * as React from 'react'
import { Plus, Edit, Trash2, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, Column } from '@/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

interface Holiday {
  id: string
  name: string
  date: string | Date
  year: number
  description: string | null
}

export default function HolidaysPage() {
  const { toast } = useToast()
  const [holidays, setHolidays] = React.useState<Holiday[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [year, setYear] = React.useState(String(new Date().getFullYear()))
  
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingHoliday, setEditingHoliday] = React.useState<Holiday | null>(null)
  const [formData, setFormData] = React.useState({ name: '', date: '', description: '' })
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedHoliday, setSelectedHoliday] = React.useState<Holiday | null>(null)

  // Fetch holidays from dynamic API
  const fetchHolidays = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/holidays?year=${year}`)
      const json = await res.json()
      if (json.success) {
        setHolidays(json.data)
      } else {
        toast({
          title: 'Error',
          description: json.error || 'Failed to load holidays',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Fetch holidays error:', err)
      toast({
        title: 'Error',
        description: 'Failed to connect to backend service',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [year, toast])

  React.useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const columns: Column<Holiday>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      className: 'text-white font-medium',
      render: (row) => formatDate(row.date, 'dd MMM yyyy'),
    },
    {
      key: 'name',
      header: 'Holiday Name',
      sortable: true,
      className: 'text-white font-semibold',
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-gray-400',
      render: (row) => row.description || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24 text-right',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => {
              setEditingHoliday(row)
              setFormData({
                name: row.name,
                date: new Date(row.date).toISOString().split('T')[0],
                description: row.description || '',
              })
              setDialogOpen(true)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-950/20"
            onClick={() => {
              setSelectedHoliday(row)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.date) {
      toast({
        title: 'Validation Error',
        description: 'Name and date are required fields.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : '/api/holidays'
      const method = editingHoliday ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          date: formData.date,
          description: formData.description.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast({
          title: 'Success',
          description: `Holiday ${editingHoliday ? 'updated' : 'added'} successfully`,
        })
        setDialogOpen(false)
        setEditingHoliday(null)
        setFormData({ name: '', date: '', description: '' })
        fetchHolidays()
      } else {
        toast({
          title: 'Error',
          description: json.error || 'Failed to submit holiday details',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Submit holiday error:', err)
      toast({
        title: 'Error',
        description: 'Failed to process transaction',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedHoliday) return

    try {
      const res = await fetch(`/api/holidays/${selectedHoliday.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        toast({
          title: 'Deleted',
          description: 'Holiday deleted successfully',
        })
        setDeleteDialogOpen(false)
        setSelectedHoliday(null)
        fetchHolidays()
      } else {
        toast({
          title: 'Error',
          description: json.error || 'Failed to delete holiday',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Delete holiday error:', err)
      toast({
        title: 'Error',
        description: 'Failed to complete deletion',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Holidays</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Manage company holidays dynamically
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Year Filter Select Dropdown */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#8B5CF6]"
            style={{
              background: '#1A1A1A',
              color: 'white',
              borderColor: '#2D2D2D',
              borderWidth: '1px',
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = String(new Date().getFullYear() - 2 + i)
              return (
                <option key={y} value={y}>
                  Year {y}
                </option>
              )
            })}
          </select>

          <Button
            onClick={() => {
              setEditingHoliday(null)
              setFormData({ name: '', date: '', description: '' })
              setDialogOpen(true)
            }}
            className="gap-2"
            style={{ background: '#8B5CF6' }}
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={holidays}
        keyField="id"
        searchable={false}
        loading={loading}
        emptyMessage="No holidays found for this year"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="rounded-xl border-0 max-w-md"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
            </DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Enter the company holiday details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="holiday-name" className="text-white">
                Holiday Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="holiday-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Diwali, Independence Day"
                style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date" className="text-white">
                Date <span className="text-red-400">*</span>
              </Label>
              <Input
                id="holiday-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-desc" className="text-white">
                Description
              </Label>
              <Textarea
                id="holiday-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes or details"
                rows={3}
                style={{ background: '#262626', color: 'white', borderColor: '#2D2D2D' }}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              style={{ borderColor: '#2D2D2D', color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.name.trim() || !formData.date}
              style={{ background: '#8B5CF6' }}
              className="gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingHoliday ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className="rounded-xl border-0 max-w-sm"
          style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Delete Holiday</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Are you sure you want to delete &quot;{selectedHoliday?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              style={{ borderColor: '#2D2D2D', color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              style={{ background: '#EF4444' }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
