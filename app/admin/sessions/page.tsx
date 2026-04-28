'use client'

import * as React from 'react'
import {
  Eye,
  LogOut,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate } from '@/lib/core/utils'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED'

interface Session {
  id: string
  employeeId?: string
  employeeCode?: string
  employeeName?: string
  employeeEmail?: string
  employeeAvatar?: string
  department?: string
  ipAddress?: string
  userAgent?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser?: string
  os?: string
  country?: string
  city?: string
  loginTime?: string
  lastActive?: string
  expiresAt?: string
  status?: SessionStatus
  activity?: ActivityEvent[]
  userId?: string
  sessionId?: string
  loginAt?: string | Date
  logoutAt?: string | Date
  isActive?: boolean
}

interface ActivityEvent {
  id: string
  type: 'login' | 'page_view' | 'api_call' | 'logout'
  description: string
  timestamp: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS: Session[] = [
  {
    id: 'sess_001',
    employeeId: 'emp_001',
    employeeCode: 'EMP001',
    employeeName: 'Rajesh Kumar',
    employeeEmail: 'rajesh.kumar@company.com',
    employeeAvatar: '',
    department: 'Engineering',
    ipAddress: '192.168.1.101',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    os: 'Windows 11',
    country: 'India',
    city: 'Mumbai',
    loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    activity: [
      {
        id: 'act_001',
        type: 'login',
        description: 'Logged in from Chrome on Windows 11',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_002',
        type: 'page_view',
        description: 'Viewed Dashboard',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_003',
        type: 'api_call',
        description: 'API: /api/employees',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_004',
        type: 'page_view',
        description: 'Viewed Employee Directory',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sess_002',
    employeeId: 'emp_002',
    employeeCode: 'EMP002',
    employeeName: 'Priya Sharma',
    employeeEmail: 'priya.sharma@company.com',
    employeeAvatar: '',
    department: 'Human Resources',
    ipAddress: '10.0.0.45',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari',
    deviceType: 'mobile',
    browser: 'Safari 17',
    os: 'iOS 17.2',
    country: 'India',
    city: 'Bangalore',
    loginTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 19 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    activity: [
      {
        id: 'act_005',
        type: 'login',
        description: 'Logged in from Safari on iOS',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_006',
        type: 'page_view',
        description: 'Viewed Leave Management',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sess_003',
    employeeId: 'emp_003',
    employeeCode: 'EMP003',
    employeeName: 'Amit Verma',
    employeeEmail: 'amit.verma@company.com',
    employeeAvatar: '',
    department: 'Finance',
    ipAddress: '172.16.0.88',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Firefox/121.0',
    deviceType: 'desktop',
    browser: 'Firefox 121',
    os: 'macOS Sonoma',
    country: 'India',
    city: 'Delhi',
    loginTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    status: 'EXPIRED',
    activity: [
      {
        id: 'act_007',
        type: 'login',
        description: 'Logged in from Firefox on macOS',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_008',
        type: 'logout',
        description: 'Session expired after 8 hours',
        timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sess_004',
    employeeId: 'emp_004',
    employeeCode: 'EMP004',
    employeeName: 'Sneha Patel',
    employeeEmail: 'sneha.patel@company.com',
    employeeAvatar: '',
    department: 'Marketing',
    ipAddress: '192.168.2.200',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile',
    deviceType: 'mobile',
    browser: 'Chrome 120',
    os: 'Android 14',
    country: 'India',
    city: 'Ahmedabad',
    loginTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 21 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    activity: [
      {
        id: 'act_009',
        type: 'login',
        description: 'Logged in from Chrome on Android',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'sess_005',
    employeeId: 'emp_005',
    employeeCode: 'EMP005',
    employeeName: 'Vikram Singh',
    employeeEmail: 'vikram.singh@company.com',
    employeeAvatar: '',
    department: 'Operations',
    ipAddress: '10.10.5.12',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari',
    deviceType: 'tablet',
    browser: 'Safari 17',
    os: 'iPadOS 17.2',
    country: 'India',
    city: 'Pune',
    loginTime: subDays(new Date(), 2).toISOString(),
    lastActive: subDays(new Date(), 2).toISOString(),
    expiresAt: subDays(new Date(), 1).toISOString(),
    status: 'EXPIRED',
    activity: [
      {
        id: 'act_010',
        type: 'login',
        description: 'Logged in from Safari on iPad',
        timestamp: subDays(new Date(), 2).toISOString(),
      },
      {
        id: 'act_011',
        type: 'logout',
        description: 'Manually logged out',
        timestamp: subDays(new Date(), 1).toISOString(),
      },
    ],
  },
  {
    id: 'sess_006',
    employeeId: 'emp_006',
    employeeCode: 'EMP006',
    employeeName: 'Anita Desai',
    employeeEmail: 'anita.desai@company.com',
    employeeAvatar: '',
    department: 'Engineering',
    ipAddress: '203.0.113.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0',
    deviceType: 'desktop',
    browser: 'Edge 120',
    os: 'Windows 10',
    country: 'India',
    city: 'Hyderabad',
    loginTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    activity: [
      {
        id: 'act_012',
        type: 'login',
        description: 'Logged in from Edge on Windows 10',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'act_013',
        type: 'api_call',
        description: 'API: /api/attendance',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getStatusBadgeVariant(status: SessionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'active'
    case 'EXPIRED':
      return 'cancelled'
    case 'INACTIVE':
      return 'secondary'
  }
}

function getStatusDotColor(status: SessionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-400'
    case 'EXPIRED':
      return 'bg-gray-500'
    case 'INACTIVE':
      return 'bg-amber-400'
  }
}

function getSessionStatus(session: Session): SessionStatus {
  if (session.status) return session.status
  if (session.isActive === false) return 'EXPIRED'
  if (session.isActive === true) return 'ACTIVE'
  return 'INACTIVE'
}

function getDeviceIcon(deviceType: Session['deviceType']) {
  switch (deviceType) {
    case 'desktop':
      return <Monitor className="h-3.5 w-3.5 text-gray-400" />
    case 'mobile':
      return <Smartphone className="h-3.5 w-3.5 text-gray-400" />
    case 'tablet':
      return <Tablet className="h-3.5 w-3.5 text-gray-400" />
    default:
      return <Globe className="h-3.5 w-3.5 text-gray-400" />
  }
}

function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'login':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-950">
          <LogOut className="h-3.5 w-3.5 text-green-400 rotate-180" />
        </div>
      )
    case 'logout':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-950">
          <LogOut className="h-3.5 w-3.5 text-red-400" />
        </div>
      )
    case 'page_view':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
          <Eye className="h-3.5 w-3.5 text-primary-400" />
        </div>
      )
    case 'api_call':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950">
          <Activity className="h-3.5 w-3.5 text-blue-400" />
        </div>
      )
  }
}

// ─── Session Detail Sheet ─────────────────────────────────────────────────────

interface SessionDetailSheetProps {
  session: Session | null
  open: boolean
  onClose: () => void
}

function SessionDetailSheet({ session, open, onClose }: SessionDetailSheetProps) {
  if (!session) return null

  const sessionStatus = getSessionStatus(session)
  const loginTime = session.loginTime || session.loginAt
  const logoutTime = session.logoutAt

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="border-border bg-surface w-full max-w-lg overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white">Session Details</SheetTitle>
          <SheetDescription className="text-gray-400">
            {session.employeeName || 'Unknown'} &middot; {session.employeeCode || 'N/A'}
          </SheetDescription>
        </SheetHeader>

        {/* Employee Info */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={session.employeeAvatar} />
            <AvatarFallback className="bg-primary/20 text-primary-400 text-lg font-semibold">
              {getInitials(session.employeeName || 'UN')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-lg">{session.employeeName || 'Unknown'}</p>
            <p className="text-gray-400 text-sm">{session.department || session.employeeEmail || 'No department'}</p>
            <Badge
              variant={getStatusBadgeVariant(sessionStatus)}
              className="mt-1.5 text-xs"
            >
              {sessionStatus}
            </Badge>
          </div>
        </div>

        {/* Connection Info */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Connection Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={<Globe className="h-4 w-4 text-gray-400" />} label="IP Address">
              <span className="text-white font-mono text-sm">{session.ipAddress || 'Unknown'}</span>
            </DetailRow>
            <DetailRow
              icon={<MapPin className="h-4 w-4 text-gray-400" />}
              label="Location"
            >
              <span className="text-white text-sm">
                {session.city && session.country
                  ? `${session.city}, ${session.country}`
                  : session.country ?? 'Unknown'}
              </span>
            </DetailRow>
            <DetailRow
              icon={getDeviceIcon(session.deviceType)}
              label="Device"
            >
              <span className="text-white text-sm capitalize">{session.deviceType || 'Unknown'}</span>
            </DetailRow>
            <DetailRow icon={<Monitor className="h-4 w-4 text-gray-400" />} label="Browser">
              <span className="text-white text-sm">{session.browser || 'Unknown'}</span>
            </DetailRow>
            <DetailRow
              icon={<Activity className="h-4 w-4 text-gray-400" />}
              label="Operating System"
            >
              <span className="text-white text-sm">{session.os || 'Unknown'}</span>
            </DetailRow>
          </div>
        </div>

        {/* Session Timing */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Session Timing
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="Login Time">
              <span className="text-white text-sm">
                {loginTime ? format(new Date(loginTime), 'dd MMM yyyy, hh:mm a') : 'Unknown'}
              </span>
            </DetailRow>
            <DetailRow
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              label="Logout Time"
            >
              <span className="text-white text-sm">
                {logoutTime ? format(new Date(logoutTime), 'dd MMM yyyy, hh:mm a') : (sessionStatus === 'ACTIVE' ? 'Active now' : 'Unknown')}
              </span>
            </DetailRow>
          </div>
        </div>

        {/* Activity Timeline */}
        {session.activity && session.activity.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Activity Timeline
            </h3>
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-5">
                {session.activity.map((event) => (
                  <div key={event.id} className="relative flex gap-3">
                    <div className="relative z-10 mt-0.5">{getActivityIcon(event.type)}</div>
                    <div className="pt-0.5 min-w-0">
                      <p className="text-white text-sm leading-snug">{event.description}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {format(new Date(event.timestamp), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  )
}

// ─── Force Logout Dialog ──────────────────────────────────────────────────────

interface ForceLogoutDialogProps {
  session: Session | null
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

function ForceLogoutDialog({ session, open, onClose, onConfirm }: ForceLogoutDialogProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-surface text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <DialogTitle>Force Logout</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            This will immediately terminate the session for{' '}
            <span className="text-white font-medium">{session?.employeeName}</span>{' '}
            ({session?.employeeCode}). They will be logged out of all devices and
            will need to re-authenticate.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Force Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

function DateRangePicker({
  dateRange,
  onChange,
}: {
  dateRange: DateRange
  onChange: (range: DateRange) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 w-full justify-start text-left font-normal border-border bg-surface hover:bg-surface-light hover:text-white text-gray-300',
            !dateRange.from && 'text-gray-500'
          )}
        >
          <svg
            className="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, yyyy')}
              </>
            ) : (
              format(dateRange.from, 'LLL dd, yyyy')
            )
          ) : (
            'Date range'
          )}
          {dateRange.from && (
            <button
              className="ml-auto p-1 hover:bg-surface-light rounded"
              onClick={(e) => {
                e.stopPropagation()
                onChange({ from: undefined, to: undefined })
              }}
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-surface" align="start">
        <Calendar
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(range) =>
            onChange({ from: range?.from, to: range?.to })
          }
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          className="text-white"
        />
        <div className="flex gap-2 p-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-border text-gray-300 hover:bg-surface-light"
            onClick={() => {
              const today = new Date()
              onChange({ from: startOfDay(today), to: endOfDay(today) })
            }}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-border text-gray-300 hover:bg-surface-light"
            onClick={() => {
              onChange({
                from: startOfDay(subDays(new Date(), 7)),
                to: endOfDay(new Date()),
              })
            }}
          >
            7 Days
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-border text-gray-300 hover:bg-surface-light"
            onClick={() => {
              onChange({
                from: startOfDay(subDays(new Date(), 30)),
                to: endOfDay(new Date()),
              })
            }}
          >
            30 Days
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { toast } = useToast()

  const [sessions, setSessions] = React.useState<Session[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [deviceFilter, setDeviceFilter] = React.useState<string>('ALL')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  })

  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)

  const [logoutDialogSession, setLogoutDialogSession] = React.useState<Session | null>(null)
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false)

  const [forceLogoutId, setForceLogoutId] = React.useState<string | null>(null)

  // Fetch sessions
  async function fetchSessions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const json = await res.json()
      if (json.success && json.data) {
        setSessions(json.data)
      } else if (Array.isArray(json)) {
        setSessions(json)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (_e) {
      // Fallback to mock data for development
      setSessions(MOCK_SESSIONS)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSessions()
  }, [])

  // Filtered sessions
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        !search ||
        (s.employeeName?.toLowerCase().includes(search.toLowerCase())) ||
        (s.employeeCode?.toLowerCase().includes(search.toLowerCase())) ||
        (s.employeeEmail?.toLowerCase().includes(search.toLowerCase()))

      const sessionStatus = getSessionStatus(s)
      const matchesStatus =
        statusFilter === 'ALL' ||
        sessionStatus === statusFilter ||
        (statusFilter === 'INACTIVE' && sessionStatus === 'INACTIVE')

      const matchesDevice =
        deviceFilter === 'ALL' || s.deviceType === deviceFilter

      const loginDate = new Date(s.loginTime || s.loginAt || Date.now())
      const matchesDateRange =
        (!dateRange.from || loginDate >= startOfDay(dateRange.from)) &&
        (!dateRange.to || loginDate <= endOfDay(dateRange.to))

      return matchesSearch && matchesStatus && matchesDevice && matchesDateRange
    })
  }, [sessions, search, statusFilter, deviceFilter, dateRange])

  function handleViewDetails(session: Session) {
    setSelectedSession(session)
    setDetailSheetOpen(true)
  }

  function handleForceLogoutClick(session: Session) {
    setLogoutDialogSession(session)
    setLogoutDialogOpen(true)
  }

  async function handleForceLogoutConfirm() {
    const session = logoutDialogSession
    if (!session) return

    setForceLogoutId(session.id)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to logout session')

      setSessions((prev) => prev.filter((s) => s.id !== session.id))

      toast({
        title: 'Session terminated',
        description: `${session.employeeName}'s session has been force-logged out.`,
        variant: 'success',
      })
    } catch (_e) {
      toast({
        title: 'Error',
        description: 'Failed to force logout. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setForceLogoutId(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setDeviceFilter('ALL')
    setDateRange({ from: undefined, to: undefined })
  }

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    deviceFilter !== 'ALL' ||
    dateRange.from !== undefined

  const activeCount = [
    search !== '',
    statusFilter !== 'ALL',
    deviceFilter !== 'ALL',
    dateRange.from !== undefined,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Session Management</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Monitor and manage active login sessions across the platform
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            disabled={loading}
            className="border-border text-gray-300 hover:bg-surface-light hover:text-white"
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', loading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Filters */}
        <div className="bg-dark border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Filters</span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary-400 text-xs font-bold">
                  {activeCount}
                </span>
                <button
                  className="text-xs text-gray-500 hover:text-gray-300 ml-1 underline underline-offset-2"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-border bg-surface text-white placeholder:text-gray-500"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-border bg-surface text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-white">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Device Type */}
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="border-border bg-surface text-white">
                <SelectValue placeholder="Device Type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-white">
                <SelectItem value="ALL">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Sessions"
            value={sessions.length}
            subtext={`${sessions.filter((s) => getSessionStatus(s) === 'ACTIVE').length} active`}
            color="text-primary-400"
          />
          <StatCard
            label="Active Now"
            value={sessions.filter((s) => getSessionStatus(s) === 'ACTIVE').length}
            subtext="currently logged in"
            color="text-green-400"
          />
          <StatCard
            label="Expired / Inactive"
            value={sessions.filter((s) => getSessionStatus(s) !== 'ACTIVE').length}
            subtext="ended sessions"
            color="text-gray-400"
          />
        </div>

        {/* Sessions Table */}
        <div className="bg-dark border border-border rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1.2fr_1.5fr_1.5fr_1fr_120px] gap-4 px-5 py-3 border-b border-border bg-surface">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Employee
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Code
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              IP Address
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Device
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Login Time
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-gray-500 text-sm">Loading sessions...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-red-400 text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSessions}
                className="border-border text-gray-300 hover:bg-surface-light"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-12 w-12 rounded-full bg-surface-light flex items-center justify-center">
                <Activity className="h-6 w-6 text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">No sessions found</p>
                <p className="text-gray-500 text-sm mt-1">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'Sessions will appear here once employees log in.'}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-border text-gray-300 hover:bg-surface-light"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {/* Session Rows */}
          {!loading && !error &&
            filteredSessions.map((session, index) => (
              <div
                key={session.id}
                className={cn(
                  'grid grid-cols-[2fr_1fr_1.2fr_1.5fr_1.5fr_1fr_120px] gap-4 px-5 py-4 border-b border-border items-center hover:bg-surface transition-colors cursor-pointer',
                  index === filteredSessions.length - 1 && 'border-b-0'
                )}
                onClick={() => handleViewDetails(session)}
              >
                {/* Employee */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0 border border-border">
                    <AvatarImage src={session.employeeAvatar} />
                    <AvatarFallback className="bg-primary/20 text-primary-400 text-xs font-semibold">
                      {getInitials(session.employeeName || 'UN')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {session.employeeName || 'Unknown'}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{session.department || session.employeeEmail || 'N/A'}</p>
                  </div>
                </div>

                {/* Code */}
                <p className="text-gray-400 text-sm font-mono">{session.employeeCode || 'N/A'}</p>

                {/* IP */}
                <p className="text-gray-400 text-sm font-mono">{session.ipAddress || 'Unknown'}</p>

                {/* Device */}
                <div className="flex items-center gap-2 min-w-0">
                  {getDeviceIcon(session.deviceType)}
                  <div className="min-w-0">
                    <p className="text-gray-300 text-sm truncate">{session.browser || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs truncate">{session.os || 'Unknown'}</p>
                  </div>
                </div>

                {/* Login Time */}
                <div>
                  <p className="text-gray-300 text-sm">
                    {session.loginTime || session.loginAt
                      ? format(new Date(session.loginTime || session.loginAt!), 'dd MMM yyyy')
                      : 'Unknown'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {session.loginTime || session.loginAt
                      ? format(new Date(session.loginTime || session.loginAt!), 'hh:mm a')
                      : ''}
                  </p>
                </div>

                {/* Status */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Badge variant={getStatusBadgeVariant(getSessionStatus(session))} className="gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(getSessionStatus(session)))} />
                    {getSessionStatus(session).charAt(0) + getSessionStatus(session).slice(1).toLowerCase()}
                  </Badge>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    className="h-8 w-8 hover:bg-surface-light"
                    onClick={() => handleViewDetails(session)}
                  >
                    <Eye className="h-4 w-4 text-gray-400" />
                  </Button>
                  {getSessionStatus(session) === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Force Logout"
                      className="h-8 w-8 hover:bg-red-950/50"
                      onClick={() => handleForceLogoutClick(session)}
                      disabled={forceLogoutId === session.id}
                    >
                      {forceLogoutId === session.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-red-400" />
                      ) : (
                        <LogOut className="h-4 w-4 text-gray-400 hover:text-red-400" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

          {/* Table Footer */}
          {!loading && !error && filteredSessions.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-surface">
              <p className="text-xs text-gray-500">
                Showing{' '}
                <span className="text-gray-300 font-medium">
                  {filteredSessions.length}
                </span>{' '}
                of{' '}
                <span className="text-gray-300 font-medium">
                  {sessions.length}
                </span>{' '}
                sessions
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Sheet */}
      <SessionDetailSheet
        session={selectedSession}
        open={detailSheetOpen}
        onClose={() => setDetailSheetOpen(false)}
      />

      {/* Force Logout Dialog */}
      <ForceLogoutDialog
        session={logoutDialogSession}
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleForceLogoutConfirm}
      />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string
  value: number
  subtext: string
  color: string
}) {
  return (
    <div className="bg-dark border border-border rounded-xl px-5 py-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={cn('text-3xl font-bold', color)}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{subtext}</p>
    </div>
  )
}
