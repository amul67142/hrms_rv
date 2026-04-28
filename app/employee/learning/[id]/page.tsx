'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Film, Image as ImageIcon, Presentation, FileSpreadsheet, CheckCircle2, Clock, Eye, Download, ExternalLink, X, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

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
  views: number
  isActive: boolean
  isFeatured?: boolean
}

interface ModuleProgress {
  progress: number
  isCompleted: boolean
  completedAt?: Date
}

const mockModule: LearningModule = {
  id: '1',
  title: 'Information Security Basics',
  description: 'Learn the fundamentals of keeping company data secure. This module covers password policies, phishing awareness, social engineering, data classification, and incident reporting procedures.',
  category: 'IT',
  fileUrl: '/sample.pdf',
  fileName: 'information-security-basics.pdf',
  fileType: 'PDF',
  fileSize: 2456000,
  thumbnailUrl: null,
  duration: '30 minutes',
  views: 245,
  isActive: true,
  isFeatured: true,
}

const mockRelatedModules: LearningModule[] = [
  { id: '7', title: 'React Framework Guide', category: 'IT', fileType: 'DOCX', duration: '3 hours', views: 203, isActive: true, description: 'Internal guide for React development standards.' },
  { id: '8', title: 'Data Privacy & GDPR', category: 'Compliance', fileType: 'PDF', duration: '1.5 hours', views: 142, isActive: true, description: 'Understanding data privacy regulations.' },
  { id: '3', title: 'Fire Safety Procedures', category: 'Safety', fileType: 'PDF', duration: '20 minutes', views: 312, isActive: true, description: 'Emergency response and fire safety protocols.' },
]

