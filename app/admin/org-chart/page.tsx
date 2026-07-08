'use client'

import * as React from 'react'
import {
  GitBranch,
  Users,
  ChevronDown,
  ChevronRight,
  Building2,
  Loader2,
  Mail,
  Phone,
  User,
  Pencil,
  X,
  Check,
  AlertCircle,
  UserCircle,
  ArrowUpFromLine,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgChartEmployee {
  id: string
  name: string
  designation: string
  department: string
  managerId: string | null
  managerName: string | null
  profileImage: string | null
  email: string
  employeeCode: string
  phone: string | null
}

interface OrgChartNode extends OrgChartEmployee {
  children: OrgChartNode[]
  directReports: number
}

interface OrgChartData {
  tree: OrgChartNode[]
  flat: OrgChartEmployee[]
  departments: string[]
  totalEmployees: number
}

// ─── Theme constants ──────────────────────────────────────────────────────────

const BG = '#1A1A1A'
const BORDER = '#2D2D2D'
const ACCENT = '#8B5CF6'
const ACCENT_MILD = '#8B5CF620'
const ACCENT_TEXT = '#A78BFA'

const departmentColors: Record<string, string> = {
  Engineering: '#3B82F6',
  Product: '#8B5CF6',
  Design: '#EC4899',
  Marketing: '#F59E0B',
  Sales: '#10B981',
  HR: '#EF4444',
  Finance: '#6366F1',
  Operations: '#14B8A6',
  Support: '#F97316',
  Legal: '#64748B',
  IT: '#0EA5E9',
}

function getDeptColor(dept: string): string {
  return departmentColors[dept] ?? ACCENT
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ─── Loading / Empty states ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-64 rounded-lg animate-pulse" style={{ background: BORDER }} />
      <div className="flex gap-3 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-32 rounded-lg animate-pulse" style={{ background: BORDER }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: BORDER }} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center px-4"
      style={{ borderColor: BORDER, background: BG }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: ACCENT_MILD }}
      >
        <GitBranch className="w-8 h-8" style={{ color: ACCENT }} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No Employees Found</h2>
      <p className="text-sm text-gray-400 max-w-sm">
        Add employees to your organization to see the hierarchy here.
      </p>
    </div>
  )
}

// ─── Employee Card ────────────────────────────────────────────────────────────

interface EmployeeCardProps {
  employee: OrgChartNode | OrgChartEmployee
  onClick: (emp: OrgChartEmployee) => void
  isCompact?: boolean
}

