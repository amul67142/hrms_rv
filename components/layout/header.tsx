'use client'

import * as React from 'react'
import { Menu, Search, Bell, LogOut, User, ChevronDown, Check, X, Megaphone, ArrowRight, Users, FileText, FolderOpen, Hash } from 'lucide-react'
import { signOut, useSession } from '@/lib/core/auth-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  link?: string
}

interface UserInfo {
  name: string
  email: string
  role: string
  initials: string
  profileImage?: string | null
}

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
  showSearch?: boolean
  userInfo?: UserInfo | null
}

// ─── Search / Command Palette types ───────────────────────────────────────────

type ResultItem = {
  id: string
  label: string
  sub?: string
  category: 'employee' | 'department' | 'page' | 'document'
  href?: string
  icon?: React.ReactNode
}

type CommandItem = {
  id: string
  label: string
  shortcut?: string[]
  href: string
  icon?: React.ReactNode
}

// ─── Static data ───────────────────────────────────────────────────────────────

const QUICK_COMMANDS: CommandItem[] = [
  {
    id: 'add-employee',
    label: 'Add Employee',
    shortcut: ['⌘', 'N'],
    href: '/admin/employees/add',
    icon: <Users className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'go-attendance',
    label: 'Go to Attendance',
    shortcut: ['⌘', 'A'],
    href: '/admin/attendance',
    icon: <Hash className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'go-leave',
    label: 'Go to Leave',
    shortcut: ['⌘', 'L'],
    href: '/admin/leave',
    icon: <FolderOpen className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'go-payroll',
    label: 'Go to Payroll',
    shortcut: ['⌘', 'P'],
    href: '/admin/payroll',
    icon: <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'go-reports',
    label: 'Go to Reports',
    shortcut: ['⌘', 'R'],
    href: '/admin/reports',
    icon: <ArrowRight className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'upload-attendance',
    label: 'Upload Attendance',
    shortcut: ['⌘', 'U'],
    href: '/admin/attendance/bulk',
    icon: <Hash className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'generate-letter',
    label: 'Generate Letter',
    shortcut: ['⌘', 'G'],
    href: '/admin/letters',
    icon: <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
]

const STATIC_PAGES: ResultItem[] = [
  {
    id: 'page-dashboard',
    label: 'Dashboard',
    category: 'page',
    href: '/admin/dashboard',
    icon: <ArrowRight className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-employees',
    label: 'Employees',
    category: 'page',
    href: '/admin/employees',
    icon: <Users className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-attendance',
    label: 'Attendance',
    category: 'page',
    href: '/admin/attendance',
    icon: <Hash className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-leave',
    label: 'Leave Management',
    category: 'page',
    href: '/admin/leave',
    icon: <FolderOpen className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-payroll',
    label: 'Payroll',
    category: 'page',
    href: '/admin/payroll',
    icon: <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-reports',
    label: 'Reports',
    category: 'page',
    href: '/admin/reports',
    icon: <ArrowRight className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-letters',
    label: 'Generate Letter',
    category: 'page',
    href: '/admin/letters',
    icon: <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
  {
    id: 'page-org-chart',
    label: 'Org Chart',
    category: 'page',
    href: '/admin/org-chart',
    icon: <ArrowRight className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
  },
]

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  employee: { label: 'Employees', icon: <Users className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} /> },
  department: { label: 'Departments', icon: <FolderOpen className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} /> },
  page: { label: 'Pages', icon: <ArrowRight className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} /> },
  document: { label: 'Documents', icon: <FileText className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} /> },
}

// ─── Search Palette Component ─────────────────────────────────────────────────