function getFileIcon(fileType?: string | null) {
  if (!fileType) return <FileText className="h-10 w-10 text-gray-400" />
  switch (fileType.toUpperCase()) {
    case 'PDF': return <FileText className="h-10 w-10 text-red-400" />
    case 'MP4': case 'AVI': case 'MOV': return <Film className="h-10 w-10 text-blue-400" />
    case 'PNG': case 'JPG': case 'JPEG': return <ImageIcon className="h-10 w-10 text-green-400" />
    case 'PPTX': return <Presentation className="h-10 w-10 text-orange-400" />
    case 'XLSX': case 'XLS': return <FileSpreadsheet className="h-10 w-10 text-green-500" />
    case 'DOCX': case 'DOC': return <FileText className="h-10 w-10 text-blue-300" />
    default: return <FileText className="h-10 w-10 text-gray-400" />
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

export default function LearningModuleViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const moduleId = params.id as string
  const [module, setModule] = React.useState<LearningModule | null>(mockModule)
  const [progress, setProgress] = React.useState<ModuleProgress>({ progress: 0, isCompleted: false })
  const [loading, setLoading] = React.useState(true)
  const [completing, setCompleting] = React.useState(false)
  const [showFullscreen, setShowFullscreen] = React.useState(false)

  const fetchModule = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/learning/${moduleId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setModule(json.data)
      }
    } catch (_e) {
      setModule(mockModule)
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  const fetchProgress = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/learning/${moduleId}/progress`)
      const json = await res.json()
      if (json.success && json.data) {
        setProgress({
          progress: json.data.progress || 0,
          isCompleted: json.data.isCompleted || false,
          completedAt: json.data.completedAt ? new Date(json.data.completedAt) : undefined,
        })
      }
    } catch (_e) {
      // Use mock
    }
  }, [moduleId])

  React.useEffect(() => {
    fetchModule()
    fetchProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateProgress(newProgress: number) {
    const isCompleted = progress.isCompleted || newProgress >= 100
    try {
      await fetch(`/api/learning/${moduleId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress, isCompleted }),
      })
    } catch (_e) {
      // Proceed with local update
    }
    setProgress({ progress: newProgress, isCompleted })
  }

  async function handleMarkComplete() {
    setCompleting(true)
    try {
      await fetch(`/api/learning/${moduleId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: 100, isCompleted: true }),
      })
      setProgress({ progress: 100, isCompleted: true })
      toast({ title: 'Module completed', description: 'Great job! This module has been marked as complete.' })
    } catch (_e) {
      setProgress({ progress: 100, isCompleted: true })
      toast({ title: 'Module completed', description: 'Great job! This module has been marked as complete.' })
    } finally {
      setCompleting(false)
    }
  }

  function handleVideoTimeUpdate(e: React.SyntheticEvent) {
    const video = e.currentTarget as HTMLVideoElement
    const percent = Math.round((video.currentTime / video.duration) * 100)
    if (percent > progress.progress && percent < 100) {
      updateProgress(percent)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-light rounded animate-pulse" />
        <div className="h-64 bg-surface-light rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h3 className="text-lg font-semibold text-white mb-2">Module not found</h3>
        <Button asChild>
          <Link href="/employee/learning">Back to Learning</Link>
        </Button>
      </div>
    )
  }

  const isVideo = ['MP4', 'AVI', 'MOV'].includes(module.fileType?.toUpperCase() || '')
  const isImage = ['PNG', 'JPG', 'JPEG', 'GIF'].includes(module.fileType?.toUpperCase() || '')
  const isPDF = module.fileType?.toUpperCase() === 'PDF'
  const isDoc = ['DOCX', 'DOC'].includes(module.fileType?.toUpperCase() || '')

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-white">
        <Link href="/employee/learning">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Viewer Area */}
          <div
            className="rounded-xl border border-border overflow-hidden relative"
            style={{ background: '#1A1A1A' }}
          >
            {isVideo ? (
              <div className="relative">
                <video
                  src={module.fileUrl || ''}
                  controls
                  className="w-full"
                  onTimeUpdate={handleVideoTimeUpdate}
                  poster={module.thumbnailUrl ?? undefined}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : isImage ? (
              <div className="p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={module.fileUrl || ''}
                  alt={module.title}
                  className="w-full rounded-lg"
                />
              </div>
            ) : isPDF ? (
              <div className="min-h-[500px]">
                {module.fileUrl ? (
                  <iframe
                    src={module.fileUrl}
                    className="w-full h-[500px]"
                    title={module.title}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px]">
                    {getFileIcon(module.fileType)}
                    <p className="text-sm mt-3" style={{ color: '#9CA3AF' }}>PDF Preview</p>
                    {module.fileName && (
                      <p className="text-xs mt-1" style={{ color: '#6D28D9' }}>{module.fileName}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px]">
                {getFileIcon(module.fileType)}
                <p className="text-sm mt-3 text-white font-medium">{module.fileName || module.title}</p>
                {module.fileSize && (
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    {module.fileSize ? `${(module.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                  </p>
                )}
                {module.fileUrl && (
                  <a
                    href={module.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4"
                  >
                    <Button size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isPDF && module.fileUrl && (
              <Button variant="outline" asChild>
                <a href={module.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            )}
            {module.fileUrl && (
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFullscreen(!showFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Related Modules */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Related Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mockRelatedModules.map(rel => (
                <Link
                  key={rel.id}
                  href={`/employee/learning/${rel.id}`}
                  className="rounded-lg border border-border p-3 transition-all hover:border-primary/40"
                  style={{ background: '#1A1A1A' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getFileIcon(rel.fileType)}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${getCategoryColor(rel.category)}`}>
                      {rel.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-white line-clamp-2">{rel.title}</h4>
                  {rel.duration && (
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                      <Clock className="h-3 w-3" />
                      {rel.duration}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Module Info */}
          <div
            className="rounded-xl border border-border p-5"
            style={{ background: '#1A1A1A' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(module.category)}`}>
                {module.category}
              </span>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                <Eye className="h-3 w-3" />
                {module.views} views
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-2">{module.title}</h2>

            {module.description && (
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                {module.description}
              </p>
            )}

            {module.duration && (
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#9CA3AF' }}>
                <Clock className="h-4 w-4" />
                <span>{module.duration}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div
            className="rounded-xl border border-border p-5"
            style={{ background: '#1A1A1A' }}
          >
            <h3 className="text-sm font-semibold text-white mb-3">Your Progress</h3>

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span style={{ color: '#9CA3AF' }}>Completion</span>
                <span className={progress.isCompleted ? 'text-green-400 font-medium' : 'text-white'}>
                  {progress.progress}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress.progress}%`,
                    background: progress.isCompleted ? '#22C55E' : '#8B5CF6',
                  }}
                />
              </div>
            </div>

            {progress.isCompleted && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm mb-3"
                style={{ background: 'rgba(34,197,94,0.1)' }}
              >
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Completed</span>
              </div>
            )}

            {!progress.isCompleted && (
              <Button
                onClick={handleMarkComplete}
                loading={completing}
                className="w-full"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Complete
              </Button>
            )}

            {progress.isCompleted && (
              <Button
                variant="outline"
                onClick={() => { setProgress({ progress: 0, isCompleted: false }); updateProgress(0) }}
                className="w-full mt-2"
              >
                <X className="mr-2 h-4 w-4" />
                Reset Progress
              </Button>
            )}
          </div>

          {/* Admin Progress Slider */}
          {progress.progress > 0 && !progress.isCompleted && (
            <div
              className="rounded-xl border border-border p-5"
              style={{ background: '#1A1A1A' }}
            >
              <h3 className="text-sm font-semibold text-white mb-3">Adjust Progress</h3>
              <input
                type="range"
                min={0}
                max={100}
                value={progress.progress}
                onChange={(e) => updateProgress(Number(e.target.value))}
                className="w-full accent-primary"
                style={{ accentColor: '#8B5CF6' }}
              />
              <div className="flex items-center justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
                <span>0%</span>
                <span className="text-white font-medium">{progress.progress}%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
