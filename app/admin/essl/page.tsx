'use client'

import * as React from 'react'
import * as XLSX from 'xlsx'
import { apiFetch } from '@/lib/core/fetcher'
import {
  Settings, Wifi, WifiOff, Upload, Download, FileSpreadsheet, X, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Clock, ChevronDown, ChevronUp,
  FileText, Eye, EyeOff, Loader2, DownloadCloud, Activity, Users, Link2,
  Fingerprint, Scan, CreditCard, KeyRound, Monitor, Zap, UserPlus, Trash2,
  Radio, ArrowRight, Search, Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeviceInfo {
  sn: string
  lastPunch: {
    time: string
    receivedAt: string
    deviceUserId: string
    status: string
    verifyMode: string
    employeeName: string | null
    employeeCode: string | null
  } | null
  todayPunches: number
  totalPunches: number
  unmappedUsers: number
  mappedUsers: number
  lastContact: string | null
  isOnline: boolean
}

interface DeviceSummary {
  totalDevices: number
  onlineDevices: number
  totalPunchesToday: number
  totalUnmapped: number
}

interface PunchRecord {
  id: string
  deviceSn: string
  deviceUserId: string
  punchTime: string
  status: number
  statusLabel: string
  verifyMode: number
  verifyLabel: string
  workCode: string | null
  createdAt: string
  employee: {
    id: string
    name: string
    code: string
    department: string
    profileImage: string | null
  } | null
  isMapped: boolean
}

interface UnmappedUser {
  deviceSn: string
  deviceUserId: string
  punchCount: number
  lastPunch: string
  lastSeen: string
}

interface DeviceMapping {
  id: string
  deviceSn: string
  deviceUserId: string
  employeeId: string
  employee: {
    id: string
    name: string
    code: string
    department: string
    designation: string
    profileImage: string | null
  }
  createdAt: string
  updatedAt: string
}

interface EmployeeOption {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
  department: string
}

interface ImportRow {
  employee_code: string
  date: string
  check_in_time: string
  check_out_time: string
  device_id: string
  location: string
  remarks: string
}

interface PreviewData extends ImportRow {
  _rowIndex: number
  _valid: boolean
  _mappedEmployeeCode?: string
  _error?: string
  _warning?: string
  _isDuplicate?: boolean
}

type DuplicateStrategy = 'skip' | 'overwrite' | 'keep_both'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

function getStatusColor(label: string): string {
  switch (label) {
    case 'CHECK_IN': return '#22C55E'
    case 'CHECK_OUT': return '#3B82F6'
    case 'BREAK_OUT': return '#F59E0B'
    case 'BREAK_IN': return '#8B5CF6'
    case 'OT_IN': return '#06B6D4'
    case 'OT_OUT': return '#EC4899'
    default: return '#6B7280'
  }
}

function getStatusIcon(label: string) {
  switch (label) {
    case 'CHECK_IN': return <ArrowRight className="h-3 w-3" style={{ color: '#22C55E' }} />
    case 'CHECK_OUT': return <ArrowRight className="h-3 w-3 rotate-180" style={{ color: '#3B82F6' }} />
    default: return <Activity className="h-3 w-3" style={{ color: '#6B7280' }} />
  }
}

function getVerifyIcon(label: string) {
  switch (label) {
    case 'FACE': return <Scan className="h-3.5 w-3.5" />
    case 'FINGERPRINT': return <Fingerprint className="h-3.5 w-3.5" />
    case 'CARD': return <CreditCard className="h-3.5 w-3.5" />
    case 'PASSWORD': return <KeyRound className="h-3.5 w-3.5" />
    default: return <Monitor className="h-3.5 w-3.5" />
  }
}

function validateRow(row: ImportRow, _index: number): { valid: boolean; error?: string; warning?: string; mappedCode?: string } {
  if (!row.employee_code || row.employee_code.trim() === '') return { valid: false, error: 'Missing employee_code' }
  if (!row.date || row.date.trim() === '') return { valid: false, error: 'Missing date' }
  const hasCheckIn = row.check_in_time && row.check_in_time.trim() !== ''
  const hasCheckOut = row.check_out_time && row.check_out_time.trim() !== ''
  if (!hasCheckIn && !hasCheckOut) return { valid: false, error: 'At least one of check_in_time or check_out_time is required' }
  const code = row.employee_code.trim()
  if (!hasCheckIn) return { valid: true, warning: 'Missing check_in_time', mappedCode: code }
  if (!hasCheckOut) return { valid: true, warning: 'Missing check_out_time', mappedCode: code }
  return { valid: true, mappedCode: code }
}

function downloadTemplate() {
  const headers = ['employee_code', 'date', 'check_in_time', 'check_out_time', 'device_id', 'location', 'remarks']
  const sampleRows = [
    ['EMP001', '2024-04-01', '09:00', '18:00', 'DEV-001', 'Main Gate', ''],
    ['EMP002', '2024-04-01', '09:15', '17:45', 'DEV-002', 'Back Entrance', 'Late arrival'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template')
  XLSX.writeFile(wb, 'essl_attendance_template.xlsx')
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] overflow-hidden" style={{ background: '#1A1A1A' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
        <div className="p-2 rounded-lg" style={{ background: '#262626' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{description}</p>
        </div>
        {action}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div className="rounded-xl p-4 border border-[#2A2A2A] flex items-center gap-4" style={{ background: '#0F0F0F' }}>
      <div className="p-2.5 rounded-xl" style={{ background: `${color}14` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ESSLAttendancePage() {
  const { toast } = useToast()

  // ---- Tab state ----
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'punches' | 'unmapped' | 'mappings' | 'import' | 'settings'>('dashboard')

  // ---- Dashboard state ----
  const [devices, setDevices] = React.useState<DeviceInfo[]>([])
  const [summary, setSummary] = React.useState<DeviceSummary>({ totalDevices: 0, onlineDevices: 0, totalPunchesToday: 0, totalUnmapped: 0 })
  const [dashLoading, setDashLoading] = React.useState(true)

  // ---- Punches state ----
  const [punches, setPunches] = React.useState<PunchRecord[]>([])
  const [punchPage, setPunchPage] = React.useState(1)
  const [punchTotal, setPunchTotal] = React.useState(0)
  const [punchLoading, setPunchLoading] = React.useState(false)

  // ---- Unmapped state ----
  const [unmappedUsers, setUnmappedUsers] = React.useState<UnmappedUser[]>([])
  const [unmappedLoading, setUnmappedLoading] = React.useState(false)
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([])
  const [mapForm, setMapForm] = React.useState<{ deviceSn: string; deviceUserId: string; employeeId: string } | null>(null)
  const [mappingLoading, setMappingLoading] = React.useState(false)
  const [employeeSearch, setEmployeeSearch] = React.useState('')

  // ---- Mappings state ----
  const [mappings, setMappings] = React.useState<DeviceMapping[]>([])
  const [mappingsLoading, setMappingsLoading] = React.useState(false)

  // ---- Settings state ----
  const [settings, setSettings] = React.useState({
    portalUrl: '', apiKey: '', deviceIp: '', autoSyncEnabled: true, syncInterval: '30',
  })
  const [settingsLoading, setSettingsLoading] = React.useState(false)
  const [settingsSaved, setSettingsSaved] = React.useState(false)
  const [showApiKey, setShowApiKey] = React.useState(false)

  // ---- Import state ----
  const [dragActive, setDragActive] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewData, setPreviewData] = React.useState<PreviewData[]>([])
  const [showPreview, setShowPreview] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<DuplicateStrategy>('skip')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ---- Auto-refresh ----
  const refreshInterval = React.useRef<NodeJS.Timeout | null>(null)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchDashboard = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/essl/devices')
      const json = await res.json()
      if (json.success) {
        setDevices(json.data.devices)
        setSummary(json.data.summary)
      }
    } catch (e) { console.error('Dashboard fetch error:', e) }
    finally { setDashLoading(false) }
  }, [])

  const fetchPunches = React.useCallback(async (page = 1) => {
    setPunchLoading(true)
    try {
      const res = await apiFetch(`/api/essl/punches?page=${page}&limit=30`)
      const json = await res.json()
      if (json.success) {
        setPunches(json.data.punches)
        setPunchTotal(json.data.pagination.total)
      }
    } catch (e) { console.error('Punches fetch error:', e) }
    finally { setPunchLoading(false) }
  }, [])

  const fetchUnmapped = React.useCallback(async () => {
    setUnmappedLoading(true)
    try {
      const res = await apiFetch('/api/essl/unmapped')
      const json = await res.json()
      if (json.success) {
        setUnmappedUsers(json.data.unmappedUsers)
      }
    } catch (e) { console.error('Unmapped fetch error:', e) }
    finally { setUnmappedLoading(false) }
  }, [])

  const fetchMappings = React.useCallback(async () => {
    setMappingsLoading(true)
    try {
      const res = await apiFetch('/api/essl/device-map')
      const json = await res.json()
      if (json.success) setMappings(json.data)
    } catch (e) { console.error('Mappings fetch error:', e) }
    finally { setMappingsLoading(false) }
  }, [])

  const fetchEmployees = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/employees?limit=500&status=ACTIVE')
      const json = await res.json()
      if (json.success && json.data) {
        const list = Array.isArray(json.data) ? json.data : json.data.employees || []
        setEmployees(list.map((e: any) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
          department: e.department,
        })))
      }
    } catch (e) { console.error('Employees fetch error:', e) }
  }, [])

  const fetchSettings = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/essl/settings')
      const json = await res.json()
      if (json.success && json.data) {
        setSettings({
          portalUrl: json.data.portalUrl || '',
          apiKey: json.data.apiKey || '',
          deviceIp: json.data.deviceIp || '',
          autoSyncEnabled: json.data.autoSyncEnabled ?? true,
          syncInterval: String(json.data.syncInterval || 30),
        })
      }
    } catch (_e) { /* use defaults */ }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    fetchDashboard()
    fetchSettings()
    fetchEmployees()
  }, [fetchDashboard, fetchSettings, fetchEmployees])

  // Tab-specific fetch
  React.useEffect(() => {
    if (activeTab === 'punches') fetchPunches(punchPage)
    if (activeTab === 'unmapped') fetchUnmapped()
    if (activeTab === 'mappings') fetchMappings()
  }, [activeTab, punchPage, fetchPunches, fetchUnmapped, fetchMappings])

  // Auto-refresh dashboard every 30s — only while the tab is visible.
  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      refreshInterval.current = setInterval(() => {
        if (document.visibilityState === 'visible') fetchDashboard()
      }, 30000)
      return () => { if (refreshInterval.current) clearInterval(refreshInterval.current) }
    }
  }, [activeTab, fetchDashboard])

  // -------------------------------------------------------------------------
  // Map user handler
  // -------------------------------------------------------------------------

  async function handleMapUser() {
    if (!mapForm) return
    setMappingLoading(true)
    try {
      const res = await apiFetch('/api/essl/unmapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapForm),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'User Mapped', description: json.message })
        setMapForm(null)
        fetchUnmapped()
        fetchDashboard()
        fetchMappings()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create mapping', variant: 'destructive' })
    } finally {
      setMappingLoading(false)
    }
  }

  async function handleDeleteMapping(id: string) {
    try {
      const res = await apiFetch(`/api/essl/device-map?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Mapping deleted' })
        fetchMappings()
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete mapping', variant: 'destructive' })
    }
  }

  // -------------------------------------------------------------------------
  // Settings handlers
  // -------------------------------------------------------------------------

  async function handleSaveSettings() {
    setSettingsLoading(true)
    setSettingsSaved(false)
    try {
      const res = await apiFetch('/api/essl/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalUrl: settings.portalUrl,
          apiKey: settings.apiKey,
          deviceIp: settings.deviceIp,
          autoSyncEnabled: settings.autoSyncEnabled,
          syncInterval: parseInt(settings.syncInterval),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 3000)
        toast({ title: 'Settings saved' })
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    } finally {
      setSettingsLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Import handlers
  // -------------------------------------------------------------------------

  function processFile(file: File) {
    setSelectedFile(file)
    setShowPreview(false)
    setPreviewData([])
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let workbook: XLSX.WorkBook
        if (isCsv) {
          workbook = XLSX.read(e.target!.result as string, { type: 'string' })
        } else {
          workbook = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
        }
        const json = XLSX.utils.sheet_to_json<ImportRow>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
        if (json.length === 0) { toast({ title: 'Empty file', variant: 'destructive' }); return }
        const processed: PreviewData[] = json.map((row: any, idx: number) => {
          const v = validateRow(row, idx)
          return {
            employee_code: String(row.employee_code ?? '').trim(),
            date: String(row.date ?? '').trim(),
            check_in_time: String(row.check_in_time ?? '').trim(),
            check_out_time: String(row.check_out_time ?? '').trim(),
            device_id: String(row.device_id ?? '').trim(),
            location: String(row.location ?? '').trim(),
            remarks: String(row.remarks ?? '').trim(),
            _rowIndex: idx + 2,
            _valid: v.valid,
            _error: v.error,
            _warning: v.warning,
            _mappedEmployeeCode: v.mappedCode,
          }
        })
        // Check duplicates
        const seen = new Map<string, number>()
        processed.forEach((row) => {
          const key = `${row.employee_code}|${row.date}`
          if (seen.has(key)) { row._isDuplicate = true } else { seen.set(key, processed.indexOf(row)) }
        })
        setPreviewData(processed)
        setShowPreview(true)
        toast({ title: 'File parsed', description: `${processed.length} records found.` })
      } catch (err) {
        toast({ title: 'Parse error', description: 'Could not read the file.', variant: 'destructive' })
      }
    }
    if (isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (previewData.length === 0) return
    setImporting(true)
    try {
      const validRows = previewData.filter(r => r._valid)
      const res = await apiFetch('/api/essl/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import: true, fileName: selectedFile?.name, records: validRows, duplicateStrategy }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Import completed', description: `${json.data?.successCount ?? validRows.length} records imported.` })
        setSelectedFile(null); setShowPreview(false); setPreviewData([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        toast({ title: 'Import failed', description: json.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Import failed', description: 'Network error', variant: 'destructive' })
    } finally { setImporting(false) }
  }

  // ---- Derived ----
  const validCount = previewData.filter(r => r._valid).length
  const filteredEmployees = employees.filter(e => {
    if (!employeeSearch) return true
    const q = employeeSearch.toLowerCase()
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
           e.employeeCode.toLowerCase().includes(q) ||
           e.department.toLowerCase().includes(q)
  })

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <Activity className="h-4 w-4" /> },
    { id: 'punches' as const, label: 'Live Punches', icon: <Zap className="h-4 w-4" /> },
    { id: 'unmapped' as const, label: 'Unmapped Users', icon: <AlertCircle className="h-4 w-4" />, badge: summary.totalUnmapped },
    { id: 'mappings' as const, label: 'Device Mappings', icon: <Link2 className="h-4 w-4" /> },
    { id: 'import' as const, label: 'Excel Import', icon: <Upload className="h-4 w-4" /> },
    { id: 'settings' as const, label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Biometric Attendance</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Real-time biometric device management, push receiver status, and attendance sync
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-[#2A2A2A] overflow-x-auto" style={{ background: '#0F0F0F' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}
            `}
            style={activeTab === tab.id ? { background: '#1A1A1A', borderColor: '#2A2A2A' } : {}}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && tab.badge > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ background: '#EF444420', color: '#EF4444' }}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* DASHBOARD TAB                                                       */}
      {/* ================================================================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Monitor className="h-5 w-5" style={{ color: '#60A5FA' }} />}
              label="Registered Devices"
              value={summary.totalDevices}
              color="#60A5FA"
              sub={`${summary.onlineDevices} online`}
            />
            <StatCard
              icon={<Zap className="h-5 w-5" style={{ color: '#22C55E' }} />}
              label="Punches Today"
              value={summary.totalPunchesToday}
              color="#22C55E"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" style={{ color: '#F59E0B' }} />}
              label="Unmapped Users"
              value={summary.totalUnmapped}
              color="#F59E0B"
              sub={summary.totalUnmapped > 0 ? 'Needs attention' : 'All mapped'}
            />
            <StatCard
              icon={<Users className="h-5 w-5" style={{ color: '#A78BFA' }} />}
              label="Online Devices"
              value={summary.onlineDevices}
              color="#A78BFA"
              sub={`of ${summary.totalDevices}`}
            />
          </div>

          {/* Push receiver URL */}
          <div className="rounded-xl p-4 border border-[#2A2A2A] flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ background: '#0F0F0F' }}>
            <div className="p-2 rounded-lg" style={{ background: '#22C55E14' }}>
              <Radio className="h-5 w-5" style={{ color: '#22C55E' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Push Receiver Active</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                Configure your eSSL device to push to: <code className="px-1.5 py-0.5 rounded text-[#22C55E] text-xs" style={{ background: '#22C55E14' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/iclock/cdata</code>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchDashboard(); toast({ title: 'Dashboard refreshed' }) }}
              className="border-[#2A2A2A] text-gray-300 hover:bg-[#262626] shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* Device cards */}
          <Section
            icon={<Monitor className="h-5 w-5 text-[#60A5FA]" />}
            title="Registered Devices"
            description="Biometric devices that have contacted the push receiver"
          >
            {dashLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Monitor className="h-10 w-10 text-gray-600" />
                <p className="text-sm" style={{ color: '#9CA3AF' }}>No devices registered yet</p>
                <p className="text-xs text-center max-w-sm" style={{ color: '#6B7280' }}>
                  Configure your eSSL device&apos;s Cloud Server / ADMS URL to point to this server. The device will register automatically on first contact.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {devices.map(device => (
                  <div key={device.sn} className="rounded-xl p-4 border border-[#2A2A2A] space-y-3" style={{ background: '#0F0F0F' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${device.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-sm font-semibold text-white font-mono">{device.sn}</span>
                      </div>
                      <Badge
                        variant={device.isOnline ? 'success' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {device.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Today</p>
                        <p className="text-lg font-bold text-white">{device.todayPunches}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Total</p>
                        <p className="text-lg font-bold text-white">{device.totalPunches}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Mapped</p>
                        <p className="text-lg font-bold text-white">{device.mappedUsers}</p>
                      </div>
                    </div>
                    {device.unmappedUsers > 0 && (
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#F59E0B0D', border: '1px solid #F59E0B20' }}>
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#F59E0B' }} />
                        <span style={{ color: '#F59E0B' }}>{device.unmappedUsers} unmapped user(s)</span>
                      </div>
                    )}
                    <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
                      <p>Last contact: {timeAgo(device.lastContact)}</p>
                      {device.lastPunch && (
                        <p>Last punch: {device.lastPunch.employeeName || `User #${device.lastPunch.deviceUserId}`} — {device.lastPunch.status.replace('_', ' ')} at {formatTime(device.lastPunch.time)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* ================================================================== */}
      {/* LIVE PUNCHES TAB                                                    */}
      {/* ================================================================== */}
      {activeTab === 'punches' && (
        <Section
          icon={<Zap className="h-5 w-5 text-[#22C55E]" />}
          title="Live Punch Feed"
          description="Recent attendance punches received from biometric devices"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPunches(punchPage)}
              disabled={punchLoading}
              className="border-[#2A2A2A] text-gray-300 hover:bg-[#262626]"
            >
              {punchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          }
        >
          {punchLoading && punches.length === 0 ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : punches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Zap className="h-10 w-10 text-gray-600" />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No punches received yet</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: '#1A1A1A' }}>
                      {['Time', 'Employee', 'Device User', 'Status', 'Verify', 'Device', 'Received'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-4 py-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {punches.map(p => (
                      <TableRow key={p.id} className="hover:bg-white/[0.02] transition-colors border-t border-[#2A2A2A]">
                        <TableCell className="px-4 py-3 text-sm text-white whitespace-nowrap font-mono">
                          {formatDateTime(p.punchTime)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {p.employee ? (
                            <div>
                              <p className="text-sm text-white">{p.employee.name}</p>
                              <p className="text-[10px]" style={{ color: '#6B7280' }}>{p.employee.code} · {p.employee.department}</p>
                            </div>
                          ) : (
                            <span className="text-xs italic" style={{ color: '#F59E0B' }}>Unmapped</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-gray-400 font-mono">#{p.deviceUserId}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(p.statusLabel)}
                            <span className="text-xs font-medium" style={{ color: getStatusColor(p.statusLabel) }}>
                              {p.statusLabel.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {getVerifyIcon(p.verifyLabel)}
                            <span className="text-xs">{p.verifyLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-gray-500 font-mono">{p.deviceSn}</TableCell>
                        <TableCell className="px-4 py-3 text-xs text-gray-500">{timeAgo(p.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{punchTotal} total punches</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={punchPage <= 1} onClick={() => setPunchPage(p => p - 1)} className="h-7 w-7 p-0 border border-[#2A2A2A] text-gray-400">
                    <ChevronUp className="h-4 w-4 -rotate-90" />
                  </Button>
                  <span className="text-xs text-gray-400 px-2">Page {punchPage}</span>
                  <Button variant="ghost" size="sm" disabled={punchPage * 30 >= punchTotal} onClick={() => setPunchPage(p => p + 1)} className="h-7 w-7 p-0 border border-[#2A2A2A] text-gray-400">
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Section>
      )}

      {/* ================================================================== */}
      {/* UNMAPPED USERS TAB                                                  */}
      {/* ================================================================== */}
      {activeTab === 'unmapped' && (
        <Section
          icon={<AlertCircle className="h-5 w-5 text-[#F59E0B]" />}
          title="Unmapped Device Users"
          description="Device users that haven't been linked to an HRMS employee yet. Punches are stored but won't appear in attendance until mapped."
        >
          {unmappedLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : unmappedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <CheckCircle2 className="h-10 w-10" style={{ color: '#22C55E' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>All device users are mapped!</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>No action needed. New unmapped users will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: '#1A1A1A' }}>
                      {['Device SN', 'Device User ID', 'Punches', 'Last Punch', 'Action'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-4 py-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmappedUsers.map((u, i) => (
                      <TableRow key={`${u.deviceSn}-${u.deviceUserId}`} className="hover:bg-white/[0.02] transition-colors border-t border-[#2A2A2A]">
                        <TableCell className="px-4 py-3 text-xs text-gray-400 font-mono">{u.deviceSn}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-sm font-medium text-white font-mono">{u.deviceUserId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-white">{u.punchCount}</TableCell>
                        <TableCell className="px-4 py-3 text-xs text-gray-400">{u.lastPunch ? formatDateTime(u.lastPunch) : '—'}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setMapForm({ deviceSn: u.deviceSn, deviceUserId: u.deviceUserId, employeeId: '' })
                              setEmployeeSearch('')
                            }}
                            className="h-7 text-xs"
                            style={{ background: '#22C55E', color: '#000', border: 'none' }}
                          >
                            <UserPlus className="h-3 w-3 mr-1" /> Map Employee
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Map form modal */}
              {mapForm && (
                <div className="rounded-xl p-5 border-2 space-y-4" style={{ background: '#1A1A1A', borderColor: '#22C55E40' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Link Device User <span className="font-mono text-[#22C55E]">#{mapForm.deviceUserId}</span> to Employee
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Device: {mapForm.deviceSn}</p>
                    </div>
                    <button onClick={() => setMapForm(null)} className="p-1 rounded hover:bg-[#2A2A2A]">
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Search Employee</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                        placeholder="Search by name, code, or department..."
                        className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm pl-9"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
                    {filteredEmployees.length === 0 ? (
                      <p className="text-xs text-gray-500 p-4 text-center">No employees found</p>
                    ) : (
                      filteredEmployees.slice(0, 20).map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => setMapForm({ ...mapForm, employeeId: emp.id })}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[#2A2A2A] last:border-b-0 ${
                            mapForm.employeeId === emp.id ? 'bg-[#22C55E14]' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#262626', color: '#9CA3AF' }}>
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[10px]" style={{ color: '#6B7280' }}>{emp.employeeCode} · {emp.department}</p>
                          </div>
                          {mapForm.employeeId === emp.id && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setMapForm(null)} className="border-[#2A2A2A] text-gray-300">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!mapForm.employeeId || mappingLoading}
                      onClick={handleMapUser}
                      style={{ background: '#22C55E', color: '#000', border: 'none' }}
                    >
                      {mappingLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
                      {mappingLoading ? 'Mapping...' : 'Confirm Mapping'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ================================================================== */}
      {/* DEVICE MAPPINGS TAB                                                 */}
      {/* ================================================================== */}
      {activeTab === 'mappings' && (
        <Section
          icon={<Link2 className="h-5 w-5 text-[#A78BFA]" />}
          title="Device User Mappings"
          description="Links between biometric device user IDs and HRMS employees"
        >
          {mappingsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Link2 className="h-10 w-10 text-gray-600" />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No mappings created yet</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Go to the &quot;Unmapped Users&quot; tab to link device users to employees.</p>
            </div>
          ) : (
            <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#1A1A1A' }}>
                    {['Device SN', 'Device User ID', 'Employee', 'Code', 'Department', 'Created', ''].map(h => (
                      <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-4 py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => (
                    <TableRow key={m.id} className="hover:bg-white/[0.02] transition-colors border-t border-[#2A2A2A]">
                      <TableCell className="px-4 py-3 text-xs text-gray-400 font-mono">{m.deviceSn}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-white font-mono">#{m.deviceUserId}</TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-white">{m.employee.name}</p>
                        <p className="text-[10px]" style={{ color: '#6B7280' }}>{m.employee.designation}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-400 font-mono">{m.employee.code}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-400">{m.employee.department}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-500">{formatDate(m.createdAt)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMapping(m.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>
      )}

      {/* ================================================================== */}
      {/* EXCEL IMPORT TAB                                                    */}
      {/* ================================================================== */}
      {activeTab === 'import' && (
        <>
          <Section
            icon={<Upload className="h-5 w-5 text-[#A78BFA]" />}
            title="Manual Import"
            description="Upload an Excel file containing attendance records"
          >
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3">
                <div
                  className={`
                    relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center gap-3 py-10 px-6
                    ${dragActive ? 'border-[#A78BFA] bg-[#A78BFA]/[0.05]'
                      : selectedFile ? 'border-[#22C55E] bg-[#22C55E]/[0.04]'
                      : 'border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#404040]'}
                  `}
                  onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
                  onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
                  onClick={() => !selectedFile && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                  {selectedFile ? (
                    <>
                      <FileSpreadsheet className="h-10 w-10" style={{ color: '#22C55E' }} />
                      <div className="text-center">
                        <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setShowPreview(false); setPreviewData([]) }} className="absolute top-3 right-3 p-1 rounded hover:bg-[#2A2A2A]">
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="h-10 w-10 text-gray-500" />
                      <p className="text-sm font-medium text-white">{dragActive ? 'Drop here' : 'Drag & drop Excel file'}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Supports .xlsx, .xls, .csv</p>
                    </>
                  )}
                </div>
              </div>
              <div className="xl:col-span-2 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Expected Columns</p>
                  <div className="space-y-1.5">
                    {[
                      { col: 'employee_code', req: true }, { col: 'date', req: true },
                      { col: 'check_in_time', req: false }, { col: 'check_out_time', req: false },
                      { col: 'device_id', req: false }, { col: 'location', req: false }, { col: 'remarks', req: false },
                    ].map(({ col, req }) => (
                      <div key={col} className="flex items-center gap-2 text-xs">
                        <code className="px-1.5 py-0.5 rounded font-mono text-[#A78BFA]" style={{ background: '#A78BFA14' }}>{col}</code>
                        {req && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#EF444420', color: '#EF4444' }}>REQUIRED</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full border-[#2A2A2A] text-gray-300 hover:bg-[#262626]" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Download Template
                </Button>
              </div>
            </div>
          </Section>

          {showPreview && (
            <Section
              icon={<FileText className="h-5 w-5 text-[#F59E0B]" />}
              title="Import Preview"
              description={`${previewData.length} records from ${selectedFile?.name}`}
            >
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-300">Duplicate handling:</Label>
                  <Select value={duplicateStrategy} onValueChange={v => setDuplicateStrategy(v as DuplicateStrategy)}>
                    <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-xs h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="overwrite">Overwrite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(false)} className="border-[#2A2A2A] text-gray-300 text-xs h-8">
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" disabled={validCount === 0 || importing} onClick={handleImport} className="text-xs h-8" style={{ background: '#22C55E', color: '#000' }}>
                    {importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {importing ? 'Importing...' : `Import ${validCount} Records`}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: '#1A1A1A' }}>
                      {['#', 'employee_code', 'date', 'check_in', 'check_out', 'Status'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-3 py-2">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx} className={!row._valid ? 'bg-red-950/20' : row._isDuplicate ? 'bg-amber-950/20' : 'hover:bg-white/[0.02]'}>
                        <TableCell className="text-xs text-gray-500 px-3 py-2">{row._rowIndex}</TableCell>
                        <TableCell className="text-xs text-white px-3 py-2 font-mono">{row.employee_code || '—'}</TableCell>
                        <TableCell className="text-xs text-gray-300 px-3 py-2">{row.date || '—'}</TableCell>
                        <TableCell className="text-xs text-gray-300 px-3 py-2">{row.check_in_time || '—'}</TableCell>
                        <TableCell className="text-xs text-gray-300 px-3 py-2">{row.check_out_time || '—'}</TableCell>
                        <TableCell className="px-3 py-2">
                          {!row._valid ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><XCircle className="h-3 w-3 mr-0.5" /> {row._error}</Badge>
                          ) : row._isDuplicate ? (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0"><AlertCircle className="h-3 w-3 mr-0.5" /> Duplicate</Badge>
                          ) : (
                            <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewData.length > 50 && <p className="text-xs mt-2" style={{ color: '#6B7280' }}>Showing 50 of {previewData.length} records</p>}
            </Section>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* SETTINGS TAB                                                        */}
      {/* ================================================================== */}
      {activeTab === 'settings' && (
        <>
          {/* Push receiver info */}
          <Section
            icon={<Radio className="h-5 w-5 text-[#22C55E]" />}
            title="Push Receiver Configuration"
            description="Configure your eSSL FACE-MB160 device to push data to this server"
          >
            <div className="space-y-4">
              <div className="rounded-lg p-4 border border-[#2A2A2A] space-y-3" style={{ background: '#0F0F0F' }}>
                <p className="text-sm font-medium text-white">Device Setup Instructions</p>
                <div className="space-y-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <p>1. On the device, go to <span className="text-white font-medium">COMM → Cloud Server Setting</span></p>
                  <p>2. Set <span className="text-white font-medium">Connection Mode</span> to <span className="text-[#22C55E]">ADMS</span> or <span className="text-[#22C55E]">Cloud Server</span></p>
                  <p>3. Set <span className="text-white font-medium">Server Address</span> to:</p>
                  <code className="block px-3 py-2 rounded-lg text-[#22C55E] text-sm" style={{ background: '#22C55E0D', border: '1px solid #22C55E20' }}>
                    {typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com'}
                  </code>
                  <p>4. Set <span className="text-white font-medium">Port</span> to: <span className="text-[#22C55E]">{typeof window !== 'undefined' && window.location.protocol === 'https:' ? '443' : '80'}</span></p>
                  <p>5. Enable the connection and the device will register automatically.</p>
                </div>
              </div>

              <div className="rounded-lg p-4 border border-[#2A2A2A] space-y-3" style={{ background: '#0F0F0F' }}>
                <p className="text-sm font-medium text-white">Test with curl</p>
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Simulate device handshake:</p>
                  <code className="block px-3 py-2 rounded-lg text-xs break-all" style={{ background: '#1A1A1A', color: '#60A5FA', border: '1px solid #2A2A2A' }}>
                    curl &quot;{typeof window !== 'undefined' ? window.location.origin : ''}/iclock/cdata?SN=TEST001&options=all&quot;
                  </code>
                  <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>Simulate ATTLOG push:</p>
                  <code className="block px-3 py-2 rounded-lg text-xs break-all" style={{ background: '#1A1A1A', color: '#60A5FA', border: '1px solid #2A2A2A' }}>
                    {`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1" -H "Content-Type: text/plain" -d "1\\t2026-07-11 09:00:00\\t0\\t15\\t\\t0\\t0\\t0\\t0\\t0"`}
                  </code>
                </div>
              </div>
            </div>
          </Section>

          {/* Legacy ESSL settings */}
          <Section
            icon={<Settings className="h-5 w-5 text-[#60A5FA]" />}
            title="ESSL Connection Settings"
            description="Legacy connection settings for manual sync and API key management"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-300">Portal URL</Label>
                  <Input value={settings.portalUrl} onChange={e => setSettings(s => ({ ...s, portalUrl: e.target.value }))} placeholder="https://essl.company.com/api" className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-300">API Key</Label>
                  <div className="relative">
                    <Input type={showApiKey ? 'text' : 'password'} value={settings.apiKey} onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))} placeholder="essl_sk_live_..." className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm pr-10" />
                    <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-300">Device IP</Label>
                  <Input value={settings.deviceIp} onChange={e => setSettings(s => ({ ...s, deviceIp: e.target.value }))} placeholder="192.168.1.100" className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
                  <div>
                    <p className="text-sm font-medium text-white">Auto-Sync</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Sync at set intervals</p>
                  </div>
                  <Switch checked={settings.autoSyncEnabled} onCheckedChange={v => setSettings(s => ({ ...s, autoSyncEnabled: v }))} />
                </div>
                {settings.autoSyncEnabled && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-300">Interval</Label>
                    <Select value={settings.syncInterval} onValueChange={v => setSettings(s => ({ ...s, syncInterval: v }))}>
                      <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                        {['5', '10', '15', '30', '60'].map(v => (
                          <SelectItem key={v} value={v}>{v === '60' ? 'Every 1 hour' : `Every ${v} minutes`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleSaveSettings} disabled={settingsLoading} className="w-full mt-2" style={{ background: '#60A5FA', color: '#000' }}>
                  {settingsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : settingsSaved ? <CheckCircle2 className="h-4 w-4 mr-2" style={{ color: '#16A34A' }} /> : <Settings className="h-4 w-4 mr-2" />}
                  {settingsLoading ? 'Saving...' : settingsSaved ? 'Saved!' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </Section>
        </>
      )}

    </div>
  )
}
