'use client'

import * as React from 'react'
import {
  FileText, Plus, Eye, Trash2, Edit, Download, ChevronDown,
  Mail, Layers, Search, X, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  ImageIcon, Type, Upload, FileSignature, Minus, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'
import { FileUpload } from '@/components/file-upload'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HRLetter {
  id: string
  employeeId: string | null
  type: string
  title: string
  content: string | null
  status: string
  issuedAt: string | null
  responseAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  employee?: {
    firstName: string
    lastName: string
    employeeCode: string
    department: string
    designation: string
    joiningDate: string
    email?: string
  }
  template?: {
    id: string
    name: string
    type: string
  }
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
  department?: string
  designation?: string
  joiningDate?: string
  email?: string
  panNumber?: string
  salary?: number
}

interface CompanySettings {
  companyName: string
  companyAddress: string
  companyLogo?: string
  hrSignatoryName?: string
  hrSignatoryTitle?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LETTER_TYPES = [
  { value: 'OFFER',         label: 'Offer Letter',       color: '#8B5CF6' },
  { value: 'APPOINTMENT',    label: 'Appointment Letter',  color: '#3B82F6' },
  { value: 'EXPERIENCE',     label: 'Experience Letter',   color: '#06B6D4' },
  { value: 'RELIEVING',      label: 'Relieving Letter',   color: '#EF4444' },
  { value: 'INCREMENT',      label: 'Increment Letter',   color: '#22C55E' },
  { value: 'WARNING',        label: 'Warning Letter',     color: '#F59E0B' },
  { value: 'CONFIRMATION',    label: 'Confirmation Letter',color: '#84CC16' },
  { value: 'TERMINATION',    label: 'Termination Letter',  color: '#EC4899' },
  { value: 'CUSTOM',        label: 'Custom',             color: '#9CA3AF' },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6B7280',
  ISSUED: '#8B5CF6',
  ACCEPTED: '#22C55E',
  REJECTED: '#EF4444',
  REVOKED: '#F59E0B',
}

const MERGE_FIELDS = [
  { label: 'Employee Full Name',    value: '{{employee_name}}',       group: 'Employee' },
  { label: 'Employee First Name',  value: '{{employee_first_name}}',  group: 'Employee' },
  { label: 'Employee Last Name',   value: '{{employee_last_name}}',   group: 'Employee' },
  { label: 'Employee Code',        value: '{{employee_code}}',        group: 'Employee' },
  { label: 'Department',           value: '{{department}}',          group: 'Employee' },
  { label: 'Designation',         value: '{{designation}}',         group: 'Employee' },
  { label: 'Joining Date',        value: '{{joining_date}}',        group: 'Employee' },
  { label: 'Email',               value: '{{email}}',               group: 'Employee' },
  { label: 'PAN Number',          value: '{{pan_number}}',          group: 'Employee' },
  { label: 'Company Name',        value: '{{company_name}}',        group: 'Company' },
  { label: 'Company Address',    value: '{{company_address}}',    group: 'Company' },
  { label: 'Current Date',       value: '{{current_date}}',       group: 'Date' },
  { label: 'Current Year',       value: '{{current_year}}',       group: 'Date' },
  { label: 'HR Signatory Name',  value: '{{hr_signatory_name}}',   group: 'Company' },
  { label: 'HR Signatory Title', value: '{{hr_signatory_title}}', group: 'Company' },
]

const TABS_ALL = ['all', ...LETTER_TYPES.map((t) => t.value)]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderMergeFields(
  content: string,
  employee: Employee | null,
  company: CompanySettings
): string {
  if (!content) return ''
  const today = new Date()
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmtJoining = (d?: string) =>
    d ? fmtDate(new Date(d)) : '{{joining_date}}'

  return content
    .replace(/\{\{employee_name\}\}/gi, employee ? `${employee.firstName} ${employee.lastName}` : '{{employee_name}}')
    .replace(/\{\{employee_first_name\}\}/gi, employee?.firstName || '{{employee_first_name}}')
    .replace(/\{\{employee_last_name\}\}/gi, employee?.lastName || '{{employee_last_name}}')
    .replace(/\{\{employee_code\}\}/gi, employee?.employeeCode || '{{employee_code}}')
    .replace(/\{\{department\}\}/gi, employee?.department || '{{department}}')
    .replace(/\{\{designation\}\}/gi, employee?.designation || '{{designation}}')
    .replace(/\{\{joining_date\}\}/gi, fmtJoining(employee?.joiningDate))
    .replace(/\{\{email\}\}/gi, employee?.email || '{{email}}')
    .replace(/\{\{pan_number\}\}/gi, employee?.panNumber || '{{pan_number}}')
    .replace(/\{\{company_name\}\}/gi, company.companyName || '{{company_name}}')
    .replace(/\{\{company_address\}\}/gi, company.companyAddress || '{{company_address}}')
    .replace(/\{\{current_date\}\}/gi, fmtDate(today))
    .replace(/\{\{current_year\}\}/gi, String(today.getFullYear()))
    .replace(/\{\{hr_signatory_name\}\}/gi, company.hrSignatoryName || '{{hr_signatory_name}}')
    .replace(/\{\{hr_signatory_title\}\}/gi, company.hrSignatoryTitle || '{{hr_signatory_title}}')
}

function getLetterTypeMeta(type: string) {
  return LETTER_TYPES.find((t) => t.value === type) || { label: type, color: '#9CA3AF' }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MergeFieldChip({
  field,
  onInsert,
}: {
  field: (typeof MERGE_FIELDS)[0]
  onInsert: (v: string) => void
}) {
  return (
    <button
      onClick={() => onInsert(field.value)}
      className="flex items-center justify-between w-full px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors text-left group"
    >
      <span className="text-xs text-gray-300 group-hover:text-white">{field.label}</span>
      <span className="text-xs font-mono ml-2" style={{ color: '#A78BFA' }}>
        {field.value.replace(/\{\{|\}\}/g, '')}
      </span>
    </button>
  )
}

function MergeFieldPicker({
  onInsert,
  onClose,
}: {
  onInsert: (v: string) => void
  onClose: () => void
}) {
  const groups = MERGE_FIELDS.reduce<Record<string, typeof MERGE_FIELDS>>((acc, f) => {
    if (!acc[f.group]) acc[f.group] = []
    acc[f.group].push(f)
    return acc
  }, {})

  return (
    <div
      className="absolute left-0 top-full mt-1 rounded-xl border shadow-2xl z-50 w-72 overflow-hidden"
      style={{ background: '#1A1A1A', borderColor: '#3D3D3D' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#2D2D2D' }}>
        <span className="text-xs font-semibold text-gray-400">Insert Merge Field</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {Object.entries(groups).map(([group, fields]) => (
          <div key={group}>
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">
              {group}
            </p>
            {fields.map((f) => (
              <MergeFieldChip key={f.value} field={f} onInsert={onInsert} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLettersPage() {
  const { toast } = useToast()

  // ── State ─────────────────────────────────────────────────────────────────
  const [letters, setLetters] = React.useState<HRLetter[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [companySettings, setCompanySettings] = React.useState<CompanySettings>({
    companyName: 'Company',
    companyAddress: '',
  })
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState('all')
  const [search, setSearch] = React.useState('')

  // Generate section
  const [genEmployeeId, setGenEmployeeId] = React.useState('')
  const [genType, setGenType] = React.useState('')
  const [genTitle, setGenTitle] = React.useState('')
  const [genContent, setGenContent] = React.useState('')
  const [genLogo, setGenLogo] = React.useState<string | null>(null)
  const [genHeader, setGenHeader] = React.useState('')
  const [genFooter, setGenFooter] = React.useState('')

  // Template designer
  const [designerOpen, setDesignerOpen] = React.useState(false)
  const [designerField, setDesignerField] = React.useState('{{current_date}}')
  const [showFieldPicker, setShowFieldPicker] = React.useState(false)

  // Dialogs
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [selectedLetter, setSelectedLetter] = React.useState<HRLetter | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchLetters = React.useCallback(async () => {
    try {
      const res = await fetch('/api/letters')
      const data = await res.json()
      if (data.success) setLetters(data.data)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load letters', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchEmployees = React.useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=1000')
      const data = await res.json()
      if (data.success) setEmployees(data.data)
    } catch (_e) { /* silent */ }
  }, [])

  const fetchCompanySettings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/settings/company')
      const data = await res.json()
      if (data.success) setCompanySettings(data.data || {})
    } catch (_e) { /* silent */ }
  }, [])

  React.useEffect(() => { fetchLetters() }, [fetchLetters])
  React.useEffect(() => { fetchEmployees() }, [fetchEmployees])
  React.useEffect(() => { fetchCompanySettings() }, [fetchCompanySettings])

  // ── Derived ───────────────────────────────────────────────────────────────
  const genEmployee = React.useMemo(
    () => employees.find((e) => e.id === genEmployeeId) || null,
    [employees, genEmployeeId]
  )

  const filteredLetters = React.useMemo(() => {
    let result = letters
    if (activeTab !== 'all') result = result.filter((l) => l.type === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.employee?.firstName?.toLowerCase().includes(q) ||
          l.employee?.lastName?.toLowerCase().includes(q) ||
          l.employee?.employeeCode?.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q)
      )
    }
    return result
  }, [letters, activeTab, search])

  const stats = React.useMemo(() => {
    const s: Record<string, number> = { total: letters.length }
    LETTER_TYPES.forEach((t) => {
      s[t.value] = letters.filter((l) => l.type === t.value).length
    })
    return s
  }, [letters])

  const renderedPreview = React.useMemo(
    () => renderMergeFields(genContent || '', genEmployee, companySettings),
    [genContent, genEmployee, companySettings]
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  const insertField = (field: string) => {
    setGenContent((prev) => prev + field)
    setShowFieldPicker(false)
  }

  const handleGenChange = (type: string) => {
    setGenType(type)
    if (type && !genTitle) {
      const meta = getLetterTypeMeta(type)
      setGenTitle(`${meta.label} – ${genEmployee ? `${genEmployee.firstName} ${genEmployee.lastName}` : ''}`)
    }
    const defaultContent = getDefaultContent(type, companySettings.companyName)
    setGenContent(defaultContent)
  }

  const openDesigner = () => {
    setGenEmployeeId('')
    setGenType('')
    setGenTitle('')
    setGenContent('')
    setGenLogo(null)
    setGenHeader('')
    setGenFooter('')
    setDesignerOpen(true)
  }

  const handleGenerate = async () => {
    if (!genType) {
      toast({ title: 'Error', description: 'Please select a letter type', variant: 'destructive' })
      return
    }
    if (!genTitle.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' })
      return
    }
    if (!genEmployeeId) {
      toast({ title: 'Error', description: 'Please select an employee', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: genEmployeeId,
          type: genType,
          title: genTitle,
          content: genContent,
          status: 'DRAFT',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Letter generated successfully' })
        setPreviewDialogOpen(true)
        setSelectedLetter(data.data)
        fetchLetters()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to generate letter', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/letters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: `Letter ${status.toLowerCase()}` })
        fetchLetters()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this letter?')) return
    try {
      const res = await fetch(`/api/letters/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Letter deleted' })
        fetchLetters()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  const openView = (letter: HRLetter) => { setSelectedLetter(letter); setViewDialogOpen(true) }
  const openPreview = (letter: HRLetter) => {
    setGenEmployeeId(letter.employeeId || '')
    setGenType(letter.type)
    setGenTitle(letter.title)
    setGenContent(letter.content || '')
    setSelectedLetter(letter)
    setPreviewDialogOpen(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">HR Letters</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Manage letter templates and generate HR letters for employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={openDesigner}
            className="gap-2"
            style={{ background: '#1A1A1A', borderColor: '#3D3D3D', color: '#A78BFA' }}
            variant="outline"
          >
            <Layers className="h-4 w-4" />
            Template Designer
          </Button>
          <Button
            onClick={() => setDesignerOpen(true)}
            className="gap-2 text-white"
            style={{ background: '#8B5CF6' }}
          >
            <FileText className="h-4 w-4" />
            Generate Letter
          </Button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2">
        {LETTER_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(activeTab === t.value ? 'all' : t.value)}
            className="rounded-xl p-3 border text-left transition-all hover:scale-[1.02] cursor-pointer"
            style={{
              background: activeTab === t.value ? `${t.color}18` : '#1A1A1A',
              borderColor: activeTab === t.value ? t.color : '#2D2D2D',
            }}
          >
            <p className="text-xs font-medium truncate" style={{ color: activeTab === t.value ? t.color : '#6B7280' }}>
              {t.label}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ color: activeTab === t.value ? '#fff' : '#374151' }}>
              {stats[t.value] || 0}
            </p>
          </button>
        ))}
      </div>

      {/* ── Search + Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('all')}
            className="h-8 text-xs"
            style={
              activeTab === 'all'
                ? { background: '#8B5CF6', color: '#fff' }
                : { color: '#9CA3AF', background: 'transparent' }
            }
          >
            All ({stats.total})
          </Button>
          {LETTER_TYPES.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={activeTab === t.value ? 'default' : 'ghost'}
              onClick={() => setActiveTab(t.value)}
              className="h-8 text-xs"
              style={
                activeTab === t.value
                  ? { background: t.color, color: '#fff' }
                  : { color: '#6B7280', background: 'transparent' }
              }
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search letters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#fff' }}
          />
        </div>
      </div>

      {/* ── Letters Table ───────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredLetters.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: '#6B7280' }} />
            <p className="text-gray-400 font-medium">No letters found</p>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {search ? 'Try a different search term' : 'Create your first letter using the button above'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                {['Employee', 'Type', 'Title', 'Status', 'Date', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#6B7280' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLetters.map((letter, i) => {
                const typeMeta = getLetterTypeMeta(letter.type)
                return (
                  <tr
                    key={letter.id}
                    className="border-b last:border-0 transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: '#2D2D2D', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.005)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">
                        {letter.employee
                          ? `${letter.employee.firstName} ${letter.employee.lastName}`
                          : <span className="text-gray-500 italic">Template</span>}
                      </p>
                      {letter.employee && (
                        <p className="text-xs text-gray-500">{letter.employee.employeeCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className="text-white text-xs font-medium"
                        style={{ background: `${typeMeta.color}22`, color: typeMeta.color, border: `1px solid ${typeMeta.color}44` }}
                      >
                        {typeMeta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200 max-w-[200px] truncate">{letter.title}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className="text-white text-xs"
                        style={{ background: STATUS_COLORS[letter.status] || '#6B7280' }}
                      >
                        {letter.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(letter.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => openView(letter)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => openPreview(letter)}
                          title="Preview with Data"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        {letter.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-400 hover:bg-green-400/10"
                            onClick={() => handleStatusChange(letter.id, 'ISSUED')}
                          >
                            Issue
                          </Button>
                        )}
                        {letter.status === 'ISSUED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-yellow-400 hover:bg-yellow-400/10"
                            onClick={() => handleStatusChange(letter.id, 'REVOKED')}
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-400"
                          onClick={() => handleDelete(letter.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Generate Letter / Template Designer Dialog ─────────────────── */}
      <Dialog open={designerOpen} onOpenChange={setDesignerOpen}>
        <DialogContent className="border-white/10 max-w-4xl" style={{ background: '#1A1A1A', maxHeight: '92vh', overflowY: 'auto' }}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-white text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5" style={{ color: '#A78BFA' }} />
                  Letter Template Designer
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  Design a reusable letter template with dynamic merge fields, then assign it to employees.
                </DialogDescription>
              </div>
              <button
                onClick={() => setDesignerOpen(false)}
                className="text-gray-500 hover:text-white mt-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 py-2">

            {/* Left: Form */}
            <div className="space-y-4">

              {/* Employee Selection */}
              <div>
                <Label className="text-gray-300 text-sm font-medium">
                  Assign to Employee <span className="text-gray-600 text-xs">(optional)</span>
                </Label>
                <select
                  value={genEmployeeId}
                  onChange={(e) => setGenEmployeeId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg text-sm border"
                  style={{ background: '#262626', color: '#fff', borderColor: '#2D2D2D' }}
                >
                  <option value="">— Select Employee —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
                {genEmployeeId && (
                  <div className="mt-2 rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['Code', genEmployee?.employeeCode],
                        ['Department', genEmployee?.department],
                        ['Designation', genEmployee?.designation],
                        ['Joining', genEmployee?.joiningDate ? formatDate(genEmployee.joiningDate) : '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500">{k}: </span>
                          <span className="text-gray-200">{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Type + Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-sm font-medium">Letter Type</Label>
                  <select
                    value={genType}
                    onChange={(e) => handleGenChange(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg text-sm border"
                    style={{ background: '#262626', color: '#fff', borderColor: '#2D2D2D' }}
                  >
                    <option value="">Select type</option>
                    {LETTER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm font-medium">Title</Label>
                  <Input
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="e.g., Offer Letter – John Doe"
                    className="mt-1 h-10 text-sm"
                    style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Header Text */}
              <div>
                <Label className="text-gray-300 text-sm font-medium">Header Text <span className="text-gray-600 text-xs">(optional)</span></Label>
                <Input
                  value={genHeader}
                  onChange={(e) => setGenHeader(e.target.value)}
                  placeholder="e.g., CONFIDENTIAL"
                  className="mt-1 h-9 text-sm"
                  style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff' }}
                />
              </div>

              {/* Rich Editor Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-gray-300 text-sm font-medium">Letter Content</Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFieldPicker(!showFieldPicker)}
                      className="h-7 text-xs gap-1"
                      style={{ background: '#262626', borderColor: '#3D3D3D', color: '#A78BFA' }}
                    >
                      <Type className="h-3 w-3" />
                      Insert Field
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </Button>
                    {showFieldPicker && (
                      <MergeFieldPicker
                        onInsert={insertField}
                        onClose={() => setShowFieldPicker(false)}
                      />
                    )}
                  </div>
                </div>
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: '#2D2D2D' }}
                >
                  {/* Toolbar */}
                  <div
                    className="flex items-center gap-0.5 px-2 py-1.5 border-b flex-wrap"
                    style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}
                  >
                    {[
                      { icon: Bold, title: 'Bold', action: () => setGenContent((p) => `**${p}**`) },
                      { icon: Italic, title: 'Italic', action: () => setGenContent((p) => `_${p}_`) },
                      { icon: Underline, title: 'Underline', action: () => setGenContent((p) => `__${p}__`) },
                      { icon: Minus, title: 'Divider', action: () => setGenContent((p) => `${p}\n\n---\n\n`) },
                    ].map(({ icon: Icon, title, action }, i) => (
                      <button
                        key={i}
                        onClick={action}
                        title={title}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                    <div className="w-px h-4 mx-1" style={{ background: '#2D2D2D' }} />
                    {[
                      { icon: AlignLeft, title: 'Align Left' },
                      { icon: AlignCenter, title: 'Align Center' },
                      { icon: AlignRight, title: 'Align Right' },
                    ].map(({ icon: Icon, title }) => (
                      <button
                        key={title}
                        onClick={() => toast({ title: 'Hint', description: 'Content alignment is set via the textarea. Use HTML in future.' })}
                        title={title}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                    <div className="w-px h-4 mx-1" style={{ background: '#2D2D2D' }} />
                    {[
                      { icon: List, title: 'Bullet List', action: () => setGenContent((p) => `${p}\n- `) },
                      { icon: ListOrdered, title: 'Numbered List', action: () => setGenContent((p) => `${p}\n1. `) },
                    ].map(({ icon: Icon, title, action }) => (
                      <button
                        key={title}
                        onClick={action}
                        title={title}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={genContent}
                    onChange={(e) => setGenContent(e.target.value)}
                    placeholder={`Dear {{employee_name}},

We are pleased to offer you the position of {{designation}} in our ${companySettings.companyName || 'Company'}...

[Write your letter content here. Use the "Insert Field" button above to add dynamic fields like {{employee_name}}, {{department}}, {{joining_date}}, etc.]

Best regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
{{company_name}}`}
                    className="border-0 rounded-none text-sm leading-relaxed min-h-[260px]"
                    style={{ background: '#1A1A1A', color: '#E5E7EB', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Footer Text */}
              <div>
                <Label className="text-gray-300 text-sm font-medium">Footer Text <span className="text-gray-600 text-xs">(optional)</span></Label>
                <Input
                  value={genFooter}
                  onChange={(e) => setGenFooter(e.target.value)}
                  placeholder="e.g., This is a system-generated letter."
                  className="mt-1 h-9 text-sm"
                  style={{ background: '#262626', borderColor: '#2D2D2D', color: '#fff' }}
                />
              </div>

              {/* Available Fields */}
              <div className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Available Merge Fields</p>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => insertField(f.value)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono transition-colors hover:opacity-80"
                      style={{ background: '#262626', color: '#A78BFA', border: '1px solid #3D3D3D' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Live Preview</p>
                {genEmployeeId && (
                  <Badge className="text-xs" style={{ background: '#22C55E22', color: '#22C55E' }}>
                    Employee Data Applied
                  </Badge>
                )}
              </div>
              <div
                className="rounded-xl p-6 border text-sm leading-relaxed overflow-auto"
                style={{
                  background: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  color: '#111827',
                  minHeight: '480px',
                  maxHeight: '560px',
                }}
              >
                {/* Letterhead */}
                {genLogo && (
                  <div className="mb-4 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={genLogo} alt="Company Logo" className="h-14 object-contain" />
                  </div>
                )}
                <div className="text-center mb-4 pb-3 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <h2 className="text-base font-bold" style={{ color: '#111827' }}>
                    {companySettings.companyName || '{{company_name}}'}
                  </h2>
                  {companySettings.companyAddress && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {companySettings.companyAddress}
                    </p>
                  )}
                </div>
                {genHeader && (
                  <p className="text-center text-xs font-bold tracking-widest mb-4" style={{ color: '#374151' }}>
                    {genHeader}
                  </p>
                )}
                <div className="text-right text-xs mb-4" style={{ color: '#6B7280' }}>
                  Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {/* Body */}
                <div className="whitespace-pre-wrap text-sm" style={{ color: '#374151' }}>
                  {renderedPreview || (
                    <span className="italic" style={{ color: '#9CA3AF' }}>
                      Your letter content will appear here with employee data filled in.
                    </span>
                  )}
                </div>
                {/* Signature */}
                <div className="mt-8 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                        {companySettings.hrSignatoryName || '{{hr_signatory_name}}'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {companySettings.hrSignatoryTitle || '{{hr_signatory_title}}'}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{companySettings.companyName}</p>
                    </div>
                    <FileSignature className="h-8 w-8 opacity-30" style={{ color: '#374151' }} />
                  </div>
                </div>
                {/* Footer */}
                {genFooter && (
                  <p className="mt-4 text-center text-xs italic" style={{ color: '#9CA3AF' }}>
                    {genFooter}
                  </p>
                )}
              </div>
              <p className="text-xs text-center text-gray-600">
                This is a preview. Fields like <code className="px-1 rounded" style={{ background: '#262626' }}>{'{{employee_name}}'}</code> are replaced with real employee data when assigned.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setDesignerOpen(false)}
              className="text-gray-300"
              style={{ background: 'transparent', borderColor: '#2D2D2D' }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setGenContent('')
                setGenTitle('')
              }}
              className="text-gray-400"
              style={{ background: 'transparent', borderColor: '#2D2D2D' }}
            >
              Clear Content
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={submitting || !genType || !genTitle.trim()}
              className="text-white gap-2"
              style={{ background: '#8B5CF6' }}
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Letter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ───────────────────────────────────────────────── */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="border-white/10 max-w-3xl" style={{ background: '#1A1A1A', maxHeight: '92vh' }}>
          {selectedLetter && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5" style={{ color: '#A78BFA' }} />
                      Letter Preview
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">
                      {selectedLetter.title}
                      {selectedLetter.employee
                        ? ` — ${selectedLetter.employee.firstName} ${selectedLetter.employee.lastName} (${selectedLetter.employee.employeeCode})`
                        : ''}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="text-white text-xs" style={{ background: getLetterTypeMeta(selectedLetter.type).color }}>
                      {getLetterTypeMeta(selectedLetter.type).label}
                    </Badge>
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedLetter.status] }}>
                      {selectedLetter.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              {/* Print-ready letter */}
              <div
                className="rounded-xl p-8 mt-2 overflow-auto"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  color: '#111827',
                  minHeight: '400px',
                  maxHeight: '60vh',
                }}
              >
                {/* Company Letterhead */}
                <div className="text-center mb-6 pb-4 border-b" style={{ borderColor: '#D1D5DB' }}>
                  {companySettings.companyLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companySettings.companyLogo}
                      alt="Company Logo"
                      className="h-14 object-contain mx-auto mb-3"
                    />
                  )}
                  <h2 className="text-lg font-bold text-gray-900">{companySettings.companyName || 'Company Name'}</h2>
                  {companySettings.companyAddress && (
                    <p className="text-xs mt-0.5 text-gray-500">{companySettings.companyAddress}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex justify-between items-start mb-6 text-sm text-gray-600">
                  <div>
                    {selectedLetter.employee && (
                      <>
                        <p className="font-medium text-gray-900">
                          {selectedLetter.employee.firstName} {selectedLetter.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{selectedLetter.employee.employeeCode}</p>
                        <p className="text-xs text-gray-500">{selectedLetter.employee.department}</p>
                      </>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="mt-0.5">Ref: HR/{selectedLetter.type}/{new Date().getFullYear()}/{selectedLetter.id.slice(-4).toUpperCase()}</p>
                  </div>
                </div>

                {/* Subject */}
                <p className="font-semibold text-gray-900 mb-4">
                  Subject: {selectedLetter.title}
                </p>

                {/* Body */}
                <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {renderMergeFields(
                    selectedLetter.content || 'No content available.',
                    selectedLetter.employee as Employee || null,
                    companySettings
                  )}
                </div>

                {/* Signature */}
                <div className="mt-10 pt-4 border-t" style={{ borderColor: '#D1D5DB' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {companySettings.hrSignatoryName || 'HR Department'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {companySettings.hrSignatoryTitle || 'Human Resources'}
                      </p>
                      <p className="text-xs text-gray-500">{companySettings.companyName}</p>
                    </div>
                    <FileSignature className="h-10 w-10 text-gray-300" />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 flex-wrap mt-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialogOpen(false)}
                  className="text-gray-300"
                  style={{ background: 'transparent', borderColor: '#2D2D2D' }}
                >
                  Close
                </Button>
                {selectedLetter.status === 'DRAFT' && (
                  <Button
                    onClick={() => {
                      handleStatusChange(selectedLetter.id, 'ISSUED')
                      setPreviewDialogOpen(false)
                    }}
                    className="text-white gap-2"
                    style={{ background: '#22C55E' }}
                  >
                    <Mail className="h-4 w-4" />
                    Issue Letter
                  </Button>
                )}
                <Button
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="text-white gap-2"
                  style={{ background: '#8B5CF6' }}
                >
                  <Download className="h-4 w-4" />
                  Download / Print PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ───────────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-white/10 max-w-2xl" style={{ background: '#1A1A1A' }}>
          {selectedLetter && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <DialogTitle className="text-white">{selectedLetter.title}</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">
                      {selectedLetter.employee
                        ? `${selectedLetter.employee.firstName} ${selectedLetter.employee.lastName} — ${selectedLetter.employee.employeeCode}`
                        : 'Template (no employee assigned)'}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-white text-xs" style={{ background: getLetterTypeMeta(selectedLetter.type).color }}>
                      {getLetterTypeMeta(selectedLetter.type).label}
                    </Badge>
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedLetter.status] }}>
                      {selectedLetter.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Created', formatDate(selectedLetter.createdAt)],
                    ['Issued', selectedLetter.issuedAt ? formatDate(selectedLetter.issuedAt) : '—'],
                    ['Responded', selectedLetter.responseAt ? formatDate(selectedLetter.responseAt) : '—'],
                    ['Type', selectedLetter.type],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg p-3 border" style={{ background: '#0F0F0F', borderColor: '#2D2D2D' }}>
                      <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                      <p className="text-sm text-white">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Content</p>
                  <div
                    className="rounded-lg p-4 border text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto"
                    style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}
                  >
                    {selectedLetter.content || <span className="italic text-gray-500">No content provided.</span>}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 flex-wrap mt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                  className="text-gray-300"
                  style={{ background: 'transparent', borderColor: '#2D2D2D' }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => openPreview(selectedLetter)}
                  className="text-white gap-2"
                  style={{ background: '#8B5CF6' }}
                >
                  <BookOpen className="h-4 w-4" />
                  Preview
                </Button>
                {selectedLetter.status === 'DRAFT' && (
                  <Button
                    onClick={() => {
                      handleStatusChange(selectedLetter.id, 'ISSUED')
                      setViewDialogOpen(false)
                    }}
                    className="text-white gap-2"
                    style={{ background: '#22C55E' }}
                  >
                    <Mail className="h-4 w-4" />
                    Issue
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Default content templates ────────────────────────────────────────────────

function getDefaultContent(type: string, companyName: string): string {
  const templates: Record<string, string> = {
    OFFER: `Dear {{employee_name}},

We are pleased to offer you the position of {{designation}} in our ${companyName || 'Company'}, based in our {{department}} department.

Your compensation, benefits, and other terms of employment will be communicated in a separate letter along with this offer.

Please confirm your acceptance by signing and returning a copy of this letter.

We look forward to welcoming you to the team.

Warm regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    APPOINTMENT: `Dear {{employee_name}},

We are pleased to confirm your appointment as {{designation}} in our ${companyName || 'Company'}, {{department}} department, effective {{joining_date}}.

Your appointment is subject to the terms and conditions outlined in your employment contract.

Please report to {{department}} on your start date.

Best regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    EXPERIENCE: `Dear {{employee_name}},

This letter is to confirm that {{employee_name}} (Employee Code: {{employee_code}}) was employed with ${companyName || 'Company'} from {{joining_date}} to {{current_date}} as {{designation}} in the {{department}} department.

During their tenure, {{employee_first_name}} demonstrated professionalism and dedication in their role.

We wish {{employee_first_name}} all the best in their future endeavors.

Sincerely,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    RELIEVING: `Dear {{employee_name}},

This is to confirm that your employment with ${companyName || 'Company'} has been accepted and you will be relieved from your position as {{designation}} in the {{department}} department on {{current_date}}.

All dues have been settled and company assets have been returned.

We thank you for your contributions and wish you success in your future endeavors.

Warm regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    INCREMENT: `Dear {{employee_name}},

We are pleased to inform you that, effective {{current_date}}, your annual compensation has been revised as part of our periodic review process.

Your updated compensation reflects your contributions and performance in your role as {{designation}}.

Please find the updated compensation details in the attached annexure.

Congratulations on this recognition.

Best regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    WARNING: `Dear {{employee_name}},

This letter serves as a formal warning regarding your recent conduct/performance as {{designation}} in the {{department}} department.

It has been observed that your actions/performance have not met the expected standards of ${companyName || 'Company'}.

You are required to improve your conduct/performance within 30 days of receiving this letter. Failure to do so may result in further disciplinary action, up to and including termination.

Please acknowledge receipt of this letter.

Regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    CONFIRMATION: `Dear {{employee_name}},

We are pleased to inform you that, following a satisfactory review of your performance during the probation period, your employment with ${companyName || 'Company'} has been confirmed as {{designation}} in the {{department}} department, effective {{current_date}}.

Your terms and conditions of employment remain as per your appointment letter.

Congratulations on your confirmation.

Best regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    TERMINATION: `Dear {{employee_name}},

This letter is to inform you that your employment with ${companyName || 'Company'} is hereby terminated, effective {{current_date}}.

The decision has been made after careful consideration and is in accordance with company policy and applicable labor laws.

Please return all company property and settle your final dues with the HR department.

We wish you well in your future endeavors.

Regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,

    CUSTOM: `Dear {{employee_name}},

[Write your letter content here. Use the "Insert Field" button to add dynamic fields like {{employee_name}}, {{department}}, {{designation}}, {{current_date}}, etc.]

Best regards,
{{hr_signatory_name}}
{{hr_signatory_title}}
${companyName || 'Company'}`,
  }
  return templates[type] || templates.CUSTOM
}