function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [employeeResults, setEmployeeResults] = React.useState<ResultItem[]>([])
  const [departmentResults, setDepartmentResults] = React.useState<ResultItem[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setEmployeeResults([])
      setDepartmentResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset active index when results change
  React.useEffect(() => {
    setActiveIndex(0)
  }, [query, employeeResults.length, departmentResults.length])

  // Live search: fetch employees + departments as user types
  React.useEffect(() => {
    if (!query.trim()) {
      setEmployeeResults([])
      setDepartmentResults([])
      return
    }
    const q = query.trim()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const [empRes, deptRes] = await Promise.all([
          fetch(`/api/employees/list?q=${encodeURIComponent(q)}&limit=5`),
          fetch(`/api/departments?q=${encodeURIComponent(q)}&limit=5`),
        ])
        const empJson = empRes.ok ? await empRes.json() : null
        const deptJson = deptRes.ok ? await deptRes.json() : null

        setEmployeeResults(
          (empJson?.data ?? []).map((e: { id: string; name: string; employeeCode: string; email: string }) => ({
            id: `emp-${e.id}`,
            label: e.name,
            sub: `${e.employeeCode} · ${e.email}`,
            category: 'employee' as const,
            href: `/admin/employees/${e.id}`,
            icon: <Users className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
          }))
        )
        setDepartmentResults(
          (deptJson?.data ?? []).map((d: { id: string; name: string; code: string }) => ({
            id: `dept-${d.id}`,
            label: d.name,
            sub: d.code ? `Code: ${d.code}` : undefined,
            category: 'department' as const,
            href: `/admin/departments/${d.id}`,
            icon: <FolderOpen className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
          }))
        )
      } catch (_e) {
        // silent fail
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  // Filter commands by query
  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return QUICK_COMMANDS
    const q = query.toLowerCase()
    return QUICK_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
  }, [query])

  // Filter static pages by query
  const filteredPages = React.useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return STATIC_PAGES.filter(p => p.label.toLowerCase().includes(q))
  }, [query])

  // Build flat list for keyboard navigation
  const allItems = React.useMemo((): Array<{ type: 'command' | 'result'; item: CommandItem | ResultItem }> => {
    const commands = filteredCommands.map(c => ({ type: 'command' as const, item: c }))
    const results: Array<{ type: 'result'; item: ResultItem }> = [
      ...employeeResults.map(item => ({ type: 'result' as const, item })),
      ...departmentResults.map(item => ({ type: 'result' as const, item })),
      ...filteredPages.map(item => ({ type: 'result' as const, item })),
    ]
    return [...commands, ...results]
  }, [filteredCommands, employeeResults, departmentResults, filteredPages])

  const hasQuery = query.trim().length > 0
  const showSections = hasQuery ? (employeeResults.length + departmentResults.length + filteredPages.length) > 0 : false

  // ─── Keyboard navigation ───────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const active = allItems[activeIndex]
      if (active) {
        const href = active.type === 'command'
          ? (active.item as CommandItem).href
          : (active.item as ResultItem).href
        if (href) {
          router.push(href)
          onClose()
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll active item into view
  React.useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector('[data-active="true"]') as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  // Compute which section each flat index belongs to
  const commandCount = filteredCommands.length

  function getSectionLabel(globalIdx: number): string | null {
    if (!hasQuery) return null
    if (globalIdx === 0 && commandCount > 0) return 'Commands'
    const empStart = commandCount
    const empEnd = empStart + employeeResults.length
    if (globalIdx === empStart && employeeResults.length > 0) return 'Employees'
    const deptStart = empEnd
    const deptEnd = deptStart + departmentResults.length
    if (globalIdx === deptStart && departmentResults.length > 0) return 'Departments'
    const pageStart = deptEnd
    const pageEnd = pageStart + filteredPages.length
    if (globalIdx === pageStart && filteredPages.length > 0) return 'Pages'
    return null
  }

  let flatIdx = 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #2D2D2D' }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: '#6B7280' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search employees, pages, or type a command..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: '#8B5CF6', borderTopColor: 'transparent' }} />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-0.5 hover:bg-white/10"
              style={{ color: '#6B7280' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd
            className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono flex-shrink-0"
            style={{ background: '#262626', color: '#6B7280', border: '1px solid #2D2D2D' }}
          >
            ESC
          </kbd>
        </div>

        {/* Hint row when empty */}
        {!hasQuery && (
          <div className="px-4 py-2 text-xs" style={{ color: '#4B5563' }}>
            <span>Type to search </span>
            <span style={{ color: '#8B5CF6' }}>·</span>
            <span> or use </span>
            <kbd className="mx-1 px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', border: '1px solid #2D2D2D' }}>
              ⌘K
            </kbd>
            <span> for commands</span>
          </div>
        )}

        {/* Results list */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: '400px' }}
        >
          {/* Commands section */}
          {filteredCommands.length > 0 && (
            <>
              {hasQuery && (
                <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                  Commands
                </div>
              )}
              {!hasQuery && (
                <div className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                  Quick Commands
                </div>
              )}
              {filteredCommands.map((cmd) => {
                const globalIdx = flatIdx++
                const sectionLabel = getSectionLabel(globalIdx)
                const isActive = activeIndex === globalIdx
                return (
                  <React.Fragment key={cmd.id}>
                    {sectionLabel && (
                      <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                        {sectionLabel}
                      </div>
                    )}
                    <button
                      data-active={isActive}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                      }}
                      onClick={() => {
                        router.push(cmd.href)
                        onClose()
                      }}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                    >
                      <span className="flex-shrink-0">{cmd.icon}</span>
                      <span className="flex-1 text-sm text-white truncate">{cmd.label}</span>
                      <span className="flex-shrink-0 flex items-center gap-0.5">
                        {(cmd.shortcut ?? []).map((key, ki) => (
                          <kbd
                            key={ki}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                            style={{ background: '#262626', color: '#6B7280', border: '1px solid #2D2D2D' }}
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </button>
                  </React.Fragment>
                )
              })}
            </>
          )}

          {/* Employee results */}
          {employeeResults.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Employees
              </div>
              {employeeResults.map((result) => {
                const globalIdx = flatIdx++
                const isActive = activeIndex === globalIdx
                return (
                  <button
                    key={result.id}
                    data-active={isActive}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                    }}
                    onClick={() => {
                      if (result.href) { router.push(result.href); onClose() }
                    }}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                  >
                    <span className="flex-shrink-0">{result.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-white truncate">{result.label}</span>
                      {result.sub && (
                        <span className="block text-xs truncate" style={{ color: '#6B7280' }}>{result.sub}</span>
                      )}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4B5563' }} />
                  </button>
                )
              })}
            </>
          )}

          {/* Department results */}
          {departmentResults.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Departments
              </div>
              {departmentResults.map((result) => {
                const globalIdx = flatIdx++
                const isActive = activeIndex === globalIdx
                return (
                  <button
                    key={result.id}
                    data-active={isActive}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                    }}
                    onClick={() => {
                      if (result.href) { router.push(result.href); onClose() }
                    }}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                  >
                    <span className="flex-shrink-0">{result.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-white truncate">{result.label}</span>
                      {result.sub && (
                        <span className="block text-xs truncate" style={{ color: '#6B7280' }}>{result.sub}</span>
                      )}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4B5563' }} />
                  </button>
                )
              })}
            </>
          )}

          {/* Page results */}
          {filteredPages.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Pages
              </div>
              {filteredPages.map((result) => {
                const globalIdx = flatIdx++
                const isActive = activeIndex === globalIdx
                return (
                  <button
                    key={result.id}
                    data-active={isActive}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                    }}
                    onClick={() => {
                      if (result.href) { router.push(result.href); onClose() }
                    }}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                  >
                    <span className="flex-shrink-0">{result.icon}</span>
                    <span className="flex-1 text-sm text-white truncate">{result.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4B5563' }} />
                  </button>
                )
              })}
            </>
          )}

          {/* No results */}
          {hasQuery && !loading && filteredCommands.length === 0 && employeeResults.length === 0 && departmentResults.length === 0 && filteredPages.length === 0 && (
            <div className="py-10 text-center">
              <Search className="h-8 w-8 mx-auto mb-2" style={{ color: '#2D2D2D' }} />
              <p className="text-sm" style={{ color: '#6B7280' }}>
                No results for <span className="text-white">&quot;{query}&quot;</span>
              </p>
              <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                Try searching for an employee name, department, or page
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {allItems.length > 0 && (
          <div
            className="flex items-center gap-4 px-4 py-2 text-[11px]"
            style={{ borderTop: '1px solid #2D2D2D', color: '#4B5563' }}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: '#262626', border: '1px solid #2D2D2D' }}>↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: '#262626', border: '1px solid #2D2D2D' }}>↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: '#262626', border: '1px solid #2D2D2D' }}>ESC</kbd>
              Close
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Header Component ──────────────────────────────────────────────────────────

