'use client'

import * as React from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
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
  date: Date
  year: number
  description: string
}

const mockHolidays: Holiday[] = [
  { id: '1', name: 'Republic Day', date: new Date('2024-01-26'), year: 2024, description: 'National holiday' },
  { id: '2', name: 'Holi', date: new Date('2024-03-25'), year: 2024, description: 'Festival of colors' },
  { id: '3', name: 'Good Friday', date: new Date('2024-03-29'), year: 2024, description: '' },
  { id: '4', name: 'Independence Day', date: new Date('2024-08-15'), year: 2024, description: 'National holiday' },
  { id: '5', name: 'Gandhi Jayanti', date: new Date('2024-10-02'), year: 2024, description: '' },
  { id: '6', name: 'Diwali', date: new Date('2024-11-01'), year: 2024, description: 'Festival of lights' },
  { id: '7', name: 'Christmas', date: new Date('2024-12-25'), year: 2024, description: '' },
]

export default function HolidaysPage() {
  const { toast } = useToast()
  const [holidays, setHolidays] = React.useState(mockHolidays)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingHoliday, setEditingHoliday] = React.useState<Holiday | null>(null)
  const [formData, setFormData] = React.useState({ name: '', date: '', description: '' })
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedHoliday, setSelectedHoliday] = React.useState<Holiday | null>(null)

  const columns: Column<Holiday>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (row) => formatDate(row.date.toString(), 'dd MMM yyyy') },
    { key: 'name', header: 'Holiday Name', sortable: true },
    { key: 'description', header: 'Description', render: (row) => row.description || '-' },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingHoliday(row); setFormData({ name: row.name, date: new Date(row.date).toISOString().split('T')[0], description: row.description }); setDialogOpen(true) }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setSelectedHoliday(row); setDeleteDialogOpen(true) }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const handleSubmit = () => {
    if (editingHoliday) {
      setHolidays(holidays.map(h => h.id === editingHoliday.id ? { ...h, name: formData.name, date: new Date(formData.date), description: formData.description } : h))
      toast({ title: 'Updated', description: 'Holiday updated successfully' })
    } else {
      const newHoliday: Holiday = { id: String(Date.now()), name: formData.name, date: new Date(formData.date), year: new Date(formData.date).getFullYear(), description: formData.description }
      setHolidays([...holidays, newHoliday])
      toast({ title: 'Created', description: 'Holiday added successfully' })
    }
    setDialogOpen(false)
    setEditingHoliday(null)
    setFormData({ name: '', date: '', description: '' })
  }

  const handleDelete = () => {
    setHolidays(holidays.filter(h => h.id !== selectedHoliday?.id))
    toast({ title: 'Deleted', description: 'Holiday deleted successfully' })
    setDeleteDialogOpen(false)
    setSelectedHoliday(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Holidays</h2>
          <p className="text-sm text-slate-500 mt-1">Manage company holidays</p>
        </div>
        <Button onClick={() => { setEditingHoliday(null); setFormData({ name: '', date: '', description: '' }); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Holiday
        </Button>
      </div>

      <DataTable columns={columns} data={holidays} keyField="id" searchable={false} />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
            <DialogDescription>Enter the holiday details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input id="holiday-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Republic Day" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input id="holiday-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-desc">Description</Label>
              <Textarea id="holiday-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.date}>{editingHoliday ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>Are you sure you want to delete &quot;{selectedHoliday?.name}&quot;?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
