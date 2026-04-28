'use client'

import * as React from 'react'
import { FileText, Download, Filter, Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

const actionColors: Record<string, string> = {
  CREATE: '#4ADE80', UPDATE: '#60A5FA', DELETE: '#F87171',
  APPROVE: '#4ADE80', REJECT: '#F87171', LOGIN: '#A78BFA',
  LOGOUT: '#9CA3AF', EXPORT: '#60A5FA', IMPORT: '#FBBF24',
  FORCE_LOGOUT: '#F87171', VIEW: '#9CA3AF'
}

const modules = ['AUTH', 'EMPLOYEE', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'SETTINGS', 'DASHBOARD', 'DOCUMENT', 'REIMBURSEMENT', 'TOOL', 'LEARNING']
const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'FORCE_LOGOUT', 'VIEW']

interface AuditLog {
  id: string
  userId: string | null
  userEmail: string | null
  employeeName: string | null
  module: string
  action: string
  description: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  createdAt: string | Date
}

export default function AuditLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [moduleFilter, setModuleFilter] = React.useState('')
  const [actionFilter, setActionFilter] = React.useState('')
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null)

  const fetchLogs = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (moduleFilter) params.set('module', moduleFilter)
      if (actionFilter) params.set('action', actionFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/audit-log?${params}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data || [])
        setTotal(json.total || 0)
      } else {
        console.error('API error:', json.error)
        toast({ title: 'Error', description: json.error || 'Failed to load audit logs', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({ title: 'Error', description: 'Failed to load audit logs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, moduleFilter, actionFilter, search, toast])

  React.useEffect(() => { fetchLogs() }, [fetchLogs])

  // Client-side search filtering (additional filter on top of server results)
  const filteredLogs = React.useMemo(() => {
    if (!search) return logs
    const searchLower = search.toLowerCase()
    return logs.filter(log =>
      log.description?.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.employeeName?.toLowerCase().includes(searchLower)
    )
  }, [logs, search])

  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch (_e) {
      return String(date)
    }
  }

  const todayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length

  const exportCSV = () => {
    const csv = ['Timestamp,User,Module,Action,Description,IP']
    filteredLogs.forEach(log => {
      csv.push(`${log.createdAt},${log.userEmail || ''},${log.module},${log.action},"${log.description}",${log.ipAddress || ''}`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Track all system activity and changes</p>
        </div>
        <Button onClick={exportCSV} variant="outline" style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Total Logs</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{todayLogs}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Today</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>{logs.filter(l => l.action === 'CREATE').length}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Creates</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{logs.filter(l => l.action === 'UPDATE').length}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6B7280' }} />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
            style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}
          />
        </div>
        <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}>
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <SelectItem value="">All Modules</SelectItem>
            {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]" style={{ background: '#1A1A1A', borderColor: '#2D2D2D', color: '#FFFFFF' }}>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <SelectItem value="">All Actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#6B7280' }}>
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2D2D2D' }}>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>Timestamp</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>User</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>Module</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>Action</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>Description</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: '#6B7280' }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr
                      key={log.id}
                      className="cursor-pointer hover:bg-white/5"
                      style={{ borderBottom: '1px solid #1F1F1F' }}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="p-3 text-xs text-white">{formatDate(log.createdAt)}</td>
                      <td className="p-3 text-xs" style={{ color: '#9CA3AF' }}>{log.userEmail || log.employeeName || 'System'}</td>
                      <td className="p-3"><Badge variant="secondary">{log.module}</Badge></td>
                      <td className="p-3"><Badge style={{ background: `${actionColors[log.action] || '#9CA3AF'}20`, color: actionColors[log.action] || '#9CA3AF' }}>{log.action}</Badge></td>
                      <td className="p-3 text-xs text-white max-w-[300px] truncate">{log.description}</td>
                      <td className="p-3 text-xs" style={{ color: '#6B7280' }}>{log.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Page {page} of {Math.ceil(total / 20)}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} style={{ borderColor: '#2D2D2D', color: '#FFFFFF' }}>Next</Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs" style={{ color: '#6B7280' }}>User</p><p className="text-sm text-white">{selectedLog.userEmail || 'System'}</p></div>
                <div><p className="text-xs" style={{ color: '#6B7280' }}>Employee</p><p className="text-sm text-white">{selectedLog.employeeName || '-'}</p></div>
                <div><p className="text-xs" style={{ color: '#6B7280' }}>Module</p><p className="text-sm"><Badge variant="secondary">{selectedLog.module}</Badge></p></div>
                <div><p className="text-xs" style={{ color: '#6B7280' }}>Action</p><p className="text-sm"><Badge style={{ background: `${actionColors[selectedLog.action]}20`, color: actionColors[selectedLog.action] }}>{selectedLog.action}</Badge></p></div>
                <div className="col-span-2"><p className="text-xs" style={{ color: '#6B7280' }}>Description</p><p className="text-sm text-white">{selectedLog.description}</p></div>
                <div><p className="text-xs" style={{ color: '#6B7280' }}>IP Address</p><p className="text-sm text-white">{selectedLog.ipAddress || '-'}</p></div>
                <div><p className="text-xs" style={{ color: '#6B7280' }}>Timestamp</p><p className="text-sm text-white">{formatDate(selectedLog.createdAt)}</p></div>
              </div>
              {selectedLog.oldValue && (
                <div><p className="text-xs" style={{ color: '#6B7280' }}>Old Value</p><pre className="text-xs p-2 rounded mt-1 overflow-x-auto" style={{ background: '#262626', color: '#F87171' }}>{JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}</pre></div>
              )}
              {selectedLog.newValue && (
                <div><p className="text-xs" style={{ color: '#6B7280' }}>New Value</p><pre className="text-xs p-2 rounded mt-1 overflow-x-auto" style={{ background: '#262626', color: '#4ADE80' }}>{JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}</pre></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