export function Header({ title, subtitle, onMenuClick, showSearch = false, userInfo }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  // Determine if we're in admin or employee section
  const isAdmin = pathname?.startsWith('/admin')
  const profileHref = isAdmin ? '/admin/profile' : '/employee/profile'

  // Global Ctrl+K / Cmd+K listener
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data || [])
        setUnreadCount(json.unreadCount || 0)
      }
    } catch (_e) {
      // silently fail
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (_e) {
      // silently fail
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    return `${diffDays}d ago`
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 px-4 md:px-6"
        style={{
          background: 'rgba(15,15,15,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2D2D2D',
        }}>
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden rounded-xl text-white hover:bg-white/10"
          onClick={onMenuClick}
          aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch ? (
          <div className="hidden md:flex relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
            <Input placeholder="Search anything..." className="pl-9 rounded-xl border-0"
              style={{ background: '#262626', color: 'white' }} />
          </div>
        ) : null}

        {/* Search icon (opens palette) */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          style={{ background: 'transparent' }}
          onClick={() => setPaletteOpen(true)}
          aria-label="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Keyboard shortcut hint (desktop) */}
        {showSearch && (
          <kbd
            className="hidden md:flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-mono cursor-pointer"
            style={{ background: '#262626', color: '#6B7280', border: '1px solid #2D2D2D' }}
            onClick={() => setPaletteOpen(true)}
            title="Open search (Ctrl+K)"
          >
            ⌘K
          </kbd>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
              style={{ background: 'transparent' }}
              aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: '#8B5CF6' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-0 shadow-xl max-h-[480px] overflow-y-auto"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2D2D2D' }}>
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-white"
                  style={{ background: 'transparent' }}
                  onClick={markAllRead}
                  disabled={loading}>
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2" style={{ color: '#2D2D2D' }} />
                <p className="text-sm" style={{ color: '#9CA3AF' }}>No notifications</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.slice(0, 10).map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-1 px-4 py-3 rounded-lg mx-1 cursor-pointer focus:bg-white/5"
                    style={{ background: n.isRead ? 'transparent' : 'rgba(139,92,246,0.08)' }}
                    onClick={() => {
                      if (!n.isRead) markRead(n.id)
                      if (n.link) router.push(n.link)
                    }}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          <div className="h-2 w-2 rounded-full mt-1.5"
                            style={{ background: n.isRead ? '#2D2D2D' : '#8B5CF6' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate w-full">{n.title}</p>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9CA3AF' }}>
                            {n.message}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] flex-shrink-0 mt-1" style={{ color: '#6B7280' }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 rounded-xl text-white hover:bg-white/10"
              style={{ background: 'transparent' }}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-white text-[10px] font-bold"
                  style={{ background: '#8B5CF6' }}>
                  {userInfo?.initials || '...'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-xs font-semibold text-white">
                  {userInfo?.name || 'Loading...'}
                </span>
                <span className="text-[9px]" style={{ color: '#A78BFA' }}>
                  {userInfo?.email || 'Loading...'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 hidden lg:block" style={{ color: '#9CA3AF' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-0 shadow-xl"
            style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <DropdownMenuLabel className="text-xs font-bold" style={{ color: '#8B5CF6' }}>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: '#2D2D2D' }} />
            <DropdownMenuItem className="rounded-lg text-sm cursor-pointer text-white hover:bg-white/10 focus:bg-white/10"
              style={{ color: '#9CA3AF' }}
              onClick={() => router.push(profileHref)}>
              <User className="mr-2 h-4 w-4" style={{ color: '#8B5CF6' }} />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: '#2D2D2D' }} />
            <DropdownMenuItem
              className="rounded-lg text-sm cursor-pointer text-red-400 focus:text-red-400 focus:bg-white/10"
              onClick={() => signOut({ callbackUrl: '/login' })}
              aria-label="Logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Global Search / Command Palette */}
      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
