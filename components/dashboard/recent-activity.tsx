'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/core/utils'
import type { LeaveRequest } from '@/types'
import { CalendarDays, Clock } from 'lucide-react'

interface RecentActivityProps {
  activities?: LeaveRequest[]
  limit?: number
}

const leaveTypeColors: Record<string, string> = {
  CASUAL: 'info',
  SICK: 'warning',
  MATERNITY: 'secondary',
  PATERNITY: 'secondary',
  BEREAVEMENT: 'secondary',
  UNPAID: 'destructive',
  COMPENSATORY: 'info',
  WFH: 'info',
}

export function RecentActivity({ activities = [], limit = 5 }: RecentActivityProps) {
  const displayActivities = activities.slice(0, limit)

  return (
    <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
      <CardHeader>
        <CardTitle className="text-base text-white">Recent Leave Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: '#6B7280' }}>
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent leave requests</p>
          </div>
        ) : (
          displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-3 last:border-0 last:pb-0"
              style={{ borderBottom: '1px solid #2D2D2D' }}>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.1)' }}>
                <CalendarDays className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white truncate">
                    {activity.employee?.firstName} {activity.employee?.lastName}
                  </span>
                  <Badge variant={(leaveTypeColors[activity.leaveType] || 'secondary') as 'info' | 'warning' | 'success' | 'secondary' | 'destructive'}>
                    {activity.leaveType.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                  <span>
                    {formatDate(activity.startDate.toString(), 'dd MMM')} - {formatDate(activity.endDate.toString(), 'dd MMM')}
                  </span>
                  <span>({activity.totalDays} day{activity.totalDays !== 1 ? 's' : ''})</span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Applied on {formatDate(activity.appliedAt?.toString() || activity.createdAt.toString(), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
