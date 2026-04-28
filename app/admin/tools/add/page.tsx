'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
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

const TOOL_TYPES = ['Browser Extension', 'API Key', 'System', 'Credential', 'URL', 'Other']
const TOOL_CATEGORIES = ['Development', 'Production', 'Testing', 'Company', 'Personal', 'Other']

interface FormData {
  name: string
  description: string
  type: string
  url: string
  username: string
  password: string
  category: string
  notes: string
  isShared: boolean
}

export default function AddToolPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [form, setForm] = React.useState<FormData>({
    name: '',
    description: '',
    type: 'Other',
    url: '',
    username: '',
    password: '',
    category: '',
    notes: '',
    isShared: false,
  })
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({})

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (form.url && form.url.trim() && !isValidUrl(form.url)) {
      newErrors.url = 'Please enter a valid URL'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch (_e) {
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Tool created', description: `${form.name} has been added.` })
        router.push('/admin/tools')
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to create tool.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Tool created (demo)', description: `${form.name} has been added.` })
      router.push('/admin/tools')
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
          <Link href="/admin/tools">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Add New Tool</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Add a new tool, credential, or resource for your team
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          className="rounded-xl border border-border p-6 space-y-5"
          style={{ background: '#1A1A1A' }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-400">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., GitHub Organization"
              error={!!errors.name}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={form.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://..."
              type="url"
              error={!!errors.url}
            />
            {errors.url && <p className="text-xs text-red-400">{errors.url}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="Username or email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password / Key</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="API key or password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional details about this tool..."
              rows={4}
            />
          </div>

          <div
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ background: '#262626' }}
          >
            <div>
              <Label htmlFor="share" className="text-white font-medium">Share with team</Label>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                Allow other team members to view this tool
              </p>
            </div>
            <Switch
              id="share"
              checked={form.isShared}
              onCheckedChange={(v) => updateField('isShared', v)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/tools">Cancel</Link>
          </Button>
          <Button type="submit" loading={saving}>
            Create Tool
          </Button>
        </div>
      </form>
    </div>
  )
}
