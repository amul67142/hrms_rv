'use client'

import * as React from 'react'
import {
  FileText,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Eye,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  employee?: {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    department: string
    designation: string
  }
}

const statusColors: Record<DocumentStatus, string> = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
}

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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  AADHAR: 'Aadhaar',
  PAN: 'PAN Card',
  BANK_PROOF: 'Bank Proof',
  ADDRESS_PROOF: 'Address Proof',
  EXPERIENCE: 'Experience Letter',
  EDUCATION: 'Education Certificate',
  OTHER: 'Other',
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

export default function AdminDocumentsPage() {
  const { toast } = useToast()
  const [documents, setDocuments] = React.useState<EmployeeDocument[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [total, setTotal] = React.useState(0)

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false)
  const [previewDocument, setPreviewDocument] = React.useState<EmployeeDocument | null>(null)

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectingDoc, setRejectingDoc] = React.useState<EmployeeDocument | null>(null)
  const [rejectionNote, setRejectionNote] = React.useState('')
  const [rejecting, setRejecting] = React.useState(false)

  // Action loading
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      })
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/documents?${params}`)
      const json = await res.json()
      if (json.success) {
        setDocuments(json.data)
        setTotal(json.total)
        setTotalPages(json.totalPages)
      }
    } catch (_e) {
      toast({ title: 'Failed to load documents', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search, toast])

  React.useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, search])

  const hasNewVersion = (doc: EmployeeDocument) => {
    const created = new Date(doc.createdAt)
    const updated = new Date(doc.updatedAt)
    return Math.abs(created.getTime() - updated.getTime()) > 60000
  }

  const stats = React.useMemo(() => {
    return {
      total: documents.length,
      pending: documents.filter((d) => d.status === 'PENDING').length,
      verified: documents.filter((d) => d.status === 'VERIFIED').length,
      locked: documents.filter((d) => d.isLocked).length,
    }
  }, [documents])

  const filteredDocuments = React.useMemo(() => {
    if (!search) return documents
    const q = search.toLowerCase()
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.employee?.firstName.toLowerCase().includes(q) ||
        d.employee?.lastName.toLowerCase().includes(q) ||
        d.employee?.employeeCode.toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q)
    )
  }, [documents, search])

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

  const handleVerify = async (doc: EmployeeDocument) => {
    setActionLoading(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Document verified', description: `"${doc.title}" has been verified and locked.` })
        fetchDocuments()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Failed to verify document', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingDoc) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/documents/${rejectingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionNote }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Document rejected', description: `"${rejectingDoc.title}" has been rejected.` })
        setRejectDialogOpen(false)
        setRejectingDoc(null)
        setRejectionNote('')
        fetchDocuments()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Failed to reject document', variant: 'destructive' })
    } finally {
      setRejecting(false)
    }
  }

  const handleToggleLock = async (doc: EmployeeDocument) => {
    setActionLoading(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !doc.isLocked }),
      })
      const json = await res.json()
      if (json.success) {
        toast({
          title: doc.isLocked ? 'Document unlocked' : 'Document locked',
          description: `"${doc.title}" has been ${doc.isLocked ? 'unlocked' : 'locked'}.`,
        })
        fetchDocuments()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Failed to update lock status', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Document Verification</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Review and verify employee submitted documents
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Total Documents</p>
                <p className="text-2xl font-bold text-white mt-1">{total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <FileText className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#FCD34D' }}>Pending</p>
                <p className="text-2xl font-bold" style={{ color: '#FCD34D' }}>{stats.pending}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
                <Loader2 className="h-5 w-5" style={{ color: '#FCD34D' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#34D399' }}>Verified</p>
                <p className="text-2xl font-bold" style={{ color: '#34D399' }}>{stats.verified}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: '#34D399' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Locked</p>
                <p className="text-2xl font-bold text-white">{stats.locked}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(156,163,175,0.1)' }}>
                <Lock className="h-5 w-5" style={{ color: '#9CA3AF' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7280' }} />
          <Input
            placeholder="Search by name, code, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#fff' }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[180px]"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', color: '#fff' }}
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid #2D2D2D' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Lock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #2D2D2D' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: '#2D2D2D', width: j === 0 ? '140px' : j === 1 ? '160px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8" style={{ color: '#374151' }} />
                      <p style={{ color: '#6B7280' }}>No documents found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #2D2D2D' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">
                          {doc.employee?.firstName} {doc.employee?.lastName}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {doc.employee?.employeeCode} &middot; {doc.employee?.department}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white">{doc.title}</p>
                          {hasNewVersion(doc) && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.2)', color: '#34D399' }}>
                              Updated
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {doc.fileName} &middot; {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
                      >
                        {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
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
                      <p className="text-slate-400">{formatDate(doc.uploadedAt, 'dd MMM yyyy')}</p>
                      {doc.verifiedAt && (
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          Verified: {formatDate(doc.verifiedAt, 'dd MMM')}
                        </p>
                      )}
                      {doc.rejectionNote && (
                        <p className="text-xs" style={{ color: '#FCA5A5' }} title={doc.rejectionNote}>
                          Note: {doc.rejectionNote.slice(0, 20)}...
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#4B5563' }}>
                          <Unlock className="h-3 w-3" />
                          Unlocked
                        </span>
                      )}
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
                        {doc.status === 'PENDING' && !doc.isLocked && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              style={{ color: '#34D399' }}
                              onClick={() => handleVerify(doc)}
                              disabled={actionLoading === doc.id}
                            >
                              {actionLoading === doc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1 hidden sm:inline">Verify</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              style={{ color: '#FCA5A5' }}
                              onClick={() => {
                                setRejectingDoc(doc)
                                setRejectDialogOpen(true)
                              }}
                              disabled={actionLoading === doc.id}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="ml-1 hidden sm:inline">Reject</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          style={{ color: doc.isLocked ? '#FCD34D' : '#9CA3AF' }}
                          onClick={() => handleToggleLock(doc)}
                          disabled={actionLoading === doc.id}
                          title={doc.isLocked ? 'Unlock document' : 'Lock document'}
                        >
                          {actionLoading === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : doc.isLocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #2D2D2D' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Showing {documents.length} of {total} documents
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#9CA3AF' }}
              >
                Previous
              </Button>
              <span className="text-xs px-2" style={{ color: '#6B7280' }}>
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#9CA3AF' }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="border-white/10 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: '#1A1A1A' }}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white">{previewDocument?.title}</DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  {previewDocument?.employee?.firstName} {previewDocument?.employee?.lastName} &middot; {previewDocument?.fileName}
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
            {previewDocument ? (
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
                    <FileText className="h-12 w-12 mb-4" style={{ color: '#6B7280' }} />
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

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff' }}>Reject Document</DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              Rejecting &ldquo;{rejectingDoc?.title}&rdquo; submitted by{' '}
              {rejectingDoc?.employee?.firstName} {rejectingDoc?.employee?.lastName}.
              The employee will be able to upload a corrected version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-note" style={{ color: '#D1D5DB' }}>Rejection Reason</Label>
            <Textarea
              id="rejection-note"
              placeholder="Explain why this document is being rejected..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={4}
              style={{ background: '#0F0F0F', border: '1px solid #2D2D2D', color: '#fff' }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectDialogOpen(false); setRejectionNote('') }}
              style={{ background: 'transparent', border: '1px solid #2D2D2D', color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectionNote.trim()}
              style={{ background: '#991B1B', color: '#fff' }}
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
