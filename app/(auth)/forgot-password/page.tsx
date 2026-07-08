'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Failed to send reset link. Please try again.')
        setLoading(false)
        return
      }

      setSuccess(data?.message || 'If the email exists, a reset link has been sent.')
      setEmail('')
      setLoading(false)
    } catch (_e) {
      setError('An unexpected error occurred. Please try again later.')
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
          <CardTitle className="text-xl text-white">Reset password</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            We'll email you a link to reset your password.
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
                <span>{success}</span>
              </div>
            )}

            {!success && (
              <>
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

                <Button type="submit" className="w-full mt-2" loading={loading}>
                  Send reset link
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

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: '#6B7280' }}>
          &copy; 2026 Realvibe Digital Media Pvt. Ltd.
        </p>
      </div>
    </div>
  )
}
