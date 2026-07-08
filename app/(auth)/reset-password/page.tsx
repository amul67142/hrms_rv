'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!token) {
      setError('Invalid or missing password reset token. Please request a new link.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Failed to reset password. Please try again.')
        setLoading(false)
        return
      }

      setSuccess('Your password has been successfully updated!')
      setLoading(false)
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (_e) {
      setError('An unexpected error occurred. Please try again later.')
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2 text-red-500">
            <AlertCircle className="h-12 w-12" />
          </div>
          <CardTitle className="text-xl text-white">Invalid Reset Session</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            This password reset link is invalid, incomplete, or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mt-2">
            <Link href="/forgot-password" style={{ background: '#8B5CF6' }} className="w-full text-center text-white py-2 px-4 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity">
              Request New Link
            </Link>
          </div>
          <div className="flex items-center justify-center mt-4">
            <Link href="/login" className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-white">Choose new password</CardTitle>
        <CardDescription style={{ color: '#9CA3AF' }}>
          Please enter and confirm your secure new password.
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

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ADE80' }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{success}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Redirecting to Sign In in a few seconds...</p>
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full mt-2" loading={loading}>
                Update Password
              </Button>
            </>
          )}

          <div className="flex items-center justify-center mt-4">
            <Link href="/login" className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
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

      <React.Suspense fallback={
        <Card style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: '#8B5CF6' }}></div>
            <p className="text-gray-400 text-sm">Validating security session...</p>
          </CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </React.Suspense>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: '#6B7280' }}>
          &copy; 2026 Realvibe Digital Media Pvt. Ltd.
        </p>
      </div>
    </div>
  )
}
