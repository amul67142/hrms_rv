'use client'

import * as React from 'react'
import { Plus, Search, Edit, Trash2, Eye, FileText, Video, Image as ImageIcon, Presentation, FileSpreadsheet, Film, FolderOpen, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const CATEGORIES = ['All', 'IT', 'HR', 'Safety', 'Compliance', 'Leadership', 'Onboarding', 'General'] as const

interface LearningModule {
  id: string
  title: string
  description?: string | null
  category: string
  fileUrl?: string | null
  fileName?: string | null
  fileType?: string | null
  fileSize?: number | null
  thumbnailUrl?: string | null
  duration?: string | null
  isFeatured: boolean
  isActive: boolean
  views: number
  createdAt: Date
  updatedAt: Date
}

const mockModules: LearningModule[] = [
  {
    id: '1', title: 'Information Security Basics', description: 'Learn the fundamentals of keeping company data secure.',
    category: 'IT', fileType: 'PDF', duration: '30 minutes', views: 245, isFeatured: true, isActive: true,
    createdAt: new Date('2024-01-10'), updatedAt: new Date('2024-03-15'),
  },
  {
    id: '2', title: 'Onboarding: Company Culture', description: 'Get to know our values, mission, and workplace culture.',
    category: 'Onboarding', fileType: 'MP4', duration: '45 minutes', views: 189, isFeatured: true, isActive: true,
    createdAt: new Date('2024-01-05'), updatedAt: new Date('2024-02-20'),
  },
  {
    id: '3', title: 'Fire Safety Procedures', description: 'Emergency response and fire safety protocols.',
    category: 'Safety', fileType: 'PDF', duration: '20 minutes', views: 312, isFeatured: false, isActive: true,
    createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-04-01'),
  },
  {
    id: '4', title: 'HR Policies Overview', description: 'Understanding leave, benefits, and company policies.',
    category: 'HR', fileType: 'PPTX', duration: '1 hour', views: 156, isFeatured: false, isActive: true,
    createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-03-10'),
  },
  {
    id: '5', title: 'Anti-Harassment Training', description: 'Creating a respectful and inclusive workplace.',
    category: 'Compliance', fileType: 'MP4', duration: '90 minutes', views: 98, isFeatured: false, isActive: false,
    createdAt: new Date('2024-01-20'), updatedAt: new Date('2024-04-05'),
  },
  {
    id: '6', title: 'Leadership Skills Workshop', description: 'Building effective leadership and management capabilities.',
    category: 'Leadership', fileType: 'PPTX', duration: '2 hours', views: 67, isFeatured: true, isActive: true,
    createdAt: new Date('2024-03-01'), updatedAt: new Date('2024-04-10'),
  },
  {
    id: '7', title: 'React Framework Guide', description: 'Internal guide for React development standards.',
    category: 'IT', fileType: 'DOCX', duration: '3 hours', views: 203, isFeatured: false, isActive: true,
    createdAt: new Date('2024-02-15'), updatedAt: new Date('2024-04-15'),
  },
]

function getFileIcon(fileType?: string | null) {
  if (!fileType) return <FileText className="h-5 w-5" />
  switch (fileType.toUpperCase()) {
    case 'PDF': return <FileText className="h-5 w-5 text-red-400" />
    case 'MP4': case 'AVI': case 'MOV': return <Film className="h-5 w-5 text-blue-400" />
    case 'PNG': case 'JPG': case 'JPEG': return <ImageIcon className="h-5 w-5 text-green-400" />
    case 'PPTX': case 'PPTX': return <Presentation className="h-5 w-5 text-orange-400" />
    case 'XLSX': case 'XLS': return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    case 'DOCX': case 'DOC': return <FileText className="h-5 w-5 text-blue-300" />
    default: return <FileText className="h-5 w-5 text-gray-400" />
  }
}

function getFileTypeColor(fileType?: string | null): string {
  if (!fileType) return '#9CA3AF'
  switch (fileType.toUpperCase()) {
    case 'PDF': return '#EF4444'
    case 'MP4': case 'AVI': case 'MOV': return '#3B82F6'
    case 'PNG': case 'JPG': case 'JPEG': return '#22C55E'
    case 'PPTX': return '#F97316'
    case 'XLSX': case 'XLS': return '#22C55E'
    case 'DOCX': case 'DOC': return '#60A5FA'
    default: return '#9CA3AF'
  }
}

export default function AdminLearningPage() {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All')
  const [data, setData] = React.useState<LearningModule[]>(mockModules)
  const [loading, setLoading] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedModule, setSelectedModule] = React.useState<LearningModule | null>(null)

  const fetchModules = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'All') params.set('category', categoryFilter)

      const res = await fetch(`/api/learning?${params}`)
      const json = await res.json()
      // Only use API data if successful, otherwise show empty state
      if (json.success) {
        setData(json.data)
      }
    } catch (_e) {
      // Network error - clear data instead of falling back to mock
      setData([])
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  React.useEffect(() => {
    fetchModules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredData = React.useMemo(() => {
    return data.filter(mod => {
      const matchesSearch = !search ||
        mod.title.toLowerCase().includes(search.toLowerCase()) ||
        mod.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'All' || mod.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [data, search, categoryFilter])

  function handleDelete(mod: LearningModule) {
    setSelectedModule(mod)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!selectedModule) return
    try {
      const res = await fetch(`/api/learning/${selectedModule.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setData(prev => prev.filter(m => m.id !== selectedModule.id))
        toast({ title: 'Module deleted', description: `${selectedModule.title} has been removed.` })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to delete module.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete module. Please try again.', variant: 'destructive' })
    }
    setDeleteDialogOpen(false)
    setSelectedModule(null)
  }

  async function handleFeaturedToggle(mod: LearningModule) {
    const newFeatured = !mod.isFeatured
    try {
      await fetch(`/api/learning/${mod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: newFeatured }),
      })
    } catch (_e) {
      // Proceed with local update
    }
    setData(prev => prev.map(m => m.id === mod.id ? { ...m, isFeatured: newFeatured } : m))
    toast({ title: newFeatured ? 'Featured' : 'Unfeatured', description: `${mod.title} is now ${newFeatured ? 'featured' : 'not featured'}.` })
  }

  async function handleActiveToggle(mod: LearningModule) {
    const newActive = !mod.isActive
    try {
      await fetch(`/api/learning/${mod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      })
    } catch (_e) {
      // Proceed with local update
    }
    setData(prev => prev.map(m => m.id === mod.id ? { ...m, isActive: newActive } : m))
    toast({ title: newActive ? 'Module activated' : 'Module deactivated', description: `${mod.title} is now ${newActive ? 'active' : 'inactive'}.` })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Learning Management</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Manage training modules and educational content ({filteredData.length} total)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/learning/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: categoryFilter === cat ? '#8B5CF6' : '#262626',
                color: categoryFilter === cat ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1A1A1A' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 border-b border-border flex items-center gap-4 px-6">
              <div className="h-4 bg-surface-light rounded animate-pulse flex-1" />
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div
          className="rounded-xl border border-border flex flex-col items-center justify-center py-20"
          style={{ background: '#1A1A1A' }}
        >
          <div className="p-4 rounded-full mb-4" style={{ background: '#262626' }}>
            <FolderOpen className="h-8 w-8" style={{ color: '#9CA3AF' }} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No modules found</h3>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>Add your first learning module or adjust filters</p>
          <Button asChild>
            <Link href="/admin/learning/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1A1A1A' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#262626' }}>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>Title</th>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>Category</th>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>File Type</th>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>Views</th>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>Featured</th>
                <th className="h-12 px-4 text-left text-xs font-semibold" style={{ color: '#FFFFFF' }}>Status</th>
                <th className="h-12 px-4 text-right text-xs font-semibold" style={{ color: '#FFFFFF' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((mod) => (
                <tr key={mod.id} className="border-t border-border hover:bg-surface-light/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ background: '#262626' }}
                      >
                        {getFileIcon(mod.fileType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{mod.title}</p>
                          {mod.isFeatured && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <p className="text-xs truncate max-w-xs" style={{ color: '#9CA3AF' }}>
                          {mod.description || mod.duration || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="purple">{mod.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(mod.fileType)}
                      <span className="text-sm" style={{ color: getFileTypeColor(mod.fileType) }}>
                        {mod.fileType || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">{mod.views}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={mod.isFeatured}
                      onCheckedChange={() => handleFeaturedToggle(mod)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={mod.isActive}
                      onCheckedChange={() => handleActiveToggle(mod)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-gray-400 hover:text-white"
                      >
                        <Link href={`/admin/learning/edit/${mod.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(mod)}
                        className="h-8 px-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedModule?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
