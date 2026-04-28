'use client'

import * as React from 'react'
import { Monitor, Smartphone, Globe, Clock, MapPin, Activity, Loader2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

interface Session {
  id: string
  ipAddress: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  city: string | null
  country: string | null
  loginAt: string
  logoutAt: string | null
  isActive: boolean
}

export default function EmployeeSessionsPage() {
  const { toast } = useToast()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)

  const fetchSessions = React.useCallback(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(json => {
        if (json.success) setSessions(json.data)
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  React.useEffect(() => {
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCount = sessions.filter(s => s.isActive).length
  const lastLogin = sessions[0]

  const getDeviceIcon = (device: string | null) => {
    if (device?.includes('Mobile')) return <Smartphone className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  const formatTime = (date: string) => new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">My Sessions</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>View your login history and active sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{sessions.length}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Total Sessions</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>{activeCount}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Active Now</p>
          </CardContent>
        </Card>
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-white">{lastLogin ? formatTime(lastLogin.loginAt) : 'N/A'}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Last Login</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-white">Login History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#6B7280' }}>
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No sessions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:border-[#8B5CF6] transition-colors"
                  style={{ background: '#262626', borderColor: '#2D2D2D' }}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF620' }}>
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{session.browser} on {session.os}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {session.ipAddress} {session.city && `• ${session.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-white">{formatTime(session.loginAt)}</p>
                      {session.logoutAt && <p className="text-xs" style={{ color: '#6B7280' }}>Logout: {formatTime(session.logoutAt)}</p>}
                    </div>
                    <Badge variant={session.isActive ? 'success' : 'secondary'}>
                      {session.isActive ? 'Active' : 'Ended'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Device</p>
                  <p className="text-sm text-white">{selectedSession.deviceType}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Browser</p>
                  <p className="text-sm text-white">{selectedSession.browser}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Operating System</p>
                  <p className="text-sm text-white">{selectedSession.os}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>IP Address</p>
                  <p className="text-sm text-white">{selectedSession.ipAddress}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Location</p>
                  <p className="text-sm text-white">{selectedSession.city || 'N/A'}, {selectedSession.country || ''}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Status</p>
                  <Badge variant={selectedSession.isActive ? 'success' : 'secondary'}>
                    {selectedSession.isActive ? 'Active' : 'Ended'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Login Time</p>
                  <p className="text-sm text-white">{formatTime(selectedSession.loginAt)}</p>
                </div>
                {selectedSession.logoutAt && (
                  <div>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Logout Time</p>
                    <p className="text-sm text-white">{formatTime(selectedSession.logoutAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
