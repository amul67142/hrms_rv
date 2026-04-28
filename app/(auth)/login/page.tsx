'use client'

import * as React from 'react'
import { signIn } from '@/lib/core/auth-client'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Establish NextAuth session
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Step 2: Redirect based on role
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      const role = sessionData?.user?.role || 'EMPLOYEE'

      if (role === 'ADMIN' || role === 'HR_MANAGER') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
      router.refresh()
    } catch (_e) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo area */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>Realvibe</h1>
            <p className="text-sm text-gray-400">HRM</p>
          </div>
        </div>
      </div>

      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-white">Welcome back</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-end">
              <span className="text-sm text-gray-500">
                Contact HR to reset password
              </span>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: '#6B7280' }}>
          &copy; 2026 Realvibe Digital Media Pvt. Ltd.
        </p>
      </div>
    </div>
  )
}
