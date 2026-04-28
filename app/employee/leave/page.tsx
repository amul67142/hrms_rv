'use client'

import * as React from 'react'
import { Plus, Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, Column } from '@/components/data-table'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'
import Link from 'next/link'
import type { LeaveRequest, LeaveStatus, LeaveType } from '@/types'

const statusColors: Record<LeaveStatus, 'pending' | 'approved' | 'rejected' | 'cancelled'> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

const leaveTypeColors: Record<string, string> = {
  CASUAL: '#3B82F6',
  SICK: '#F59E0B',
  MATERNITY: '#EC4899',
  PATERNITY: '#F97316',
  BEREAVEMENT: '#6B7280',
  UNPAID: '#EF4444',
  COMPENSATORY: '#14B8A6',
  WFH: '#06B6D4',
}

interface LeaveBalanceItem {
  id: string
  employeeId: string
  leaveType: string
  year: number
  entitled: number
  taken: number
  pending: number
  available: number
}

export default function EmployeeLeavePage() {
  const { toast } = useToast()
  const [requests, setRequests] = React.useState<LeaveRequest[]>([])
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalanceItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  const fetchLeaveData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [requestsRes, balanceRes] = await Promise.all([
        fetch('/api/leave?limit=100'),
        fetch('/api/me').then(res => res.json()).then(json => {
          if (json.success && json.data?.id) {
            return fetch(`/api/leave/balance/${json.data.id}`)
          }
          return null
        }).then(res => res ? res.json() : null).catch(() => null)
      ])

      const requestsJson = await requestsRes.json()
      if (requestsJson.success) {
        setRequests(requestsJson.data || [])
      }

      if (balanceRes?.success) {
        setLeaveBalances(balanceRes.data?.balances || [])
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error)
      toast({ title: 'Error', description: 'Failed to load leave data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchLeaveData()
  }, [fetchLeaveData])

  const pending = requests.filter((r) => r.status === 'PENDING')
  const approved = requests.filter((r) => r.status === 'APPROVED')
  const rejected = requests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED')

  const filteredRequests = React.useMemo(() => {
    switch (activeTab) {
      case 'pending': return pending
      case 'approved': return approved
      case 'rejected': return rejected
      case 'all': return requests
      default: return requests
    }
  }, [activeTab, pending, approved, rejected, requests])

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'leaveType',
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: leaveTypeColors[row.leaveType] || '#8B5CF6' }}
          />
          <span className="text-sm font-medium text-white">
            {row.leaveType.replace('_', ' ')}
          </span>
          {row.halfDay && (
            <Badge variant="secondary" className="text-xs">Half Day</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (row) => (
        <div>
          <p className="text-sm text-white">
            {formatDate(row.startDate.toString(), 'dd MMM')} - {formatDate(row.endDate.toString(), 'dd MMM yyyy')}
          </p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {row.totalDays} day{row.totalDays !== 1 ? 's' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-sm truncate max-w-xs block" style={{ color: '#D1D5DB' }}>
          {row.reason || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusColors[row.status]}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'appliedAt',
      header: 'Applied On',
      render: (row) => (
        <span style={{ color: '#9CA3AF' }}>
          {formatDate(row.appliedAt?.toString() || row.createdAt.toString(), 'dd MMM yyyy')}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My Leave</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>View and manage your leave requests</p>
        </div>
        <Button asChild style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
          <Link href="/employee/leave/apply">
            <Plus className="mr-2 h-4 w-4" />
            Apply for Leave
          </Link>
        </Button>
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveBalances.length === 0 && !loading && (
          <>
            {/* Default cards when no balance data */}
            <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Casual Leave</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>Balance not configured</p>
              </CardContent>
            </Card>
            <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Sick Leave</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>Balance not configured</p>
              </CardContent>
            </Card>
          </>
        )}
        {leaveBalances.map((balance) => {
          const color = leaveTypeColors[balance.leaveType] || '#8B5CF6'
          const pct = balance.entitled > 0 ? ((balance.entitled - balance.available) / balance.entitled) * 100 : 0
          return (
            <Card key={balance.id} style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {balance.leaveType.replace('_', ' ')}
                  </span>
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-2xl font-bold text-white">{balance.available}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>of {balance.entitled}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, pct)}%`, background: color }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs" style={{ color: '#6B7280' }}>
                  <span>{balance.taken} taken</span>
                  {balance.pending > 0 && <span>{balance.pending} pending</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Leave Requests Tabs */}
      <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <CardHeader className="border-b" style={{ borderColor: '#2D2D2D' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'pending' ? '#8B5CF6' : 'transparent',
              }}
            >
              Pending ({pending.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'approved'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'approved' ? '#8B5CF6' : 'transparent',
              }}
            >
              Approved ({approved.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'rejected'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'rejected' ? '#8B5CF6' : 'transparent',
              }}
            >
              Rejected ({rejected.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'all' ? '#8B5CF6' : 'transparent',
              }}
            >
              All ({requests.length})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRequests}
              keyField="id"
              searchable={false}
              emptyMessage="No leave requests found"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