function EmployeeCard({ employee, onClick, isCompact = false }: EmployeeCardProps) {
  const deptColor = getDeptColor(employee.department)
  const isNode = 'children' in employee
  const reports = isNode ? (employee as OrgChartNode).directReports : 0

  if (isCompact) {
    return (
      <button
        onClick={() => onClick(employee)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 hover:border-gray-500 text-left cursor-pointer"
        style={{ background: BG, borderColor: BORDER }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
          style={{ background: deptColor }}
        >
          {employee.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.profileImage}
              alt={employee.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(employee.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{employee.name}</p>
          <p className="text-xs text-gray-400 truncate">{employee.designation}</p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(employee)}
      className="w-full text-left rounded-xl border p-4 transition-all duration-150 hover:scale-[1.01] hover:border-gray-600 cursor-pointer group"
      style={{ background: BG, borderColor: BORDER }}
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0"
          style={{ background: deptColor }}
        >
          {employee.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.profileImage}
              alt={employee.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(employee.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{employee.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{employee.designation}</p>
          <span
            className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${deptColor}25`, color: deptColor }}
          >
            {employee.department}
          </span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Mail className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <p className="text-xs text-gray-400 truncate">{employee.email}</p>
        </div>
        {employee.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-400">{employee.phone}</p>
          </div>
        )}
        {employee.managerName && (
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-400 truncate">
              Reports to <span className="text-gray-300">{employee.managerName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer: direct reports count */}
      {reports > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-xs text-gray-500">
            {reports} direct report{reports !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </button>
  )
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface OrgTreeNodeProps {
  node: OrgChartNode
  onSelectEmployee: (emp: OrgChartEmployee) => void
  filterDept: string | null
}

function OrgTreeNode({ node, onSelectEmployee, filterDept }: OrgTreeNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const hasChildren = node.children.length > 0
  const deptColor = getDeptColor(node.department)

  // Recurse only visible children based on filter
  const visibleChildren = filterDept
    ? node.children.filter((c) => c.department === filterDept)
    : node.children

  return (
    <div>
      {/* Connector from parent */}
      <div className="relative">
        {/* Node card */}
        <button
          onClick={() => onSelectEmployee(node)}
          className="w-full text-left rounded-xl border p-4 transition-all duration-150 hover:border-gray-600 hover:scale-[1.01] cursor-pointer"
          style={{ background: BG, borderColor: BORDER }}
        >
          <div className="flex items-start gap-3">
            {/* Expand toggle */}
            <div className="flex-shrink-0 pt-1">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
              style={{ background: deptColor }}
            >
              {node.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={node.profileImage}
                  alt={node.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(node.name)
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white text-sm">{node.name}</h3>
                {node.directReports > 0 && (
                  <span className="text-xs text-gray-500">
                    ({node.directReports})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{node.designation}</p>
              <span
                className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${deptColor}25`, color: deptColor }}
              >
                {node.department}
              </span>
            </div>
          </div>

          {/* Bottom contact row */}
          <div className="mt-3 pl-8 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-400">{node.email}</span>
            </div>
            {node.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-400">{node.phone}</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && visibleChildren.length > 0 && (
        <div
          className="relative mt-2 ml-6 pl-6"
          style={{ borderLeft: `2px solid ${BORDER}` }}
        >
          {visibleChildren.map((child) => (
            <div key={child.id} className="relative mb-2">
              {/* Horizontal connector dot */}
              <div
                className="absolute left-0 top-5 w-3 h-3 rounded-full -translate-x-[calc(0.75rem+1px)]"
                style={{ background: BORDER }}
              />
              <OrgTreeNode
                node={child}
                onSelectEmployee={onSelectEmployee}
                filterDept={filterDept}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Employee Detail Side Panel ───────────────────────────────────────────────

interface DetailPanelProps {
  employee: OrgChartEmployee | null
  allEmployees: OrgChartEmployee[]
  onClose: () => void
  onUpdate: (updated: OrgChartEmployee) => void
}

function DetailPanel({ employee, allEmployees, onClose, onUpdate }: DetailPanelProps) {
  const { toast } = useToast()
  const [editingManager, setEditingManager] = React.useState(false)
  const [selectedManagerId, setSelectedManagerId] = React.useState<string>('')
  const [saving, setSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'details' | 'reports'>('details')

  React.useEffect(() => {
    if (employee) {
      setSelectedManagerId(employee.managerId ?? '')
      setEditingManager(false)
      setActiveTab('details')
    }
  }, [employee])

  if (!employee) return null

  const deptColor = getDeptColor(employee.department)

  // All possible managers (exclude self)
  const possibleManagers = allEmployees.filter((e) => e.id !== employee.id)

  // Group managers by department
  const managersByDept = possibleManagers.reduce<Record<string, OrgChartEmployee[]>>((acc, m) => {
    if (!acc[m.department]) acc[m.department] = []
    acc[m.department].push(m)
    return acc
  }, {})

  // Direct reports
  const directReports = allEmployees.filter((e) => e.managerId === employee.id)

  async function handleSaveManager() {
    if (!employee) return
    setSaving(true)
    try {
      const res = await fetch('/api/org-chart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          managerId: selectedManagerId || null,
        }),
      })
      const result = await res.json()

      if (result.success) {
        const newManager = selectedManagerId
          ? allEmployees.find((e) => e.id === selectedManagerId) ?? null
          : null
        onUpdate({
          ...employee,
          managerId: selectedManagerId || null,
          managerName: newManager?.name ?? null,
        })
        setEditingManager(false)
        toast({ title: 'Reporting manager updated', variant: 'default' })
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update manager', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 h-full w-full max-w-md overflow-y-auto p-6 shadow-2xl flex flex-col gap-6"
        style={{ background: BG, borderLeft: `1px solid ${BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: deptColor }}
            >
              {employee.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.profileImage}
                  alt={employee.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(employee.name)
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{employee.name}</h2>
              <p className="text-sm text-gray-400">{employee.designation}</p>
              <span
                className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${deptColor}25`, color: deptColor }}
              >
                {employee.department}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-lg p-1 gap-1"
          style={{ background: BORDER }}
        >
          {(['details', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors"
              style={
                activeTab === tab
                  ? { background: ACCENT, color: '#fff' }
                  : { color: '#9CA3AF' }
              }
            >
              {tab}
              {tab === 'reports' && directReports.length > 0 && (
                <span className="ml-1.5 text-xs opacity-75">({directReports.length})</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#222222', border: `1px solid ${BORDER}` }}>
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Work Email" value={employee.email} />
              <Separator style={{ background: BORDER }} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Work Phone" value={employee.phone ?? '—'} />
              <Separator style={{ background: BORDER }} />
              <InfoRow icon={<UserCircle className="w-4 h-4" />} label="Employee Code" value={employee.employeeCode} />
            </div>

            {/* Reporting Manager */}
            <div className="rounded-xl p-4" style={{ background: '#222222', border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">Reporting Manager</span>
                </div>
                {!editingManager && (
                  <button
                    onClick={() => setEditingManager(true)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-white/10"
                    style={{ color: ACCENT_TEXT }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              {editingManager ? (
                <div className="space-y-3">
                  <Select
                    value={selectedManagerId || '__none__'}
                    onValueChange={(val) => setSelectedManagerId(val === '__none__' ? '' : val)}
                  >
                    <SelectTrigger
                      className="w-full text-sm"
                      style={{ background: BG, borderColor: BORDER, color: 'white' }}
                    >
                      <SelectValue placeholder="Select a manager..." />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1E1E1E', borderColor: BORDER }}>
                      <SelectItem value="__none__" className="text-gray-400 focus:text-white">
                        No Manager (Top Level)
                      </SelectItem>
                      {Object.entries(managersByDept).map(([dept, emps]) => (
                        <SelectGroup key={dept}>
                          <SelectLabel style={{ color: getDeptColor(dept) }}>
                            {dept}
                          </SelectLabel>
                          {emps.map((m) => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              className="text-white focus:bg-white/10"
                            >
                              {m.name} — {m.designation}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveManager}
                      loading={saving}
                      style={{ background: ACCENT }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingManager(false)
                        setSelectedManagerId(employee.managerId ?? '')
                      }}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300">
                  {employee.managerName ? (
                    <span>{employee.managerName}</span>
                  ) : (
                    <span className="text-gray-500 italic">No manager assigned</span>
                  )}
                </p>
              )}
            </div>

            {/* Current manager preview in list */}
            {employee.managerName && (
              <div className="rounded-xl p-4" style={{ background: '#222222', border: `1px solid ${BORDER}` }}>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
                  Manager Details
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                    style={{ background: getDeptColor(allEmployees.find(e => e.id === employee.managerId)?.department ?? '') }}
                  >
                    {getInitials(employee.managerName)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{employee.managerName}</p>
                    <p className="text-xs text-gray-400">
                      {allEmployees.find((e) => e.id === employee.managerId)?.designation ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3">
            {directReports.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No direct reports</p>
              </div>
            ) : (
              directReports.map((report) => (
                <EmployeeCard
                  key={report.id}
                  employee={report}
                  onClick={(emp) => {
                    onUpdate(emp)
                  }}
                  isCompact
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { toast } = useToast()
  const [data, setData] = React.useState<OrgChartData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = React.useState<OrgChartEmployee | null>(null)
  const [filterDept, setFilterDept] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'tree' | 'grid'>('tree')

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/org-chart')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load')
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch (_e) {
      setError('Network error')
      toast({ title: 'Error', description: 'Failed to load org chart', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleUpdateEmployee(updated: OrgChartEmployee) {
    setSelectedEmployee(updated)
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        flat: prev.flat.map((e) => (e.id === updated.id ? updated : e)),
        tree: updateTreeNodes(prev.tree, updated),
      }
    })
  }

  function updateTreeNodes(
    nodes: OrgChartNode[],
    updated: OrgChartEmployee
  ): OrgChartNode[] {
    return nodes.map((node) => {
      if (node.id === updated.id) return { ...node, ...updated }
      return { ...node, children: updateTreeNodes(node.children, updated) }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Chart</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Company hierarchy and structure
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error || !data || data.flat.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Chart</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Company hierarchy and structure
          </p>
        </div>
        <EmptyState />
      </div>
    )
  }

  // Stats
  const managersWithReports = data.tree.filter((n) => n.directReports > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Chart</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            {data.totalEmployees} employee{data.totalEmployees !== 1 ? 's' : ''} across{' '}
            {data.departments.length} department{data.departments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* View toggle */}
        <div
          className="flex rounded-lg p-1 gap-1 flex-shrink-0"
          style={{ background: BG, border: `1px solid ${BORDER}` }}
        >
          {[
            { key: 'tree', icon: GitBranch, label: 'Tree' },
            { key: 'grid', icon: Users, label: 'Grid' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as 'tree' | 'grid')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={
                viewMode === key
                  ? { background: ACCENT, color: '#fff' }
                  : { color: '#9CA3AF' }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Employees', value: data.totalEmployees },
          { label: 'Departments', value: data.departments.length },
          { label: 'Managers', value: managersWithReports },
          { label: 'Leaf Nodes', value: data.totalEmployees - managersWithReports },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ background: BG, borderColor: BORDER }}
          >
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Department filter */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">
          Filter by Department
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterDept(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            style={
              filterDept === null
                ? { background: ACCENT, borderColor: ACCENT, color: '#fff' }
                : { background: BG, borderColor: BORDER, color: '#9CA3AF' }
            }
          >
            All Departments
          </button>
          {data.departments.map((dept) => {
            const color = getDeptColor(dept)
            const count = data.flat.filter((e) => e.department === dept).length
            return (
              <button
                key={dept}
                onClick={() => setFilterDept(filterDept === dept ? null : dept)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  filterDept === dept
                    ? { background: color, borderColor: color, color: '#fff' }
                    : { background: BG, borderColor: BORDER, color: '#9CA3AF' }
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: filterDept === dept ? '#fff' : color }}
                />
                {dept}
                <span
                  className="text-xs px-1 rounded"
                  style={{
                    background: filterDept === dept ? 'rgba(255,255,255,0.2)' : `${color}25`,
                    color: filterDept === dept ? '#fff' : color,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tree view */}
      {viewMode === 'tree' && (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="min-w-[600px] space-y-3">
            {data.tree.map((node) => (
              <OrgTreeNode
                key={node.id}
                node={node}
                onSelectEmployee={setSelectedEmployee}
                filterDept={filterDept}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="min-w-[600px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(filterDept
              ? data.flat.filter((e) => e.department === filterDept)
              : data.flat
            ).map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onClick={setSelectedEmployee}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty filter result */}
      {filterDept &&
        (viewMode === 'tree'
          ? data.tree.every(
              (n) =>
                !hasNodeWithDept(n, filterDept) &&
                n.department !== filterDept
            )
          : data.flat.filter((e) => e.department === filterDept).length === 0
        ) && (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No employees found in <span style={{ color: getDeptColor(filterDept) }}>{filterDept}</span>
            </p>
          </div>
        )}

      {/* Detail side panel */}
      {selectedEmployee && (
        <DetailPanel
          employee={selectedEmployee}
          allEmployees={data.flat}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={handleUpdateEmployee}
        />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasNodeWithDept(node: OrgChartNode, dept: string): boolean {
  if (node.department === dept) return true
  return node.children.some((c) => hasNodeWithDept(c, dept))
}
