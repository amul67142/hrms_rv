'use client'

import * as React from 'react'
import { Save, Upload, Mail, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

interface CompanySettings {
  companyName: string
  companyAddress: string
  phone: string
  email: string
  website: string
  logoUrl: string
  pan: string
  tan: string
  pfNumber: string
  esiNumber: string
  salarySlipSignatoryName: string
  salarySlipSignatoryDesig: string
  footerText: string
}

const defaultSettings: CompanySettings = {
  companyName: '',
  companyAddress: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  pan: '',
  tan: '',
  pfNumber: '',
  esiNumber: '',
  salarySlipSignatoryName: '',
  salarySlipSignatoryDesig: '',
  footerText: '',
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [fetching, setFetching] = React.useState(true)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [settings, setSettings] = React.useState<CompanySettings>(defaultSettings)

  // Fetch settings from database on load
  React.useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setFetching(true)
    try {
      const res = await fetch('/api/company-settings')
      const json = await res.json()
      if (json.success && json.data) {
        const d = json.data
        setSettings({
          companyName: d.companyName || '',
          companyAddress: d.companyAddress || '',
          phone: d.phone || '',
          email: d.email || '',
          website: d.website || '',
          logoUrl: d.logoUrl || '',
          pan: d.pan || '',
          tan: d.tan || '',
          pfNumber: d.pfNumber || '',
          esiNumber: d.esiNumber || '',
          salarySlipSignatoryName: d.salarySlipSignatoryName || '',
          salarySlipSignatoryDesig: d.salarySlipSignatoryDesig || '',
          footerText: d.footerText || '',
        })
        if (d.logoUrl) setLogoPreview(d.logoUrl)
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
    } finally {
      setFetching(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setLogoPreview(result)
        setSettings(s => ({ ...s, logoUrl: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const updateField = (field: keyof CompanySettings, value: string) => {
    setSettings(s => ({ ...s, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: settings.companyName,
          companyAddress: settings.companyAddress,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          logoUrl: settings.logoUrl,
          pan: settings.pan,
          tan: settings.tan,
          pfNumber: settings.pfNumber,
          esiNumber: settings.esiNumber,
          salarySlipSignatoryName: settings.salarySlipSignatoryName,
          salarySlipSignatoryDesig: settings.salarySlipSignatoryDesig,
          footerText: settings.footerText,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Success', description: 'Settings saved successfully' })
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to save settings', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Company settings and configuration</p>
      </div>

      {/* SMTP Settings Quick Access */}
      <Link href="/admin/smtp">
        <div
          className="flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer hover:border-opacity-80"
          style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Mail className="h-5 w-5" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">SMTP Settings</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Configure email server and notifications</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: '#9CA3AF' }} />
        </div>
      </Link>

      <Separator style={{ background: '#2D2D2D' }} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-white">Company Information</CardTitle>
            <CardDescription>Basic company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-gray-300">Company Name</Label>
              <Input id="company-name" value={settings.companyName}
                onChange={e => updateField('companyName', e.target.value)}
                placeholder="Enter company name"
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300">Address</Label>
              <Textarea id="address" value={settings.companyAddress}
                onChange={e => updateField('companyAddress', e.target.value)}
                placeholder="Enter company address"
                rows={3}
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                <Input id="phone" type="tel" value={settings.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input id="email" type="email" value={settings.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="Enter email"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="text-gray-300">Website</Label>
              <Input id="website" value={settings.website}
                onChange={e => updateField('website', e.target.value)}
                placeholder="Enter website URL"
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-white">Company Logo</CardTitle>
            <CardDescription>Upload your company logo for salary slips and reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-contain border border-gray-700" />
                  <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => { setLogoPreview(null); setSettings(s => ({ ...s, logoUrl: '' })) }}>X</Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 w-20 rounded-lg border-2 border-dashed border-gray-700 bg-transparent">
                  <Upload className="h-6 w-6" style={{ color: '#6D7280' }} />
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload">
                  <Button type="button" variant="outline" asChild className="cursor-pointer border-gray-700 text-gray-300 hover:bg-gray-800">
                    <span><Upload className="mr-2 h-4 w-4" />Upload Logo</span>
                  </Button>
                </label>
                <p className="text-xs mt-1" style={{ color: '#6D7280' }}>PNG, JPG up to 2MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signatory */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-white">Signatory Information</CardTitle>
            <CardDescription>Details for authorized signatory on documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signatory-name" className="text-gray-300">Signatory Name</Label>
                <Input id="signatory-name" value={settings.salarySlipSignatoryName}
                  onChange={e => updateField('salarySlipSignatoryName', e.target.value)}
                  placeholder="Enter signatory name"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-designation" className="text-gray-300">Designation</Label>
                <Input id="signatory-designation" value={settings.salarySlipSignatoryDesig}
                  onChange={e => updateField('salarySlipSignatoryDesig', e.target.value)}
                  placeholder="Enter designation"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-text" className="text-gray-300">Salary Slip Footer Text</Label>
              <Textarea id="footer-text" value={settings.footerText}
                onChange={e => updateField('footerText', e.target.value)}
                placeholder="Enter footer text"
                rows={2}
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
          </CardContent>
        </Card>

        {/* Tax Numbers */}
        <Card style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <CardHeader>
            <CardTitle className="text-white">Tax &amp; Registration Numbers</CardTitle>
            <CardDescription>Company tax and registration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pan" className="text-gray-300">PAN</Label>
                <Input id="pan" value={settings.pan}
                  onChange={e => updateField('pan', e.target.value)}
                  placeholder="Enter PAN number"
                  className="uppercase bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tan" className="text-gray-300">TAN</Label>
                <Input id="tan" value={settings.tan}
                  onChange={e => updateField('tan', e.target.value)}
                  placeholder="Enter TAN number"
                  className="uppercase bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf-number" className="text-gray-300">PF Number</Label>
                <Input id="pf-number" value={settings.pfNumber}
                  onChange={e => updateField('pfNumber', e.target.value)}
                  placeholder="Enter PF number"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esi-number" className="text-gray-300">ESI Number</Label>
                <Input id="esi-number" value={settings.esiNumber}
                  onChange={e => updateField('esiNumber', e.target.value)}
                  placeholder="Enter ESI number"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} style={{ background: '#8B5CF6' }} className="hover:bg-opacity-90 text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
