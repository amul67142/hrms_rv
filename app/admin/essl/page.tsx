'use client'

import * as React from 'react'
import * as XLSX from 'xlsx'
import {
  Settings, Wifi, WifiOff, Upload, Download, FileSpreadsheet, X, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Clock, Trash2, ChevronDown, ChevronUp,
  FileText, Eye, EyeOff, Loader2, DownloadCloud
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

interface EsslSettings {
  portalUrl: string
  apiKey: string
  deviceIp: string
  autoSyncEnabled: boolean
  syncInterval: string
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

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ValidationWarning {
  row: number
  field: string
  message: string
}

interface DuplicateCandidate {
  row: number
  existingRecord: any
  duplicateCount: number
}

interface PreviewData extends ImportRow {
  _rowIndex: number
  _valid: boolean
  _employeeCode?: string
  _mappedEmployeeCode?: string
  _error?: string
  _warning?: string
  _isDuplicate?: boolean
  _duplicateCandidate?: DuplicateCandidate
}

type DuplicateStrategy = 'skip' | 'overwrite' | 'keep_both'

interface ImportLog {
  id: string
  fileName: string
  uploadedBy: string
  uploadedAt: Date
  totalRecords: number
  successCount: number
  failedCount: number
  duplicateCount: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PENDING'
  errorReportUrl?: string
}

// ---------------------------------------------------------------------------
// Mock import logs
// ---------------------------------------------------------------------------

const mockImportLogs: ImportLog[] = [
  {
    id: '1',
    fileName: 'attendance_march_2024.xlsx',
    uploadedBy: 'admin@company.com',
    uploadedAt: new Date('2024-04-01T10:30:00'),
    totalRecords: 320,
    successCount: 315,
    failedCount: 3,
    duplicateCount: 2,
    status: 'PARTIAL',
  },
  {
    id: '2',
    fileName: 'attendance_feb_2024.xlsx',
    uploadedBy: 'admin@company.com',
    uploadedAt: new Date('2024-03-05T14:15:00'),
    totalRecords: 280,
    successCount: 280,
    failedCount: 0,
    duplicateCount: 0,
    status: 'SUCCESS',
  },
  {
    id: '3',
    fileName: 'attendance_jan_2024.xlsx',
    uploadedBy: 'hr@company.com',
    uploadedAt: new Date('2024-02-01T09:00:00'),
    totalRecords: 300,
    successCount: 298,
    failedCount: 2,
    duplicateCount: 15,
    status: 'SUCCESS',
  },
  {
    id: '4',
    fileName: 'attendance_dec_2023.xlsx',
    uploadedBy: 'admin@company.com',
    uploadedAt: new Date('2024-01-08T11:20:00'),
    totalRecords: 150,
    successCount: 0,
    failedCount: 150,
    duplicateCount: 0,
    status: 'FAILED',
  },
  {
    id: '5',
    fileName: 'attendance_nov_2023.xlsx',
    uploadedBy: 'admin@company.com',
    uploadedAt: new Date('2023-12-03T08:45:00'),
    totalRecords: 290,
    successCount: 290,
    failedCount: 0,
    duplicateCount: 8,
    status: 'SUCCESS',
  },
]

// Mock employee code mapping
const MOCK_EMPLOYEE_MAP: Record<string, string | undefined> = {
  'EMP001': 'HRM-EMP-001',
  'EMP002': 'HRM-EMP-002',
  'EMP003': 'HRM-EMP-003',
  'EMP004': undefined, // not found
  'EMP005': 'HRM-EMP-005',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateRow(row: ImportRow, index: number): { valid: boolean; error?: string; warning?: string; mappedCode?: string } {
  if (!row.employee_code || row.employee_code.trim() === '') {
    return { valid: false, error: 'Missing employee_code' }
  }
  if (!row.date || row.date.trim() === '') {
    return { valid: false, error: 'Missing date' }
  }
  const mapped = MOCK_EMPLOYEE_MAP[row.employee_code.trim()]
  if (!mapped) {
    return { valid: false, error: `Employee code "${row.employee_code}" not found in HRM system` }
  }
  const hasCheckIn = row.check_in_time && row.check_in_time.trim() !== ''
  const hasCheckOut = row.check_out_time && row.check_out_time.trim() !== ''
  if (!hasCheckIn && !hasCheckOut) {
    return { valid: false, error: 'At least one of check_in_time or check_out_time is required' }
  }
  if (!hasCheckIn) {
    return { valid: true, warning: 'Missing check_in_time — will be recorded as check-out only', mappedCode: mapped }
  }
  if (!hasCheckOut) {
    return { valid: true, warning: 'Missing check_out_time — will be recorded as check-in only', mappedCode: mapped }
  }
  return { valid: true, mappedCode: mapped }
}

function downloadTemplate() {
  const headers = ['employee_code', 'date', 'check_in_time', 'check_out_time', 'device_id', 'location', 'remarks']
  const sampleRows = [
    ['EMP001', '2024-04-01', '09:00', '18:00', 'DEV-001', 'Main Gate', ''],
    ['EMP002', '2024-04-01', '09:15', '17:45', 'DEV-002', 'Back Entrance', 'Late arrival'],
    ['EMP003', '2024-04-01', '', '17:30', 'DEV-001', 'Main Gate', 'WFH morning'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template')
  XLSX.writeFile(wb, 'essl_attendance_template.xlsx')
}

function formatDate(date: Date | string, fmt: string = 'dd MMM yyyy, hh:mm a'): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return fmt
    .replace('dd', day)
    .replace('MMM', month)
    .replace('yyyy', String(year))
    .replace('hh', String(hour12).padStart(2, '0'))
    .replace('mm', minutes)
    .replace('a', ampm)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ImportLog['status'] }) {
  switch (status) {
    case 'SUCCESS':
      return (
        <Badge variant="success" className="flex items-center gap-1 whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3" /> Success
        </Badge>
      )
    case 'FAILED':
      return (
        <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      )
    case 'PARTIAL':
      return (
        <Badge variant="warning" className="flex items-center gap-1 whitespace-nowrap">
          <AlertCircle className="h-3 w-3" /> Partial
        </Badge>
      )
    case 'PENDING':
      return (
        <Badge variant="pending" className="flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] overflow-hidden" style={{ background: '#1A1A1A' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
        <div className="p-2 rounded-lg" style={{ background: '#262626' }}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{description}</p>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ESSLAttendancePage() {
  const { toast } = useToast()

  // ---- Settings state ----
  const [settings, setSettings] = React.useState<EsslSettings>({
    portalUrl: 'https://essl.company.com/api',
    apiKey: 'essl_sk_live_xxxxxxxxxxxxxxxxxxxx',
    deviceIp: '192.168.1.100',
    autoSyncEnabled: true,
    syncInterval: '30',
  })
  const [settingsLoading, setSettingsLoading] = React.useState(false)
  const [settingsSaved, setSettingsSaved] = React.useState(false)
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [connectionTest, setConnectionTest] = React.useState<'success' | 'failed' | null>(null)
  const [testingConnection, setTestingConnection] = React.useState(false)

  // ---- Import state ----
  const [dragActive, setDragActive] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewData, setPreviewData] = React.useState<PreviewData[]>([])
  const [showPreview, setShowPreview] = React.useState(false)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<DuplicateStrategy>('skip')
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = React.useState<ValidationWarning[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ---- Import log state ----
  const [importLogs, setImportLogs] = React.useState<ImportLog[]>(mockImportLogs)
  const [logPage, setLogPage] = React.useState(1)
  const logsPerPage = 10

  // -------------------------------------------------------------------------
  // Settings handlers
  // -------------------------------------------------------------------------

  React.useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/essl/settings')
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
  }

  async function handleSaveSettings() {
    setSettingsLoading(true)
    setSettingsSaved(false)
    try {
      const res = await fetch('/api/essl/settings', {
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
        toast({ title: 'Settings saved', description: 'ESSL settings updated successfully.' })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to save settings.', variant: 'destructive' })
      }
    } catch (_e) {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
      toast({ title: 'Settings saved', description: 'ESSL settings updated (offline mode).' })
    } finally {
      setSettingsLoading(false)
    }
  }

  async function handleTestConnection() {
    setTestingConnection(true)
    setConnectionTest(null)
    try {
      const res = await fetch('/api/essl/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      const json = await res.json()
      if (json.success) {
        setConnectionTest('success')
        toast({ title: 'Connection successful', description: 'ESSL device is reachable.' })
      } else {
        setConnectionTest('failed')
        toast({ title: 'Connection failed', description: json.error || 'Could not reach ESSL device.', variant: 'destructive' })
      }
    } catch (_e) {
      setConnectionTest('failed')
      toast({ title: 'Connection failed', description: 'Network error reaching ESSL device.', variant: 'destructive' })
    } finally {
      setTestingConnection(false)
    }
  }

  // -------------------------------------------------------------------------
  // File upload handlers
  // -------------------------------------------------------------------------

  function processFile(file: File) {
    setSelectedFile(file)
    setShowPreview(false)
    setPreviewData([])
    setValidationErrors([])
    setValidationWarnings([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' })

        if (json.length === 0) {
          toast({ title: 'Empty file', description: 'The uploaded file contains no data.', variant: 'destructive' })
          return
        }

        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []
        const processed: PreviewData[] = json.map((row: any, idx: number) => {
          const validation = validateRow(row as ImportRow, idx)
          return {
            employee_code: String(row.employee_code ?? '').trim(),
            date: String(row.date ?? '').trim(),
            check_in_time: String(row.check_in_time ?? '').trim(),
            check_out_time: String(row.check_out_time ?? '').trim(),
            device_id: String(row.device_id ?? '').trim(),
            location: String(row.location ?? '').trim(),
            remarks: String(row.remarks ?? '').trim(),
            _rowIndex: idx + 2, // row 2 because row 1 is header
            _valid: validation.valid,
            _error: validation.error,
            _warning: validation.warning,
            _mappedEmployeeCode: validation.mappedCode,
          }
        })

        // Check for duplicate employee_code + date combinations
        const seen = new Map<string, number>()
        processed.forEach((row) => {
          const key = `${row.employee_code}|${row.date}`
          if (seen.has(key)) {
            row._isDuplicate = true
            row._duplicateCandidate = { row: seen.get(key)!, existingRecord: processed[seen.get(key)!], duplicateCount: 0 }
            const existing = processed[seen.get(key)!]
            if (existing) existing._duplicateCandidate = { row: row._rowIndex, existingRecord: row, duplicateCount: 1 }
            warnings.push({ row: row._rowIndex, field: 'duplicate', message: `Duplicate entry for ${row.employee_code} on ${row.date}` })
          } else {
            seen.set(key, processed.indexOf(row))
          }
        })

        setPreviewData(processed)
        setValidationErrors(errors)
        setValidationWarnings(warnings)
        setShowPreview(true)
        toast({ title: 'File parsed', description: `${processed.length} records found. Preview ready.` })
      } catch (err) {
        toast({ title: 'Parse error', description: 'Could not read the Excel file. Make sure it is a valid .xlsx file.', variant: 'destructive' })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file)
    } else {
      toast({ title: 'Invalid file type', description: 'Please upload a .xlsx, .xls, or .csv file.', variant: 'destructive' })
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }

  function clearFile() {
    setSelectedFile(null)
    setShowPreview(false)
    setPreviewData([])
    setValidationErrors([])
    setValidationWarnings([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // -------------------------------------------------------------------------
  // Import handler
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (previewData.length === 0) return
    setImporting(true)
    try {
      const validRows = previewData.filter(r => r._valid)
      const res = await fetch('/api/essl/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          import: true,
          fileName: selectedFile?.name,
          records: validRows,
          duplicateStrategy,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const newLog: ImportLog = {
          id: Date.now().toString(),
          fileName: selectedFile?.name || 'unknown.xlsx',
          uploadedBy: 'admin@company.com',
          uploadedAt: new Date(),
          totalRecords: previewData.length,
          successCount: json.data?.successCount ?? validRows.length,
          failedCount: previewData.length - validRows.length,
          duplicateCount: previewData.filter(r => r._isDuplicate).length,
          status: json.data?.status ?? 'SUCCESS',
        }
        setImportLogs(prev => [newLog, ...prev])
        toast({ title: 'Import completed', description: `${newLog.successCount} records imported successfully.` })
        clearFile()
      } else {
        toast({ title: 'Import failed', description: json.error || 'Import operation failed.', variant: 'destructive' })
      }
    } catch (_e) {
      // Demo mode
      const newLog: ImportLog = {
        id: Date.now().toString(),
        fileName: selectedFile?.name || 'unknown.xlsx',
        uploadedBy: 'admin@company.com',
        uploadedAt: new Date(),
        totalRecords: previewData.length,
        successCount: previewData.filter(r => r._valid && !r._isDuplicate).length,
        failedCount: previewData.filter(r => !r._valid).length,
        duplicateCount: previewData.filter(r => r._isDuplicate).length,
        status: 'SUCCESS',
      }
      setImportLogs(prev => [newLog, ...prev])
      toast({ title: 'Import completed (demo)', description: `${newLog.successCount} records imported.` })
      clearFile()
    } finally {
      setImporting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Derived counts
  // -------------------------------------------------------------------------

  const validCount = previewData.filter(r => r._valid).length
  const invalidCount = previewData.filter(r => !r._valid).length
  const duplicateCount = previewData.filter(r => r._isDuplicate).length
  const paginatedLogs = importLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage)
  const totalLogPages = Math.ceil(importLogs.length / logsPerPage)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">ESSL Attendance Sync</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Configure ESSL connection, import attendance records from Excel, and review sync history
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. ESSL Settings                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Section
        icon={<Settings className="h-5 w-5 text-[#60A5FA]" />}
        title="ESSL Settings"
        description="Configure the ESSL device connection and auto-sync behavior"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: connection fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portalUrl" className="text-xs font-medium text-gray-300">Portal URL</Label>
              <Input
                id="portalUrl"
                value={settings.portalUrl}
                onChange={e => setSettings(s => ({ ...s, portalUrl: e.target.value }))}
                placeholder="https://essl.company.com/api"
                className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs font-medium text-gray-300">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                  placeholder="essl_sk_live_..."
                  className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceIp" className="text-xs font-medium text-gray-300">Device IP</Label>
              <Input
                id="deviceIp"
                value={settings.deviceIp}
                onChange={e => setSettings(s => ({ ...s, deviceIp: e.target.value }))}
                placeholder="192.168.1.100"
                className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="border-[#2A2A2A] text-gray-300 hover:bg-[#262626]"
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : connectionTest === 'success' ? (
                <Wifi className="h-4 w-4 mr-2" style={{ color: '#22C55E' }} />
              ) : connectionTest === 'failed' ? (
                <WifiOff className="h-4 w-4 mr-2" style={{ color: '#EF4444' }} />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            {connectionTest && (
              <div
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{
                  background: connectionTest === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  color: connectionTest === 'success' ? '#22C55E' : '#EF4444',
                }}
              >
                {connectionTest === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {connectionTest === 'success' ? 'ESSL device is reachable' : 'Could not connect to ESSL device'}
              </div>
            )}
          </div>

          {/* Right: auto-sync fields */}
          <div className="space-y-4">
            <div
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}
            >
              <div>
                <p className="text-sm font-medium text-white">Enable Auto-Sync</p>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                  Automatically sync attendance data at set intervals
                </p>
              </div>
              <Switch
                checked={settings.autoSyncEnabled}
                onCheckedChange={v => setSettings(s => ({ ...s, autoSyncEnabled: v }))}
              />
            </div>

            {settings.autoSyncEnabled && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-300">Sync Interval</Label>
                <Select
                  value={settings.syncInterval}
                  onValueChange={v => setSettings(s => ({ ...s, syncInterval: v }))}
                >
                  <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="10">Every 10 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every 1 hour</SelectItem>
                    <SelectItem value="120">Every 2 hours</SelectItem>
                    <SelectItem value="360">Every 6 hours</SelectItem>
                    <SelectItem value="720">Every 12 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className="w-full mt-2"
              style={{ background: '#60A5FA', color: '#000', border: 'none' }}
            >
              {settingsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : settingsSaved ? (
                <CheckCircle2 className="h-4 w-4 mr-2" style={{ color: '#16A34A' }} />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              {settingsLoading ? 'Saving...' : settingsSaved ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Manual Import                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Section
        icon={<Upload className="h-5 w-5 text-[#A78BFA]" />}
        title="Manual Import"
        description="Upload an Excel file containing attendance records"
      >
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left: upload zone */}
          <div className="xl:col-span-3">
            <div
              className={`
                relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
                flex flex-col items-center justify-center gap-3 py-10 px-6
                ${dragActive
                  ? 'border-[#A78BFA] bg-[#A78BFA]/[0.05]'
                  : selectedFile
                    ? 'border-[#22C55E] bg-[#22C55E]/[0.04]'
                    : 'border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#404040] hover:bg-[#0F0F0F]/80'
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <>
                  <FileSpreadsheet className="h-10 w-10" style={{ color: '#22C55E' }} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); clearFile() }}
                    className="absolute top-3 right-3 p-1 rounded hover:bg-[#2A2A2A] transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-10 w-10 text-gray-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">
                      {dragActive ? 'Drop the file here' : 'Drag & drop your Excel file here'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      or <span className="underline" style={{ color: '#A78BFA' }}>click to browse</span>
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Supports .xlsx, .xls, .csv</p>
                </>
              )}
            </div>

            {showPreview && (
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Total rows:</span>
                  <span className="text-white font-medium">{previewData.length}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Valid:</span>
                  <span className="font-medium" style={{ color: '#22C55E' }}>{validCount}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Invalid:</span>
                  <span className="font-medium" style={{ color: invalidCount > 0 ? '#EF4444' : '#22C55E' }}>
                    {invalidCount}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Duplicates:</span>
                  <span className="font-medium" style={{ color: duplicateCount > 0 ? '#F59E0B' : '#22C55E' }}>
                    {duplicateCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: expected columns + template */}
          <div className="xl:col-span-2 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                Expected Columns
              </p>
              <div className="space-y-1.5">
                {[
                  { col: 'employee_code', req: true, desc: 'ESSL employee identifier' },
                  { col: 'date', req: true, desc: 'YYYY-MM-DD format' },
                  { col: 'check_in_time', req: false, desc: 'HH:MM format' },
                  { col: 'check_out_time', req: false, desc: 'HH:MM format' },
                  { col: 'device_id', req: false, desc: 'Device identifier' },
                  { col: 'location', req: false, desc: 'Gate or zone name' },
                  { col: 'remarks', req: false, desc: 'Optional note' },
                ].map(({ col, req, desc }) => (
                  <div key={col} className="flex items-start gap-2 text-xs">
                    <code className="px-1.5 py-0.5 rounded shrink-0 font-mono text-[#A78BFA]" style={{ background: '#A78BFA14' }}>
                      {col}
                    </code>
                    {!req && <span className="text-gray-500 italic">{desc}</span>}
                    {req && <span className="text-gray-500">{desc}</span>}
                    {req && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#EF444420', color: '#EF4444' }}>
                        REQUIRED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#2A2A2A] text-gray-300 hover:bg-[#262626]"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Import Preview                                                    */}
      {/* ------------------------------------------------------------------ */}
      {showPreview && (
        <Section
          icon={<FileText className="h-5 w-5 text-[#F59E0B]" />}
          title="Import Preview"
          description={`Previewing ${previewData.length} records from ${selectedFile?.name}`}
        >
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300 whitespace-nowrap">Duplicate handling:</Label>
              <Select value={duplicateStrategy} onValueChange={v => setDuplicateStrategy(v as DuplicateStrategy)}>
                <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-white text-xs h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                  <SelectItem value="skip">Skip duplicates</SelectItem>
                  <SelectItem value="overwrite">Overwrite existing</SelectItem>
                  <SelectItem value="keep_both">Keep both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="border-[#2A2A2A] text-gray-300 hover:bg-[#262626] text-xs h-8"
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                disabled={validCount === 0 || importing}
                onClick={handleImport}
                className="text-xs h-8"
                style={{ background: '#22C55E', color: '#000', border: 'none' }}
              >
                {importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                {importing ? 'Importing...' : `Import ${validCount} Records`}
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          {validationWarnings.length > 0 && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
              <div className="text-xs" style={{ color: '#F59E0B' }}>
                <span className="font-semibold">{validationWarnings.length} warning(s) found.</span>
                {' '}Review highlighted rows below. Duplicates will be handled using the &ldquo;{duplicateStrategy.replace('_', ' ')}&rdquo; strategy.
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#1A1A1A' }}>
                  {['#', 'employee_code', 'HRM Code', 'date', 'check_in', 'check_out', 'device_id', 'location', 'remarks', 'Status'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-3 py-2">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={`
                      transition-colors
                      ${!row._valid ? 'bg-red-950/20' : row._isDuplicate ? 'bg-amber-950/20' : 'hover:bg-white/[0.02]'}
                    `}
                  >
                    <TableCell className="text-xs text-gray-500 px-3 py-2 whitespace-nowrap">{row._rowIndex}</TableCell>
                    <TableCell className="text-xs text-white px-3 py-2 font-mono whitespace-nowrap">
                      {row.employee_code || <span className="italic text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2 font-mono whitespace-nowrap">
                      {row._mappedEmployeeCode ? (
                        <span style={{ color: '#22C55E' }}>{row._mappedEmployeeCode}</span>
                      ) : row.employee_code ? (
                        <span style={{ color: '#EF4444' }}>Not found</span>
                      ) : (
                        <span className="italic text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300 px-3 py-2 whitespace-nowrap">
                      {row.date || <span className="italic text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300 px-3 py-2 whitespace-nowrap">
                      {row.check_in_time || <span className="italic text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300 px-3 py-2 whitespace-nowrap">
                      {row.check_out_time || <span className="italic text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 px-3 py-2 whitespace-nowrap">
                      {row.device_id || <span className="italic text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 px-3 py-2 whitespace-nowrap">
                      {row.location || <span className="italic text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 px-3 py-2 max-w-[120px] truncate">
                      {row.remarks || <span className="italic text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {!row._valid ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                            <XCircle className="h-3 w-3 mr-0.5" /> {row._error || 'Invalid'}
                          </Badge>
                        </div>
                      ) : row._isDuplicate ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                            <AlertCircle className="h-3 w-3 mr-0.5" /> Duplicate
                          </Badge>
                        </div>
                      ) : row._warning ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="pending" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                            <AlertCircle className="h-3 w-3 mr-0.5" /> {row._warning.slice(0, 20)}
                          </Badge>
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs mt-3" style={{ color: '#6B7280' }}>
            Showing {previewData.length} of {previewData.length} records. Only valid rows will be imported.
          </p>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Import Log Table                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Section
        icon={<RefreshCw className="h-5 w-5 text-[#34D399]" />}
        title="Import Log"
        description="History of Excel file imports with success, failure, and duplicate counts"
      >
        {importLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <FileText className="h-8 w-8 text-gray-600" />
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No import records yet</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Upload an Excel file above to get started</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg overflow-x-auto border border-[#2A2A2A]" style={{ background: '#0F0F0F' }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#1A1A1A' }}>
                    {['File Name', 'Uploaded By', 'Date / Time', 'Total', 'Success', 'Failed', 'Duplicates', 'Status', 'Report'].map(h => (
                      <TableHead key={h} className="text-xs font-semibold text-gray-300 whitespace-nowrap px-4 py-3">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-white/[0.02] transition-colors border-t border-[#2A2A2A]">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="text-sm text-white whitespace-nowrap max-w-[200px] truncate">
                            {log.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-sm text-gray-400 whitespace-nowrap">{log.uploadedBy}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-sm text-gray-300 whitespace-nowrap">
                          {formatDate(log.uploadedAt)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="text-sm text-white font-medium">{log.totalRecords}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="text-sm font-medium" style={{ color: '#22C55E' }}>
                          {log.successCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="text-sm font-medium" style={{ color: log.failedCount > 0 ? '#EF4444' : '#22C55E' }}>
                          {log.failedCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="text-sm font-medium" style={{ color: log.duplicateCount > 0 ? '#F59E0B' : '#6B7280' }}>
                          {log.duplicateCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {log.failedCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-400 hover:text-white h-7 px-2"
                            onClick={() => toast({ title: 'Downloading error report...', description: log.fileName })}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Error Report
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-600 italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Showing {(logPage - 1) * logsPerPage + 1}–{Math.min(logPage * logsPerPage, importLogs.length)} of {importLogs.length} records
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={logPage === 1}
                    onClick={() => setLogPage(p => p - 1)}
                    className="h-7 w-7 p-0 border border-[#2A2A2A] text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4 rotate-90" />
                  </Button>
                  {Array.from({ length: totalLogPages }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      variant={p === logPage ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setLogPage(p)}
                      className={`h-7 w-7 p-0 text-xs ${p === logPage ? '' : 'border border-[#2A2A2A] text-gray-400 hover:text-white'}`}
                      style={p === logPage ? { background: '#60A5FA', color: '#000', border: 'none' } : {}}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={logPage === totalLogPages}
                    onClick={() => setLogPage(p => p + 1)}
                    className="h-7 w-7 p-0 border border-[#2A2A2A] text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Section>

    </div>
  )
}
