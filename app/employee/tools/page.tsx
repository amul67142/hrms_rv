'use client'

import * as React from 'react'
import { Search, Key, Globe, Monitor, Lock, Link2, Copy, Eye, EyeOff, ExternalLink, FolderOpen, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

const TOOL_TYPES = ['Browser Extension', 'API Key', 'System', 'Credential', 'URL', 'Other'] as const

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
  accessRequests?: Array<{ employeeId: string; status: string; requestedAt: string }>
}

const mockSharedTools: Tool[] = [
  {
    id: '1',
    name: 'GitHub Organization',
    description: 'Main organization repository access and team collaboration.',
    type: 'Credential',
    url: 'https://github.com/organizations/company',
    username: 'team@company.com',
    category: 'Development',
    isShared: true,
  },
  {
    id: '2',
    name: 'Postman API Workspace',
    description: 'API testing workspace with shared collections for all services.',
    type: 'Browser Extension',
    url: 'https://www.postman.com/company-team/workspace',
    category: 'Development',
    isShared: true,
  },
  {
    id: '3',
    name: 'Jenkins CI Server',
    description: 'Continuous integration and deployment pipelines.',
    type: 'System',
    url: 'https://jenkins.internal.company.com',
    category: 'Development',
    isShared: true,
  },
  {
    id: '4',
    name: 'Slack Team Channels',
    description: 'Internal communication and team channels.',
    type: 'URL',
    url: 'https://company.slack.com',
    category: 'Company',
    isShared: true,
  },
  {
    id: '5',
    name: 'Confluence Wiki',
    description: 'Internal knowledge base and documentation hub.',
    type: 'URL',
    url: 'https://company.atlassian.net/wiki',
    category: 'Company',
    isShared: true,
  },
  {
    id: '6',
    name: 'Figma Design System',
    description: 'Shared design files and component library.',
    type: 'Browser Extension',
    url: 'https://figma.com/@company',
    category: 'Development',
    isShared: true,
  },
]

function getTypeIcon(type: string) {
  switch (type) {
    case 'Browser Extension': return <Eye className="h-6 w-6" />
    case 'API Key': return <Key className="h-6 w-6" />
    case 'System': return <Monitor className="h-6 w-6" />
    case 'Credential': return <Lock className="h-6 w-6" />
    case 'URL': return <Link2 className="h-6 w-6" />
    default: return <FolderOpen className="h-6 w-6" />
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'Browser Extension': return '#3B82F6'
    case 'API Key': return '#8B5CF6'
    case 'System': return '#F97316'
    case 'Credential': return '#EAB308'
    case 'URL': return '#22C55E'
    default: return '#9CA3AF'
  }
}

function getCategoryColor(category?: string | null): string {
  switch (category) {
    case 'Development': return 'bg-blue-600/20 text-blue-400'
    case 'Production': return 'bg-red-600/20 text-red-400'
    case 'Company': return 'bg-green-600/20 text-green-400'
    case 'Testing': return 'bg-amber-600/20 text-amber-400'
    default: return 'bg-gray-600/20 text-gray-400'
  }
}

function getRequestStatusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="success" className="gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Approved</Badge>
    case 'REJECTED':
      return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" /> Rejected</Badge>
    case 'PENDING':
      return <Badge variant="warning" className="gap-1 text-xs"><Clock className="h-3 w-3" /> Pending</Badge>
    default:
      return null
  }
}

interface RequestStatus {
  [toolId: string]: string | null
}

