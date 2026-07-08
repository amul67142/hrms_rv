'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Briefcase, FileText, CreditCard, Key, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

import Link from 'next/link'

interface EditEmployeeData {
  employeeCode: string
  esslCode: string
  firstName: string
  lastName: string
  fatherName: string
  email: string
  phone: string
  gender: string
  dateOfBirth: string
  department: string
  designation: string
  employmentType: string
  joiningDate: string
  status: string
  panNumber: string
  aadhaarNumber: string
  pfNumber: string
  uanNumber: string
  esiNumber: string
  bankName: string
  accountNumber: string
  ifscCode: string
  address: string
  city: string
  state: string
  pincode: string
  emergencyContactName: string
  emergencyContactPhone: string
  maritalStatus: string
  role: string
}

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)
  const [sendingEmail, setSendingEmail] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [departments, setDepartments] = React.useState<{ id: string; name: string }[]>([])
  const [loadingDepartments, setLoadingDepartments] = React.useState(true)
  const [formData, setFormData] = React.useState<EditEmployeeData>({
    employeeCode: '', esslCode: '', firstName: '', lastName: '', fatherName: '', email: '', phone: '', gender: 'MALE',
    dateOfBirth: '', department: '', designation: '', employmentType: 'FULL_TIME',
    joiningDate: '', status: 'ACTIVE', panNumber: '', aadhaarNumber: '', pfNumber: '',
    uanNumber: '', esiNumber: '', bankName: '', accountNumber: '', ifscCode: '',
    address: '', city: '', state: '', pincode: '', emergencyContactName: '',
    emergencyContactPhone: '', maritalStatus: 'SINGLE', role: 'EMPLOYEE',
  })

  React.useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setDepartments(json.data)
        }
      } catch (e) {
        console.error('Failed to load departments:', e)
      } finally {
        setLoadingDepartments(false)
      }
    }
    fetchDepartments()
  }, [])

  React.useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${params.id}`)
        const data = await res.json()
        if (data.success) {
          const emp = data.data
          setFormData({
            employeeCode: emp.employeeCode || '',
            esslCode: emp.esslCode || '',
            firstName: emp.firstName || '',
            lastName: emp.lastName || '',
            fatherName: emp.fatherName || '',
            email: emp.email || '',
            phone: emp.phone || '',
            gender: emp.gender || 'MALE',
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
            department: emp.department || '',
            designation: emp.designation || '',
            employmentType: emp.employmentType || 'FULL_TIME',
            joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
            status: emp.status || 'ACTIVE',
            panNumber: emp.panNumber || '',
            aadhaarNumber: emp.aadhaarNumber || '',
            pfNumber: emp.pfNumber || '',
            uanNumber: emp.uanNumber || '',
            esiNumber: emp.esiNumber || '',
            bankName: emp.bankName || '',
            accountNumber: emp.accountNumber || '',
            ifscCode: emp.ifscCode || '',
            address: emp.address || '',
            city: emp.city || '',
            state: emp.state || '',
            pincode: emp.pincode || '',
            emergencyContactName: emp.emergencyContactName || '',
            emergencyContactPhone: emp.emergencyContactPhone || '',
            maritalStatus: emp.maritalStatus || 'SINGLE',
            role: emp.user?.role || 'EMPLOYEE',
          })
        }
      } catch (_e) {
        toast({ title: 'Error', description: 'Failed to load employee', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [params.id, toast])

  const handleChange = (field: keyof EditEmployeeData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: 'Success', description: 'Employee updated successfully' })
        router.push(`/admin/employees/${params.id}`)
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update employee', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return
    setResetting(true)
    try {
      const res = await fetch(`/api/employees/${params.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Password updated successfully' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update password', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' })
    } finally {
      setResetting(false)
    }
  }

  const handleSendCredentials = async () => {
    if (!newPassword || newPassword.length < 6) return
    setSendingEmail(true)
    try {
      // First update the password
      await fetch(`/api/employees/${params.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      // Then send the credentials email
      const res = await fetch(`/api/employees/${params.id}/send-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message || 'Credentials email sent!' })
        setNewPassword('')
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to send email', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to send credentials', variant: 'destructive' })
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="h-96 rounded-xl animate-pulse" style={{ background: '#1A1A1A' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
          <Link href={`/admin/employees/${params.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Edit Employee</h2>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Update employee record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-fit border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <TabsTrigger value="personal" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <User className="h-4 w-4 mr-1" /> Personal
            </TabsTrigger>
            <TabsTrigger value="employment" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <Briefcase className="h-4 w-4 mr-1" /> Employment
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <FileText className="h-4 w-4 mr-1" /> Documents
            </TabsTrigger>
            <TabsTrigger value="bank" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <CreditCard className="h-4 w-4 mr-1" /> Bank &amp; Salary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Personal Information</CardTitle>
                <CardDescription className="text-gray-500">Basic personal details of the employee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Employee Code</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.employeeCode} onChange={(e) => handleChange('employeeCode', e.target.value)} placeholder="EMP-001" />
                  </div>
                  <div>
                    <Label className="text-gray-300">ESSL Code</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.esslCode} onChange={(e) => handleChange('esslCode', e.target.value)} placeholder="EMP001" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Email *</Label>
                    <Input type="email" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">First Name *</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-gray-300">Last Name *</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Father&apos;s Name</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.fatherName} onChange={(e) => handleChange('fatherName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-gray-300">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                          <SelectItem key={g} value={g} className="text-white hover:bg-white/10">{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Phone</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Date of Birth</Label>
                    <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-gray-300">Marital Status</Label>
                    <Select value={formData.maritalStatus} onValueChange={(v) => handleChange('maritalStatus', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        {['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].map((s) => (
                          <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Address</Label>
                  <Textarea className="mt-1 border-white/10 bg-white/5 text-white" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label className="text-gray-300">City</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} /></div>
                  <div><Label className="text-gray-300">State</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} /></div>
                  <div><Label className="text-gray-300">Pincode</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)} /></div>
                </div>
                <div>
                  <CardTitle className="text-base text-gray-300 pt-2">Emergency Contact</CardTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Contact Name</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} /></div>
                  <div><Label className="text-gray-300">Contact Phone</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} /></div>
                </div>
                <div className="border-t mt-4 pt-4" style={{ borderColor: '#2D2D2D' }}>
                  <CardTitle className="text-base text-gray-300 mb-3">Account Security</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Set New Password</Label>
                      <Input
                        type="text"
                        className="mt-1 border-white/10 bg-white/5 text-white"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        minLength={6}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        disabled={resetting || !newPassword || newPassword.length < 6}
                        onClick={handleSetPassword}
                        className="text-white"
                        style={{ background: '#8B5CF6' }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {resetting ? 'Saving...' : 'Update Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={sendingEmail || !newPassword || newPassword.length < 6}
                        onClick={handleSendCredentials}
                        className="border-white/10 text-gray-300 hover:text-white"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {sendingEmail ? 'Sending...' : 'Send Credentials Email'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#6B7280' }}>Set a password and optionally email the login credentials to the employee.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Employment Details</CardTitle>
                <CardDescription className="text-gray-500">Job role and employment information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Department *</Label>
                    <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder={loadingDepartments ? 'Loading...' : 'Select department'} />
                      </SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name} className="text-white hover:bg-white/10">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Designation *</Label>
                    <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Employment Type *</Label>
                    <Select value={formData.employmentType} onValueChange={(v) => handleChange('employmentType', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'].map((t) => (
                          <SelectItem key={t} value={t} className="text-white hover:bg-white/10">{t.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Joining Date *</Label>
                    <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-gray-300">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        {['ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED', 'ON_LEAVE'].map((s) => (
                          <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">System Role (Access Level)</Label>
                    <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                      <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1A1A1A' }}>
                        <SelectItem value="EMPLOYEE" className="text-white hover:bg-white/10">Employee</SelectItem>
                        <SelectItem value="HR_MANAGER" className="text-white hover:bg-white/10">HR Manager</SelectItem>
                        <SelectItem value="ADMIN" className="text-white hover:bg-white/10">Admin</SelectItem>
                        <SelectItem value="MANAGER" className="text-white hover:bg-white/10">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Documents &amp; IDs</CardTitle>
                <CardDescription className="text-gray-500">Government IDs and document information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">PAN Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.panNumber} onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())} /></div>
                  <div><Label className="text-gray-300">Aadhaar Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.aadhaarNumber} onChange={(e) => handleChange('aadhaarNumber', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label className="text-gray-300">PF Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.pfNumber} onChange={(e) => handleChange('pfNumber', e.target.value)} /></div>
                  <div><Label className="text-gray-300">UAN Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.uanNumber} onChange={(e) => handleChange('uanNumber', e.target.value)} /></div>
                  <div><Label className="text-gray-300">ESI Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.esiNumber} onChange={(e) => handleChange('esiNumber', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Bank Details</CardTitle>
                <CardDescription className="text-gray-500">Banking information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Bank Name</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.bankName} onChange={(e) => handleChange('bankName', e.target.value)} /></div>
                  <div><Label className="text-gray-300">Account Number</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">IFSC Code</Label><Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.ifscCode} onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" asChild className="text-gray-400 hover:text-white">
            <Link href={`/admin/employees/${params.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="text-white" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Saving...' : 'Update Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}
