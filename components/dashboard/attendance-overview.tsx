'use client'

import * as React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AttendanceData {
  date: string
  present: number
  absent: number
}

interface AttendanceOverviewProps {
  data?: AttendanceData[]
  summary?: {
    present: number
    absent: number
    halfDay: number
    onLeave: number
    weekOff: number
    holiday: number
  }
}

const COLORS = ['#8B5CF6', '#EF4444', '#F59E0B', '#A78BFA', '#10B981', '#6B7280']

export function AttendanceOverview({ data, summary }: AttendanceOverviewProps) {
  if (summary) {
    const pieData = [
      { name: 'Present', value: summary.present },
      { name: 'Absent', value: summary.absent },
      { name: 'Half Day', value: summary.halfDay },
      { name: 'On Leave', value: summary.onLeave },
      { name: 'Week Off', value: summary.weekOff },
      { name: 'Holiday', value: summary.holiday },
    ].filter((d) => d.value > 0)

    return (
      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-white">Today&apos;s Attendance</CardTitle>
          <CardDescription>Distribution of attendance status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2D2D2D',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'white',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-white">Attendance Trend</CardTitle>
          <CardDescription>Last 7 days attendance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px] text-sm" style={{ color: '#6B7280' }}>
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
      <CardHeader>
        <CardTitle className="text-white">Attendance Trend</CardTitle>
        <CardDescription>Last 7 days attendance overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#2D2D2D" />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#2D2D2D" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1A1A',
                border: '1px solid #2D2D2D',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'white',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
            <Bar dataKey="present" name="Present" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