export default function EmployeeToolsPage() {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [data, setData] = React.useState<Tool[]>(mockSharedTools)
  const [showPasswords, setShowPasswords] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)
  const [requesting, setRequesting] = React.useState<Record<string, boolean>>({})
  const [requestStatus, setRequestStatus] = React.useState<RequestStatus>({})

  React.useEffect(() => {
    fetchTools()
  }, [])

  async function fetchTools() {
    setLoading(true)
    try {
      const res = await fetch('/api/tools')
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setData(json.data.filter((t: Tool) => t.isShared))
      }
      // Fetch request statuses for each tool
      const tools = json.success ? json.data.filter((t: Tool) => t.isShared) : mockSharedTools
      const statuses: RequestStatus = {}
      await Promise.allSettled(
        tools.map(async (tool: Tool) => {
          try {
            const r = await fetch(`/api/tools/${tool.id}/request`)
            const j = await r.json()
            if (j.success && j.data) {
              statuses[tool.id] = j.data.status
            }
          } catch (_e) {}
        })
      )
      setRequestStatus(statuses)
    } catch (_e) {
      // Use mock data
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestAccess(tool: Tool) {
    setRequesting(prev => ({ ...prev, [tool.id]: true }))
    try {
      const res = await fetch(`/api/tools/${tool.id}/request`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setRequestStatus(prev => ({ ...prev, [tool.id]: 'PENDING' }))
        toast({ title: 'Request submitted', description: `Access request for "${tool.name}" has been sent.` })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to submit request.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to submit request.', variant: 'destructive' })
    } finally {
      setRequesting(prev => ({ ...prev, [tool.id]: false }))
    }
  }

  const filteredData = React.useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(
      tool =>
        tool.name.toLowerCase().includes(q) ||
        tool.description?.toLowerCase().includes(q) ||
        tool.category?.toLowerCase().includes(q)
    )
  }, [data, search])

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function togglePassword(id: string) {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Team Tools</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Shared tools and resources from your team ({filteredData.length} tools)
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-5 h-48 animate-pulse"
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
          <h3 className="text-lg font-semibold text-white mb-1">No shared tools</h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {search ? 'No tools match your search' : 'Your team has not shared any tools yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((tool) => {
            const myStatus = requestStatus[tool.id]
            const isApproved = myStatus === 'APPROVED'
            const isPending = myStatus === 'PENDING'
            const hasCredential = tool.type === 'Credential' || tool.type === 'API Key'

            return (
              <div
                key={tool.id}
                className="rounded-xl border p-5 transition-all hover:border-primary/40 hover:shadow-lg"
                style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
              >
                {/* Tool Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="p-3 rounded-xl flex-shrink-0"
                    style={{ background: '#262626' }}
                  >
                    <div style={{ color: getTypeColor(tool.type) }}>
                      {getTypeIcon(tool.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white truncate">{tool.name}</h3>
                      {myStatus && getRequestStatusBadge(myStatus)}
                    </div>
                    {tool.category && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(tool.category)}`}>
                        {tool.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {tool.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: '#9CA3AF' }}>
                    {tool.description}
                  </p>
                )}

                {/* Request Access Banner for tools with credentials that need approval */}
                {hasCredential && !myStatus && (
                  <div className="mb-3 p-2 rounded-lg flex items-center justify-between" style={{ background: 'rgba(139,92,246,0.1)' }}>
                    <span className="text-xs" style={{ color: '#A78BFA' }}>
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      Access request required
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs gap-1"
                      onClick={() => handleRequestAccess(tool)}
                      disabled={requesting[tool.id]}
                      style={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}
                    >
                      <Send className="h-3 w-3" />
                      {requesting[tool.id] ? 'Sending...' : 'Request'}
                    </Button>
                  </div>
                )}

                {isPending && (
                  <div className="mb-3 p-2 rounded-lg text-center" style={{ background: 'rgba(234,179,8,0.1)' }}>
                    <span className="text-xs" style={{ color: '#FACC15' }}>
                      <Clock className="inline h-3 w-3 mr-1" />
                      Your request is awaiting approval
                    </span>
                  </div>
                )}

                {/* Credentials */}
                <div className="space-y-2 mb-4">
                  {tool.username && (
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#262626' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#6D28D9' }}>Username</p>
                        <p className="text-sm text-white truncate">{tool.username}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => copyToClipboard(tool.username!, tool.id + '-user')}
                      >
                        {copied === tool.id + '-user' ? (
                          <span className="text-xs text-green-400">Copied</span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                        )}
                      </Button>
                    </div>
                  )}
                  {tool.password && (
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#262626' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#6D28D9' }}>Password</p>
                        <p className="text-sm text-white">
                          {isApproved
                            ? (showPasswords[tool.id] ? tool.password : tool.password)
                            : '••••••••••••'}
                        </p>
                      </div>
                      {isApproved && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => togglePassword(tool.id)}
                          >
                            {showPasswords[tool.id] ? (
                              <EyeOff className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                            ) : (
                              <Eye className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(tool.password!, tool.id + '-pass')}
                          >
                            {copied === tool.id + '-pass' ? (
                              <span className="text-xs text-green-400">Copied</span>
                            ) : (
                              <Copy className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: '#2D2D2D' }}>
                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#262626', color: '#FFFFFF' }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  )}
                  {tool.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(tool.url!, tool.id + '-url')}
                    >
                      {copied === tool.id + '-url' ? (
                        <span className="text-xs text-green-400">Copied</span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
