'use client'

import * as React from 'react'
import { Save, Upload, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    toast({ title: 'Success', description: 'Settings saved successfully' })
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
              <Input id="company-name" defaultValue="Tech Solutions Pvt. Ltd."
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="text-gray-300">Tagline</Label>
              <Input id="tagline" defaultValue="Empowering businesses with technology"
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300">Address</Label>
              <Textarea id="address" defaultValue="123, Tech Park, Sector 62, Noida, UP - 201301" rows={3}
                className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                <Input id="phone" type="tel" defaultValue="+91-120-456-7890"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input id="email" type="email" defaultValue="info@techsolutions.com"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="text-gray-300">Website</Label>
              <Input id="website" defaultValue="www.techsolutions.com"
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
                  <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setLogoPreview(null)}>X</Button>
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
                <Input id="signatory-name" defaultValue="Rajesh Kumar"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-designation" className="text-gray-300">Designation</Label>
                <Input id="signatory-designation" defaultValue="Managing Director"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-text" className="text-gray-300">Salary Slip Footer Text</Label>
              <Textarea id="footer-text" defaultValue="This is a computer-generated document and does not require a signature." rows={2}
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
                <Input id="pan" defaultValue="AABCT1234C" className="uppercase bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tan" className="text-gray-300">TAN</Label>
                <Input id="tan" defaultValue="DELT12345C" className="uppercase bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf-number" className="text-gray-300">PF Number</Label>
                <Input id="pf-number" defaultValue="DL/12345/1234567"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esi-number" className="text-gray-300">ESI Number</Label>
                <Input id="esi-number" defaultValue="12-3456-789"
                  className="bg-transparent border-gray-700 text-white placeholder-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={loading} style={{ background: '#8B5CF6' }} className="hover:bg-opacity-90">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
