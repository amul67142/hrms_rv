'use client'

import * as React from 'react'
import { Save, Mail, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'

interface SMTPSettings {
  id?: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromEmail: string
  fromName: string
  enabled: boolean
}

export default function SMTPSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [settings, setSettings] = React.useState<SMTPSettings>({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Realvibe HRM',
    enabled: false,
  })
  const [originalPassword, setOriginalPassword] = React.useState('')

  React.useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/smtp')
      const data = await res.json()
      if (data.success && data.data) {
        setSettings({
          ...data.data,
          password: data.data.password || '',
        })
        setOriginalPassword(data.data.password || '')
      }
    } catch (_e) {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings.host || !settings.username || !settings.fromEmail) {
      toast({
        title: 'Validation Error',
        description: 'Host, Username, and From Email are required.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = { ...settings }
      // Only send password if it was changed (not the masked placeholder)
      if (payload.password === '********' || payload.password === '') {
        payload.password = originalPassword
      }
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'SMTP settings saved successfully.' })
        if (payload.password) {
          setOriginalPassword(payload.password)
        }
        setSettings(prev => ({ ...prev, password: '********' }))
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save settings.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!settings.host || !settings.username || !settings.fromEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields before testing.',
        variant: 'destructive',
      })
      return
    }
    setTesting(true)
    try {
      // Save first, then test
      const payload = { ...settings }
      if (payload.password === '********' || payload.password === '') {
        payload.password = originalPassword
      }
      const saveRes = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, enabled: true }),
      })
      const saveData = await saveRes.json()
      if (!saveData.success) {
        toast({ title: 'Error', description: 'Failed to save settings for test.', variant: 'destructive' })
        setTesting(false)
        return
      }

      // Send a test email
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: settings.fromEmail }),
      })
      const testData = await res.json()
      if (testData.success) {
        toast({ title: 'Test Email Sent', description: `A test email was sent to ${settings.fromEmail}.` })
      } else {
        toast({ title: 'Test Failed', description: testData.error || 'Could not send test email. Check your SMTP credentials.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Test Failed', description: 'An error occurred while testing.', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8B5CF6' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">SMTP Settings</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Configure email server settings for sending notifications
        </p>
      </div>

      {/* Status Banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{
          background: settings.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          borderColor: settings.enabled ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        }}
      >
        {settings.enabled ? (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#22C55E' }} />
        ) : (
          <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#EF4444' }} />
        )}
        <div>
          <p className="text-sm font-medium text-white">
            Email notifications are {settings.enabled ? 'enabled' : 'disabled'}
          </p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {settings.enabled
              ? 'Emails will be sent using the configured SMTP server.'
              : 'No emails will be sent until SMTP is configured and enabled.'}
          </p>
        </div>
      </div>

      <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: '#8B5CF6' }} />
            Server Configuration
          </CardTitle>
          <CardDescription>
            Enter your SMTP server details. For Gmail, use port 587 with TLS or port 465 with SSL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <Label htmlFor="enabled" className="text-white font-medium">Enable Email Notifications</Label>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                Turn on to start sending email notifications to employees
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host" className="text-gray-300">SMTP Host</Label>
              <Input
                id="host"
                value={settings.host}
                onChange={(e) => setSettings(prev => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="bg-transparent border-gray-700 text-white placeholder-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port" className="text-gray-300">Port</Label>
              <Input
                id="port"
                type="number"
                value={settings.port}
                onChange={(e) => setSettings(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                placeholder="587"
                className="bg-transparent border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <Label htmlFor="secure" className="text-white font-medium">Secure (SSL/TLS)</Label>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                Enable for port 465 (SSL). For port 587, keep this disabled (TLS).
              </p>
            </div>
            <Switch
              id="secure"
              checked={settings.secure}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, secure: checked }))}
            />
          </div>

          <div className="border-t pt-6" style={{ borderColor: '#2D2D2D' }}>
            <h4 className="text-sm font-semibold text-white mb-4">Authentication</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username / Email</Label>
                <Input
                  id="username"
                  type="email"
                  value={settings.username}
                  onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-email@gmail.com"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">App Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={settings.password}
                  onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={originalPassword ? '********' : 'Enter app password'}
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500"
                />
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                  <p className="text-xs" style={{ color: '#A78BFA' }}>
                    For Gmail, use an <strong>App Password</strong> (16 characters) instead of your regular password.
                    Generate one at your Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: '#2D2D2D' }}>
            <h4 className="text-sm font-semibold text-white mb-4">Sender Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail" className="text-gray-300">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="noreply@realvibe.com"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName" className="text-gray-300">From Name</Label>
                <Input
                  id="fromName"
                  value={settings.fromName}
                  onChange={(e) => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
                  placeholder="Realvibe HRM"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleTest}
              disabled={testing || saving}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || testing}
              style={{ background: '#8B5CF6' }}
              className="hover:bg-opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        <CardHeader>
          <CardTitle className="text-white text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="font-medium text-white">Gmail / Google Workspace</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Host: smtp.gmail.com</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Port: 587 (TLS) or 465 (SSL)</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Requires App Password</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="font-medium text-white">Outlook / Office 365</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Host: smtp-mail.outlook.com</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Port: 587 (TLS)</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Use regular email password</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="font-medium text-white">SendGrid</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Host: smtp.sendgrid.net</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Port: 587 (TLS)</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Use API key as password</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
