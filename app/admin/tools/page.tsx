'use client'

import * as React from 'react'
import { Plus, Search, Edit, Trash2, Key, Globe, Monitor, Lock, Link2, FolderOpen, Eye, EyeOff, MoreHorizontal, Users, CheckCircle, XCircle, Copy, Clock, EyeOff as EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TOOL_TYPES = ['Browser Extension', 'API Key', 'System', 'Credential', 'URL', 'Other'] as const
const TOOL_CATEGORIES = ['Development', 'Production', 'Testing', 'Company', 'Personal', 'Other'] as const

interface Tool {
  id: string
  name: string
  description?: string | null
  type: string
  url?: string | null
  username?: string | null
  password?: string | null
  notes?: string | null
  category?: string | null
  isShared: boolean
  createdAt: Date
  updatedAt: Date
  accessRequests?: string | Array<{ employeeId: string; status: string; requestedAt: string; reviewedBy?: string; reviewedAt?: string }>
}

interface PendingRequest {
  toolId: string
  toolName: string
  employeeId: string
  employeeName?: string
  status: string
  requestedAt: string
}

const mockTools: Tool[] = [
  {
    id: '1', name: 'GitHub Organization', description: 'Main organization repository access', type: 'Credential',
    url: 'https://github.com', username: 'team@company.com', password: 'ghp_xxxxxxxxxxxx',
    category: 'Development', isShared: true, createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-03-10'),
  },
  {
    id: '2', name: 'AWS Console', description: 'Cloud infrastructure access', type: 'Credential',
    url: 'https://aws.amazon.com', username: 'admin@company.com',
    category: 'Production', isShared: false, createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-04-05'),
  },
  {
    id: '3', name: 'Postman API', description: 'API testing workspace', type: 'Browser Extension',
    url: 'https://www.postman.com', category: 'Development', isShared: true,
    createdAt: new Date('2024-01-20'), updatedAt: new Date('2024-03-15'),
  },
  {
    id: '4', name: 'Slack Webhook', description: 'CI/CD notifications', type: 'URL',
    url: 'https://hooks.slack.com/services/xxx', category: 'Production', isShared: false,
    createdAt: new Date('2024-03-01'), updatedAt: new Date('2024-03-01'),
  },
  {
    id: '5', name: 'Jenkins CI', description: 'Continuous integration server', type: 'System',
    url: 'https://jenkins.internal.company.com', category: 'Development', isShared: true,
    createdAt: new Date('2024-02-15'), updatedAt: new Date('2024-04-10'),
  },
]

function getTypeIcon(type: string) {
  switch (type) {
    case 'Browser Extension': return <Eye className="h-4 w-4" />
    case 'API Key': return <Key className="h-4 w-4" />
    case 'System': return <Monitor className="h-4 w-4" />
    case 'Credential': return <Lock className="h-4 w-4" />
    case 'URL': return <Link2 className="h-4 w-4" />
    default: return <FolderOpen className="h-4 w-4" />
  }
}

function getTypeBadgeVariant(type: string): 'default' | 'secondary' | 'info' | 'purple' | 'warning' {
  switch (type) {
    case 'Browser Extension': return 'info'
    case 'API Key': return 'purple'
    case 'System': return 'secondary'
    case 'Credential': return 'warning'
    case 'URL': return 'default'
    default: return 'secondary'
  }
}

export default function AdminToolsPage() {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [sharedFilter, setSharedFilter] = React.useState<string>('all')
  const [data, setData] = React.useState<Tool[]>(mockTools)
  const [loading, setLoading] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedTool, setSelectedTool] = React.useState<Tool | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editForm, setEditForm] = React.useState<Partial<Tool>>({})
  const [showPassword, setShowPassword] = React.useState(false)

  // Tab state: 'tools' | 'requests'
  const [activeTab, setActiveTab] = React.useState<'tools' | 'requests'>('tools')

  // Pending requests state
  const [pendingRequests, setPendingRequests] = React.useState<PendingRequest[]>([])
  const [decryptedPasswords, setDecryptedPasswords] = React.useState<Record<string, string>>({})
  const [decrypting, setDecrypting] = React.useState<Record<string, boolean>>({})
  const [showDecrypted, setShowDecrypted] = React.useState<Record<string, boolean>>({})

  const fetchTools = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)

      const res = await fetch(`/api/tools?${params}`)
      const json = await res.json()
      // Only use API data if it's successful, otherwise show empty state
      if (json.success) {
        setData(json.data)
      }
    } catch (_e) {
      // Network error - clear data instead of falling back to mock
      setData([])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, categoryFilter])

  React.useEffect(() => {
    fetchTools()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPendingRequests = React.useCallback(() => {
    const requests: PendingRequest[] = []
    for (const tool of data) {
      const raw = tool.accessRequests
      if (!raw) continue
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      for (const req of parsed) {
        if (req.status === 'PENDING') {
          requests.push({
            toolId: tool.id,
            toolName: tool.name,
            employeeId: req.employeeId,
            status: req.status,
            requestedAt: req.requestedAt,
          })
        }
      }
    }
    setPendingRequests(requests)
  }, [data])

  React.useEffect(() => {
    if (activeTab === 'requests') {
      fetchPendingRequests()
    }
  }, [activeTab, data, fetchPendingRequests])

  const filteredData = React.useMemo(() => {
    return data.filter(tool => {
      const matchesSearch = !search ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase()) ||
        tool.category?.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || tool.type === typeFilter
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter
      const matchesShared = sharedFilter === 'all' ||
        (sharedFilter === 'shared' && tool.isShared) ||
        (sharedFilter === 'private' && !tool.isShared)
      return matchesSearch && matchesType && matchesCategory && matchesShared
    })
  }, [data, search, typeFilter, categoryFilter, sharedFilter])

  async function handleApproveReject(toolId: string, employeeId: string, action: 'APPROVED' | 'REJECTED') {
    try {
      const res = await fetch(`/api/tools/${toolId}/request`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action }),
      })
      const json = await res.json()
      if (json.success) {
        setPendingRequests(prev => prev.filter(r => !(r.toolId === toolId && r.employeeId === employeeId)))
        fetchTools()
        toast({
          title: action === 'APPROVED' ? 'Access approved' : 'Access rejected',
          description: action === 'APPROVED'
            ? 'The employee can now access this tool.'
            : 'The access request has been rejected.',
        })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update request.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update request.', variant: 'destructive' })
    }
  }

  async function handleDecryptPassword(toolId: string) {
    setDecrypting(prev => ({ ...prev, [toolId]: true }))
    try {
      const res = await fetch(`/api/tools/${toolId}/decrypt`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setDecryptedPasswords(prev => ({ ...prev, [toolId]: json.password }))
        setShowDecrypted(prev => ({ ...prev, [toolId]: true }))
        toast({ title: 'Password decrypted', description: 'This password will be hidden in 5 seconds for security.' })
        setTimeout(() => {
          setDecryptedPasswords(prev => { const n = {...prev}; delete n[toolId]; return n })
          setShowDecrypted(prev => { const n = {...prev}; delete n[toolId]; return n })
        }, 5000)
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to decrypt password.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to decrypt password.', variant: 'destructive' })
    } finally {
      setDecrypting(prev => ({ ...prev, [toolId]: false }))
    }
  }

  function copyDecrypted(toolId: string) {
    const pwd = decryptedPasswords[toolId]
    if (pwd) {
      navigator.clipboard.writeText(pwd)
      toast({ title: 'Copied', description: 'Password copied to clipboard.' })
    }
  }

  function handleEdit(tool: Tool) {
    setSelectedTool(tool)
    setEditForm({ ...tool })
    setEditDialogOpen(true)
    setShowPassword(false)
  }

  function handleDelete(tool: Tool) {
    setSelectedTool(tool)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!selectedTool) return
    try {
      const res = await fetch(`/api/tools/${selectedTool.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setData(prev => prev.filter(t => t.id !== selectedTool.id))
        toast({ title: 'Tool deleted', description: `${selectedTool.name} has been removed.` })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to delete tool.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete tool. Please try again.', variant: 'destructive' })
    }
    setDeleteDialogOpen(false)
    setSelectedTool(null)
  }

  async function handleSaveEdit() {
    if (!selectedTool) return
    try {
      const res = await fetch(`/api/tools/${selectedTool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (json.success) {
        setData(prev => prev.map(t => t.id === selectedTool.id ? json.data : t))
        toast({ title: 'Tool updated', description: `${editForm.name} has been updated.` })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update tool.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update tool. Please try again.', variant: 'destructive' })
    }
    setEditDialogOpen(false)
    setSelectedTool(null)
  }

  async function handleSharedToggle(tool: Tool) {
    const newShared = !tool.isShared
    try {
      await fetch(`/api/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShared: newShared }),
      })
    } catch (_e) {
      // Proceed with local update
    }
    setData(prev => prev.map(t => t.id === tool.id ? { ...t, isShared: newShared } : t))
    toast({ title: newShared ? 'Tool shared' : 'Tool unshared', description: `${tool.name} is now ${newShared ? 'shared with team' : 'private'}.` })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Tools & Credentials</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Manage shared tools, credentials, and resources ({filteredData.length} total)
          </p>
        </div>
        <Button asChild style={{ background: '#8B5CF6' }}>
          <Link href="/admin/tools/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Tool
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: '#2D2D2D' }}>
        <button
          onClick={() => setActiveTab('tools')}
          className="px-4 py-2 text-sm font-medium transition-colors relative"
          style={{ color: activeTab === 'tools' ? '#8B5CF6' : '#9CA3AF' }}
        >
          All Tools
          {activeTab === 'tools' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#8B5CF6' }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === 'requests' ? '#8B5CF6' : '#9CA3AF' }}
        >
          <Users className="h-4 w-4" />
          Pending Requests
          {pendingRequests.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: '#8B5CF6', color: '#fff' }}
            >
              {pendingRequests.length}
            </span>
          )}
          {activeTab === 'requests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#8B5CF6' }} />
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        /* Pending Requests View */
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-20"
              style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
            >
              <div className="p-4 rounded-full mb-4" style={{ background: '#262626' }}>
                <Users className="h-8 w-8" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No pending requests</h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                All access requests have been processed
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#262626' }}>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Tool</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Employee ID</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Requested At</th>
                    <th className="h-12 px-4 text-right text-xs font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={`${req.toolId}-${req.employeeId}`} className="border-t" style={{ borderColor: '#2D2D2D' }}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white">{req.toolName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs px-2 py-1 rounded" style={{ background: '#262626', color: '#A78BFA' }}>
                          {req.employeeId}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                          <Clock className="h-3 w-3" />
                          {new Date(req.requestedAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1"
                            style={{ color: '#22C55E' }}
                            onClick={() => handleApproveReject(req.toolId, req.employeeId, 'APPROVED')}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1"
                            style={{ color: '#EF4444' }}
                            onClick={() => handleApproveReject(req.toolId, req.employeeId, 'REJECTED')}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tools Table View */
        <>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
              <Input
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TOOL_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TOOL_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sharedFilter} onValueChange={setSharedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Shared status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
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
              <h3 className="text-lg font-semibold text-white mb-1">No tools found</h3>
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                Add your first tool or adjust your filters
              </p>
              <Button asChild style={{ background: '#8B5CF6' }}>
                <Link href="/admin/tools/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tool
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#262626' }}>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Name</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Type</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">URL</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Username</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Password</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Category</th>
                    <th className="h-12 px-4 text-left text-xs font-semibold text-white">Shared</th>
                    <th className="h-12 px-4 text-right text-xs font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((tool) => (
                    <tr key={tool.id} className="border-t transition-colors" style={{ borderColor: '#2D2D2D' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#262626' }}>
                            {getTypeIcon(tool.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{tool.name}</p>
                            {tool.description && (
                              <p className="text-xs truncate max-w-xs" style={{ color: '#9CA3AF' }}>
                                {tool.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getTypeBadgeVariant(tool.type)}>{tool.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {tool.url ? (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline flex items-center gap-1"
                            style={{ color: '#8B5CF6' }}
                          >
                            <Globe className="h-3 w-3" />
                            Link
                          </a>
                        ) : (
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white">{tool.username || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {tool.password ? (
                          <div className="flex items-center gap-1">
                            {showDecrypted[tool.id] && decryptedPasswords[tool.id] ? (
                              <>
                                <span className="text-xs text-white font-mono">{decryptedPasswords[tool.id]}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Copy password"
                                  onClick={() => copyDecrypted(tool.id)}
                                >
                                  <Copy className="h-3 w-3" style={{ color: '#22C55E' }} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-white font-mono">••••••••</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Decrypt password (admin only)"
                                  disabled={decrypting[tool.id]}
                                  onClick={() => handleDecryptPassword(tool.id)}
                                >
                                  <Key className="h-3 w-3" style={{ color: '#8B5CF6' }} />
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>{tool.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={tool.isShared}
                          onCheckedChange={() => handleSharedToggle(tool)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tool)}
                            className="h-8 px-2 text-gray-400 hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tool)}
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
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tool</DialogTitle>
            <DialogDescription>Update tool details and settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.type || ''}
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.category || ''}
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={editForm.url || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password / Key</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                    ) : (
                      <Eye className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Share with team</Label>
              <Switch
                checked={editForm.isShared || false}
                onCheckedChange={(v) => setEditForm(prev => ({ ...prev, isShared: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} style={{ background: '#8B5CF6' }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tool</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedTool?.name}</strong>? This action cannot be undone.
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
