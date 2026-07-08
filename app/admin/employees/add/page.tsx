'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function AddEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = React.useState(false)
  const [departments, setDepartments] = React.useState<{ id: string; name: string }[]>([])
  const [loadingDepartments, setLoadingDepartments] = React.useState(true)
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    role: 'EMPLOYEE',
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()
      if (result.success) {
        // If role is not EMPLOYEE, update it
        if (formData.role !== 'EMPLOYEE' && result.data?.id) {
          await fetch(`/api/employees/${result.data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: formData.role }),
          })
        }
        toast({ title: 'Success', description: 'Employee created successfully' })
        router.push('/admin/employees')
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to create employee', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to create employee', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white">
          <Link href="/admin/employees">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Add Employee</h2>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Create a new employee account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-white/10" style={{ background: '#1A1A1A' }}>
          <CardHeader>
            <CardTitle className="text-white text-base">Employee Details</CardTitle>
            <CardDescription className="text-gray-500">Fill in the essential details. The employee can complete the rest from their profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">First Name *</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} required placeholder="John" />
              </div>
              <div>
                <Label className="text-gray-300">Last Name *</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} required placeholder="Doe" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Email *</Label>
                <Input type="email" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required placeholder="john@company.com" />
              </div>
              <div>
                <Label className="text-gray-300">Password *</Label>
                <Input type="password" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} required placeholder="Min 6 characters" minLength={6} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Phone</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="9876543210" />
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Designation *</Label>
                <Input className="mt-1 border-white/10 bg-white/5 text-white" value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} required placeholder="Software Engineer" />
              </div>
              <div>
                <Label className="text-gray-300">Joining Date *</Label>
                <Input type="date" className="mt-1 border-white/10 bg-white/5 text-white" value={formData.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Employment Type</Label>
                <Select value={formData.employmentType} onValueChange={(v) => handleChange('employmentType', v)}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A' }}>
                    {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'].map((t) => (
                      <SelectItem key={t} value={t} className="text-white hover:bg-white/10">{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A' }}>
                    {['ACTIVE', 'INACTIVE'].map((s) => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">System Role</Label>
                <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1A1A1A' }}>
                    <SelectItem value="EMPLOYEE" className="text-white hover:bg-white/10">Employee</SelectItem>
                    <SelectItem value="HR_MANAGER" className="text-white hover:bg-white/10">HR Manager</SelectItem>
                    <SelectItem value="MANAGER" className="text-white hover:bg-white/10">Manager</SelectItem>
                    <SelectItem value="ADMIN" className="text-white hover:bg-white/10">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" asChild className="text-gray-400 hover:text-white">
            <Link href="/admin/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="text-white" style={{ background: '#8B5CF6' }}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}
