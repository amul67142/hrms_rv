'use client'

import * as React from 'react'
import { Save, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'

interface SalarySlipConfig {
  showWatermark: boolean
  watermarkText: string
  headerText: string
  footerText: string
  signatoryName: string
  signatoryDesignation: string
  primaryColor: string
  showCompanyLogo: boolean
  showDualSignatures: boolean
  secondSignatoryName: string
  secondSignatoryDesignation: string
}

export default function SalarySlipSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [config, setConfig] = React.useState<SalarySlipConfig>({
    showWatermark: false,
    watermarkText: '',
    headerText: '',
    footerText: '',
    signatoryName: '',
    signatoryDesignation: '',
    primaryColor: '#8B5CF6',
    showCompanyLogo: true,
    showDualSignatures: false,
    secondSignatoryName: '',
    secondSignatoryDesignation: '',
  })

  React.useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/salary-slip')
      const json = await res.json()
      if (json.success) {
        setConfig(json.data)
      }
    } catch (_e) {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings/salary-slip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showWatermark: config.showWatermark,
          watermarkText: config.watermarkText,
          headerText: config.headerText,
          footerText: config.footerText,
          signatoryName: config.signatoryName,
          signatoryDesignation: config.signatoryDesignation,
          primaryColor: config.primaryColor,
          showCompanyLogo: config.showCompanyLogo,
          showDualSignatures: config.showDualSignatures,
          secondSignatoryName: config.secondSignatoryName,
          secondSignatoryDesignation: config.secondSignatoryDesignation,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Settings saved', description: 'Salary slip template configuration updated.' })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to save settings.', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function update(field: keyof SalarySlipConfig, value: any) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Salary Slip Settings</h2>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Configure the salary slip PDF template</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: '#1A1A1A' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Salary Slip Settings</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Configure the salary slip PDF template appearance and branding
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: '#8B5CF6' }} />
              Branding
            </CardTitle>
            <CardDescription>Customize the visual identity of generated salary slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs" style={{ color: '#9CA3AF' }}>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => update('primaryColor', e.target.value)}
                    className="h-10 w-16 rounded-lg border cursor-pointer"
                    style={{ background: '#262626', borderColor: '#2D2D2D' }}
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => update('primaryColor', e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#8B5CF6"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs" style={{ color: '#9CA3AF' }}>Preview</Label>
                <div
                  className="h-10 rounded-lg flex items-center justify-center text-xs font-medium text-white"
                  style={{ background: config.primaryColor }}
                >
                  {config.primaryColor.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-white">Show Company Logo</Label>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Display company logo in the salary slip header</p>
              </div>
              <Switch
                checked={config.showCompanyLogo}
                onCheckedChange={(v) => update('showCompanyLogo', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Header & Footer Text */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
            <CardDescription>Customize header and footer text on salary slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: '#9CA3AF' }}>Header Text</Label>
              <Input
                value={config.headerText}
                onChange={(e) => update('headerText', e.target.value)}
                placeholder="e.g., ABC Corporation Pvt. Ltd. | HR Department"
                className="text-sm"
              />
              <p className="text-xs" style={{ color: '#6B7280' }}>Leave blank to use company name from settings</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: '#9CA3AF' }}>Footer Text</Label>
              <Textarea
                value={config.footerText}
                onChange={(e) => update('footerText', e.target.value)}
                placeholder="e.g., This is a system-generated document."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Watermark */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base">Watermark</CardTitle>
            <CardDescription>Add a semi-transparent watermark across salary slip pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-white">Show Watermark</Label>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Display a large diagonal watermark on each page</p>
              </div>
              <Switch
                checked={config.showWatermark}
                onCheckedChange={(v) => update('showWatermark', v)}
              />
            </div>
            {config.showWatermark && (
              <div className="space-y-2">
                <Label className="text-xs" style={{ color: '#9CA3AF' }}>Watermark Text</Label>
                <Input
                  value={config.watermarkText}
                  onChange={(e) => update('watermarkText', e.target.value)}
                  placeholder="e.g., CONFIDENTIAL"
                  className="text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signatories */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-base">Signatory</CardTitle>
            <CardDescription>Configure the authorised signatory shown at the bottom of salary slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs" style={{ color: '#9CA3AF' }}>Signatory Name</Label>
                <Input
                  value={config.signatoryName}
                  onChange={(e) => update('signatoryName', e.target.value)}
                  placeholder="e.g., John Smith"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs" style={{ color: '#9CA3AF' }}>Designation</Label>
                <Input
                  value={config.signatoryDesignation}
                  onChange={(e) => update('signatoryDesignation', e.target.value)}
                  placeholder="e.g., Head of Human Resources"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-white">Dual Signatures</Label>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Show two signatory blocks side by side</p>
              </div>
              <Switch
                checked={config.showDualSignatures}
                onCheckedChange={(v) => update('showDualSignatures', v)}
              />
            </div>

            {config.showDualSignatures && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg space-y-3" style={{ background: '#262626' }}>
                <p className="col-span-2 text-xs font-semibold" style={{ color: '#8B5CF6' }}>SECOND SIGNATORY</p>
                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: '#9CA3AF' }}>Name</Label>
                  <Input
                    value={config.secondSignatoryName}
                    onChange={(e) => update('secondSignatoryName', e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: '#9CA3AF' }}>Designation</Label>
                  <Input
                    value={config.secondSignatoryDesignation}
                    onChange={(e) => update('secondSignatoryDesignation', e.target.value)}
                    placeholder="e.g., Finance Manager"
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} style={{ background: '#8B5CF6' }}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
