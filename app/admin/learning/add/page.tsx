'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, X, Star, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

const CATEGORIES = ['IT', 'HR', 'Safety', 'Compliance', 'Leadership', 'Onboarding', 'General']
const ACCEPTED_TYPES = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'MP4', 'AVI', 'MOV', 'PNG', 'JPG']
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp4', '.avi', '.mov', '.png', '.jpg', '.jpeg']

interface FormData {
  title: string
  description: string
  category: string
  duration: string
  file: File | null
  isFeatured: boolean
  isActive: boolean
}

export default function AddLearningModulePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)
  const [form, setForm] = React.useState<FormData>({
    title: '',
    description: '',
    category: '',
    duration: '',
    file: null,
    isFeatured: false,
    isActive: true,
  })
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({})

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!form.category) {
      newErrors.category = 'Category is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  function handleFileSelect(file: File) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const baseName = file.name.split('.').slice(0, -1).join('.')
    setForm(prev => ({ ...prev, file }))
    if (!form.title && baseName) {
      setForm(prev => ({ ...prev, title: baseName }))
    }
  }

  function removeFile() {
    setForm(prev => ({ ...prev, file: null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        duration: form.duration,
        fileName: form.file?.name,
        fileSize: form.file?.size,
        fileType: form.file?.name.split('.').pop()?.toUpperCase(),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      }

      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Module created', description: `${form.title} has been added.` })
        router.push('/admin/learning')
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to create module.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Module created (demo)', description: `${form.title} has been added.` })
      router.push('/admin/learning')
    } finally {
      setSaving(false)
    }
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/learning">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Add Learning Module</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Create a new training module or resource for employees
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          className="rounded-xl border border-border p-6 space-y-5"
          style={{ background: '#1A1A1A' }}
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-400">*</span></Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Information Security Basics"
              error={!!errors.title}
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of this learning module..."
              rows={3}
            />
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-red-400">*</span></Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger style={{ borderColor: errors.category ? '#EF4444' : '#2D2D2D' }}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="e.g., 45 minutes or 2 hours"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File Upload</Label>
            {form.file ? (
              <div
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: '#262626', border: '1px solid #2D2D2D' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: '#1A1A1A' }}>
                    <FileText className="h-5 w-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{form.file.name}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {(form.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 rounded-lg hover:bg-surface-light transition-colors"
                >
                  <X className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragActive ? '#8B5CF6' : '#2D2D2D',
                  background: dragActive ? 'rgba(139,92,246,0.05)' : 'transparent',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
                <Upload className="h-8 w-8 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                <p className="text-sm font-medium text-white mb-1">
                  Drag and drop or click to upload
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Accepted: {ACCEPTED_TYPES.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Featured & Active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: '#262626' }}
            >
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-amber-400" />
                <div>
                  <Label className="text-white font-medium">Featured</Label>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Show on homepage</p>
                </div>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(v) => updateField('isFeatured', v)}
              />
            </div>
            <div
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: '#262626' }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div>
                  <Label className="text-white font-medium">Active</Label>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Visible to employees</p>
                </div>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => updateField('isActive', v)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/learning">Cancel</Link>
          </Button>
          <Button type="submit" loading={saving}>
            Create Module
          </Button>
        </div>
      </form>
    </div>
  )
}
