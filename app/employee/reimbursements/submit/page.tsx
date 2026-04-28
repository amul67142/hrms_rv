'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, File, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/core/utils'

const categories = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'MEALS', label: 'Meals & Entertainment' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'OTHER', label: 'Other' },
]

export default function SubmitReimbursementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [form, setForm] = React.useState({
    title: '',
    category: '',
    amount: '',
    description: '',
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleFileSelect = (file: File) => {
    setReceiptFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleClearFile = () => {
    setReceiptFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.category) errs.category = 'Category is required'
    if (!form.amount) {
      errs.amount = 'Amount is required'
    } else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Amount must be a positive number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // In production, upload the file to storage first and get a URL.
      // For now, we store the filename as a placeholder.
      const receiptUrl = receiptFile ? `uploads/${receiptFile.name}` : undefined

      const res = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          amount: Number(form.amount),
          description: form.description.trim() || undefined,
          receiptUrl,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast({
          title: 'Submitted',
          description: 'Your reimbursement request has been submitted successfully.',
        })
        router.push('/employee/reimbursements')
        router.refresh()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to submit reimbursement', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
          <Link href="/employee/reimbursements">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Submit Reimbursement</h2>
          <p className="text-sm text-gray-400 mt-1">File a new reimbursement request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-white text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-300">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Travel to Mumbai Client Visit"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                error={!!errors.title}
                className="bg-surface border-border text-white"
              />
              {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
            </div>

            {/* Category & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-300">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className={cn('bg-surface border-border text-white', errors.category && 'border-red-500')}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">
                  Amount (INR) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  error={!!errors.amount}
                  className="bg-surface border-border text-white"
                />
                {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide additional details about this expense..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="bg-surface border-border text-white resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Upload Card */}
        <Card className="border-0" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-white text-base">Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {!receiptFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-primary"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <p className="text-sm font-medium text-gray-300">
                  Drag and drop a file, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: Images, PDF, DOC, DOCX
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.1)' }}>
                    <File className="h-5 w-5" style={{ color: '#A78BFA' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{receiptFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(receiptFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-400"
                    onClick={handleClearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Attaching a receipt is recommended but optional.
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/employee/reimbursements">Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Reimbursement'}
          </Button>
        </div>
      </form>
    </div>
  )
}
