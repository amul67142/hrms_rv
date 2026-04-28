'use client'

import * as React from 'react'
import {
  Upload,
  FileText,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Loader2,
  X,
  File,
  Eye,
  Download,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

interface EmployeeDocument {
  id: string
  employeeId: string
  title: string
  documentType: string
  fileUrl: string
  fileName: string
  fileSize: number
  status: DocumentStatus
  isLocked: boolean
  uploadedAt: string | Date
  verifiedAt: string | Date | null
  verifiedBy: string | null
  rejectionNote: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

const DOCUMENT_TYPES = [
  { value: 'AADHAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'BANK_PROOF', label: 'Bank Proof' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'EXPERIENCE', label: 'Experience Letter' },
  { value: 'EDUCATION', label: 'Education Certificate' },
  { value: 'OTHER', label: 'Other' },
]

const statusBgColors: Record<DocumentStatus, string> = {
  PENDING: '#92400E',
  VERIFIED: '#065F46',
  REJECTED: '#991B1B',
}

const statusTextColors: Record<DocumentStatus, string> = {
  PENDING: '#FCD34D',
  VERIFIED: '#34D399',
  REJECTED: '#FCA5A5',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  return 'other'
}

function bytesToBase64(data: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(data)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export default function EmployeeDocumentsPage() {
  const { toast } = useToast()
  const [documents, setDocuments] = React.useState<EmployeeDocument[]>([])
  const [loading, setLoading] = React.useState(true)

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false)
  const [previewDocument, setPreviewDocument] = React.useState<EmployeeDocument | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false)
  const [uploadTitle, setUploadTitle] = React.useState('')
  const [uploadType, setUploadType] = React.useState('')
  const [uploadFile, setUploadFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [fileError, setFileError] = React.useState('')

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingDoc, setDeletingDoc] = React.useState<EmployeeDocument | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/documents?limit=100')
      const json = await res.json()
      if (json.success) {
        setDocuments(json.data)
      }
    } catch (_e) {
      toast({ title: 'Failed to load documents', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileSelect = (file: File) => {
    setFileError('')
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setFileError('File size must be less than 10MB')
      return
    }
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PDF, JPG, PNG, and Word documents are allowed')
      return
    }
    setUploadFile(file)
  }

  const handleUpload = async () => {
    if (!uploadTitle.trim()) {
      toast({ title: 'Please enter a document title', variant: 'destructive' })
      return
    }
    if (!uploadType) {
      toast({ title: 'Please select a document type', variant: 'destructive' })
      return
    }
    if (!uploadFile) {
      toast({ title: 'Please select a file', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const arrayBuffer = await uploadFile.arrayBuffer()
      const base64 = bytesToBase64(arrayBuffer)
      const mimeType = uploadFile.type || 'application/octet-stream'
      const dataUrl = `data:${mimeType};base64,${base64}`

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          documentType: uploadType,
          fileUrl: dataUrl,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Document uploaded', description: 'Your document has been submitted for verification.' })
        setUploadDialogOpen(false)
        setUploadTitle('')
        setUploadType('')
        setUploadFile(null)
        fetchDocuments()
      } else {
        toast({ title: 'Upload failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Failed to upload document', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${deletingDoc.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Document deleted' })
        setDeleteDialogOpen(false)
        setDeletingDoc(null)
        fetchDocuments()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Failed to delete document', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const openPreview = (doc: EmployeeDocument) => {
    setPreviewDocument(doc)
    setPreviewDialogOpen(true)
  }

  const handleDownload = (doc: EmployeeDocument) => {
    const link = document.createElement('a')
    link.href = doc.fileUrl
    link.download = doc.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const canDelete = (doc: EmployeeDocument) => {
    return !doc.isLocked && doc.status !== 'VERIFIED'
  }

  const hasNewVersion = (doc: EmployeeDocument) => {
    const created = new Date(doc.createdAt)
    const updated = new Date(doc.updatedAt)
    return Math.abs(created.getTime() - updated.getTime()) > 60000
  }

  const stats = React.useMemo(() => ({
    total: documents.length,
    pending: documents.filter((d) => d.status === 'PENDING').length,
    verified: documents.filter((d) => d.status === 'VERIFIED').length,
    rejected: documents.filter((d) => d.status === 'REJECTED').length,
  }), [documents])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My Documents</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Upload and manage your personal documents
          </p>
        </div>
        <Button
          onClick={() => setUploadDialogOpen(true)}
          style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', color: '#fff' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Total</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <p className="text-xs font-medium" style={{ color: '#FCD34D' }}>Pending</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#FCD34D' }}>{stats.pending}</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <p className="text-xs font-medium" style={{ color: '#34D399' }}>Verified</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#34D399' }}>{stats.verified}</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>Rejected</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#FCA5A5' }}>{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid #2D2D2D' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Lock Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #2D2D2D' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: '#2D2D2D', width: j === 0 ? '160px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <FileText className="h-7 w-7" style={{ color: '#8B5CF6' }} />
                      </div>
                      <div>
                        <p className="font-medium text-white">No documents uploaded</p>
                        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                          Upload your first document to get started
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setUploadDialogOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', color: '#fff' }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #2D2D2D' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                          <File className="h-4 w-4" style={{ color: '#A78BFA' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{doc.title}</p>
                            {hasNewVersion(doc) && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.2)', color: '#34D399' }}>
                                Updated
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            {doc.fileName} &middot; {formatFileSize(doc.fileSize)}
                          </p>
                          {doc.rejectionNote && (
                            <p className="text-xs mt-0.5" style={{ color: '#FCA5A5' }}>
                              Note: {doc.rejectionNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
                      >
                        {DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label || doc.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold"
                        style={{ background: statusBgColors[doc.status], color: statusTextColors[doc.status] }}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: 'rgba(251,191,36,0.1)', color: '#FCD34D' }}>
                          <Lock className="h-3 w-3" />
                          Verified & Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: 'rgba(75,85,99,0.3)', color: '#9CA3AF' }}>
                          <Unlock className="h-3 w-3" />
                          Editable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-400">{formatDate(doc.uploadedAt, 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          style={{ color: '#A78BFA' }}
                          onClick={() => openPreview(doc)}
                          title="Preview document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          style={{ color: '#9CA3AF' }}
                          onClick={() => handleDownload(doc)}
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDelete(doc) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            style={{ color: '#F87171' }}
                            onClick={() => {
                              setDeletingDoc(doc)
                              setDeleteDialogOpen(true)
                            }}
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="border-white/10 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white">{previewDocument?.title}</DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  {previewDocument?.fileName} &middot; {previewDocument && formatFileSize(previewDocument.fileSize)}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="text-white text-xs"
                  style={{ background: statusBgColors[previewDocument?.status as DocumentStatus] || '#6B7280' }}
                >
                  {previewDocument?.status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
              </div>
            ) : previewDocument ? (
              (() => {
                const fileType = getFileType(previewDocument.fileName)
                if (fileType === 'image') {
                  return (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewDocument.fileUrl}
                        alt={previewDocument.title}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg"
                        style={{ border: '1px solid #2D2D2D' }}
                      />
                    </div>
                  )
                }
                if (fileType === 'pdf') {
                  return (
                    <iframe
                      src={previewDocument.fileUrl}
                      className="w-full h-[60vh] rounded-lg"
                      style={{ border: '1px solid #2D2D2D' }}
                    />
                  )
                }
                return (
                  <div className="flex flex-col items-center justify-center h-64 rounded-lg border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <File className="h-12 w-12 mb-4" style={{ color: '#6B7280' }} />
                    <p className="text-white font-medium">{previewDocument.fileName}</p>
                    <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                      {formatFileSize(previewDocument.fileSize)}
                    </p>
                    <Button
                      size="sm"
                      className="mt-4"
                      style={{ background: '#8B5CF6', color: '#fff' }}
                      onClick={() => handleDownload(previewDocument)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )
              })()
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
              style={{ background: 'transparent', borderColor: '#2D2D2D', color: '#9CA3AF' }}
            >
              Close
            </Button>
            {previewDocument && (
              <Button
                style={{ background: '#8B5CF6', color: '#fff' }}
                onClick={() => handleDownload(previewDocument)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '500px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff' }}>Upload Document</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Submit a new document for HR verification. Supported formats: PDF, JPG, PNG, DOCX.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doc-title" style={{ color: '#D1D5DB' }}>Document Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g., Aadhaar Card - Rahul Sharma"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#fff' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-type" style={{ color: '#D1D5DB' }}>Document Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger id="doc-type" style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#fff' }}>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#D1D5DB' }}>File</Label>
              {!uploadFile ? (
                <div
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileSelect(file)
                    }
                    input.click()
                  }}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-violet-500/50"
                  style={{ borderColor: '#2D2D2D', background: '#0F0F0F' }}
                >
                  <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: '#6B7280' }} />
                  <p className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
                    Click to browse or drag & drop
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                    PDF, JPG, PNG, DOCX (max 10MB)
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl p-4" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <File className="h-5 w-5" style={{ color: '#A78BFA' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{uploadFile.name}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUploadFile(null)}
                      style={{ color: '#9CA3AF' }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {fileError && (
                <p className="text-xs" style={{ color: '#F87171' }}>{fileError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false)
                setUploadTitle('')
                setUploadType('')
                setUploadFile(null)
                setFileError('')
              }}
              style={{ background: 'transparent', border: '1px solid #2D2D2D', color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', color: '#fff' }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff' }}>Delete Document</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Are you sure you want to delete &ldquo;{deletingDoc?.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteDialogOpen(false); setDeletingDoc(null) }}
              style={{ background: 'transparent', border: '1px solid #2D2D2D', color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: '#991B1B', color: '#fff' }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
