'use client'

import * as React from 'react'
import { Search, FileText, Film, Image as ImageIcon, Presentation, FileSpreadsheet, Clock, Eye, FolderOpen, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

const CATEGORIES = ['All', 'IT', 'HR', 'Safety', 'Compliance', 'Leadership', 'Onboarding', 'General'] as const
const PROGRESS_FILTERS = ['All', 'In Progress', 'Completed'] as const

interface LearningModule {
  id: string
  title: string
  description?: string | null
  category: string
  fileUrl?: string | null
  fileName?: string | null
  fileType?: string | null
  duration?: string | null
  views: number
  isActive: boolean
}

interface Progress {
  moduleId: string
  progress: number
  isCompleted: boolean
  lastAccessedAt?: Date
}

const mockModules: LearningModule[] = [
  {
    id: '1', title: 'Information Security Basics', description: 'Learn the fundamentals of keeping company data secure. Covers password policies, phishing awareness, and data classification.',
    category: 'IT', fileType: 'PDF', duration: '30 minutes', views: 245, isActive: true,
  },
  {
    id: '2', title: 'Onboarding: Company Culture', description: 'Get to know our values, mission, and workplace culture. Essential reading for all new employees.',
    category: 'Onboarding', fileType: 'MP4', duration: '45 minutes', views: 189, isActive: true,
  },
  {
    id: '3', title: 'Fire Safety Procedures', description: 'Emergency response and fire safety protocols every employee must know.',
    category: 'Safety', fileType: 'PDF', duration: '20 minutes', views: 312, isActive: true,
  },
  {
    id: '4', title: 'HR Policies Overview', description: 'Understanding leave, benefits, and company policies. Complete guide to HR processes.',
    category: 'HR', fileType: 'PPTX', duration: '1 hour', views: 156, isActive: true,
  },
  {
    id: '5', title: 'Anti-Harassment Training', description: 'Creating a respectful and inclusive workplace. Mandatory compliance training.',
    category: 'Compliance', fileType: 'MP4', duration: '90 minutes', views: 98, isActive: true,
  },
  {
    id: '6', title: 'Leadership Skills Workshop', description: 'Building effective leadership and management capabilities for team leads and managers.',
    category: 'Leadership', fileType: 'PPTX', duration: '2 hours', views: 67, isActive: true,
  },
  {
    id: '7', title: 'React Framework Guide', description: 'Internal guide for React development standards and best practices.',
    category: 'IT', fileType: 'DOCX', duration: '3 hours', views: 203, isActive: true,
  },
  {
    id: '8', title: 'Data Privacy & GDPR', description: 'Understanding data privacy regulations and GDPR compliance requirements.',
    category: 'Compliance', fileType: 'PDF', duration: '1.5 hours', views: 142, isActive: true,
  },
]

const mockProgress: Record<string, Progress> = {
  '1': { moduleId: '1', progress: 100, isCompleted: true, lastAccessedAt: new Date('2024-04-10') },
  '2': { moduleId: '2', progress: 60, isCompleted: false, lastAccessedAt: new Date('2024-04-18') },
  '3': { moduleId: '3', progress: 100, isCompleted: true, lastAccessedAt: new Date('2024-04-05') },
  '5': { moduleId: '5', progress: 25, isCompleted: false, lastAccessedAt: new Date('2024-04-19') },
  '7': { moduleId: '7', progress: 0, isCompleted: false },
}

function getFileIcon(fileType?: string | null) {
  if (!fileType) return <FileText className="h-8 w-8" />
  switch (fileType.toUpperCase()) {
    case 'PDF': return <FileText className="h-8 w-8 text-red-400" />
    case 'MP4': case 'AVI': case 'MOV': return <Film className="h-8 w-8 text-blue-400" />
    case 'PNG': case 'JPG': case 'JPEG': return <ImageIcon className="h-8 w-8 text-green-400" />
    case 'PPTX': return <Presentation className="h-8 w-8 text-orange-400" />
    case 'XLSX': case 'XLS': return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    case 'DOCX': case 'DOC': return <FileText className="h-8 w-8 text-blue-300" />
    default: return <FileText className="h-8 w-8 text-gray-400" />
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'IT': return 'bg-blue-600/20 text-blue-400 border-blue-600/30'
    case 'HR': return 'bg-pink-600/20 text-pink-400 border-pink-600/30'
    case 'Safety': return 'bg-red-600/20 text-red-400 border-red-600/30'
    case 'Compliance': return 'bg-amber-600/20 text-amber-400 border-amber-600/30'
    case 'Leadership': return 'bg-purple-600/20 text-purple-400 border-purple-600/30'
    case 'Onboarding': return 'bg-green-600/20 text-green-400 border-green-600/30'
    default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30'
  }
}

export default function EmployeeLearningPage() {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All')
  const [progressFilter, setProgressFilter] = React.useState<string>('All')
  const [data, setData] = React.useState<LearningModule[]>(mockModules)
  const [progress, setProgress] = React.useState<Record<string, Progress>>(mockProgress)
  const [loading, setLoading] = React.useState(false)

  const fetchModules = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'All') params.set('category', categoryFilter)

      const res = await fetch(`/api/learning?${params}`)
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setData(json.data.filter((m: LearningModule) => m.isActive))
      }
    } catch (_e) {
      // Use mock data
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  const fetchProgress = React.useCallback(async () => {
    try {
      const res = await fetch('/api/learning/progress')
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        const progressMap: Record<string, Progress> = {}
        json.data.forEach((p: any) => {
          progressMap[p.moduleId] = p
        })
        setProgress(progressMap)
      }
    } catch (_e) {
      // Use mock progress
    }
  }, [])

  React.useEffect(() => {
    fetchModules()
    fetchProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredData = React.useMemo(() => {
    return data.filter(mod => {
      const matchesSearch = !search ||
        mod.title.toLowerCase().includes(search.toLowerCase()) ||
        mod.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'All' || mod.category === categoryFilter
      const modProgress = progress[mod.id]
      const matchesProgress = progressFilter === 'All' ||
        (progressFilter === 'In Progress' && modProgress && !modProgress.isCompleted && modProgress.progress > 0) ||
        (progressFilter === 'Completed' && modProgress?.isCompleted)
      return matchesSearch && matchesCategory && matchesProgress
    })
  }, [data, search, categoryFilter, progressFilter, progress])

  // Stats
  const stats = React.useMemo(() => {
    const total = data.length
    const completed = Object.values(progress).filter(p => p.isCompleted).length
    const inProgress = Object.values(progress).filter(p => !p.isCompleted && p.progress > 0).length
    return { total, completed, inProgress }
  }, [data, progress])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Learning Center</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Access training modules and educational content
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4 text-center" style={{ background: '#1A1A1A' }}>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Total Modules</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center" style={{ background: '#1A1A1A' }}>
          <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Completed</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center" style={{ background: '#1A1A1A' }}>
          <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>In Progress</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
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
        <div className="flex flex-wrap gap-2">
          {PROGRESS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setProgressFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: progressFilter === f ? '#A78BFA' : '#1A1A1A',
                color: progressFilter === f ? '#0F0F0F' : '#9CA3AF',
                border: '1px solid #2D2D2D',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border h-64 animate-pulse"
              style={{ background: '#1A1A1A' }}
            />
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
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((mod) => {
            const modProgress = progress[mod.id]
            const progressValue = modProgress?.progress || 0
            const isCompleted = modProgress?.isCompleted || false

            return (
              <div
                key={mod.id}
                className="rounded-xl border border-border overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
                style={{ background: '#1A1A1A' }}
              >
                {/* File Type Header */}
                <div
                  className="h-20 flex items-center justify-center"
                  style={{ background: '#262626' }}
                >
                  {getFileIcon(mod.fileType)}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${getCategoryColor(mod.category)}`}>
                      {mod.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                      <Eye className="h-3 w-3" />
                      {mod.views}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{mod.title}</h3>

                  {mod.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: '#9CA3AF' }}>
                      {mod.description}
                    </p>
                  )}

                  {mod.duration && (
                    <div className="flex items-center gap-1 text-xs mb-3" style={{ color: '#9CA3AF' }}>
                      <Clock className="h-3 w-3" />
                      {mod.duration}
                    </div>
                  )}

                  {/* Progress */}
                  {progressValue > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: '#9CA3AF' }}>Progress</span>
                        <span className={isCompleted ? 'text-green-400' : 'text-white'}>
                          {progressValue}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressValue}%`,
                            background: isCompleted ? '#22C55E' : '#8B5CF6',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  <Button asChild className="w-full" size="sm">
                    <Link href={`/employee/learning/${mod.id}`}>
                      {progressValue === 0 ? (
                        <>
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          Start
                        </>
                      ) : isCompleted ? (
                        <>
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Review
                        </>
                      ) : (
                        <>
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          Continue
                        </>
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
