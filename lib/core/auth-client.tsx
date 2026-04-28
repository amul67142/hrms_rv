'use client'

import * as React from 'react'

type SessionUser = {
  id: string
  email: string
  role: string
  employeeId: string | null
  department?: string | null
  status?: string | null
}

type SessionData = {
  user: SessionUser
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function useSession() {
  const [data, setData] = React.useState<SessionData | null>(null)
  const [status, setStatus] = React.useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const json = await res.json()
        if (!mounted) return
        if (json?.user) {
          setData(json)
          setStatus('authenticated')
        } else {
          setData(null)
          setStatus('unauthenticated')
        }
      } catch {
        if (!mounted) return
        setData(null)
        setStatus('unauthenticated')
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return { data, status }
}

export async function signIn(
  _provider: string,
  options: { email: string; password: string; redirect?: boolean; callbackUrl?: string }
) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: options.email, password: options.password }),
  })
  const json = await res.json().catch(() => ({}))
  return {
    ok: res.ok,
    error: res.ok ? undefined : (json?.error || 'Login failed'),
    url: options.callbackUrl || '/',
  }
}

export async function signOut(options?: { callbackUrl?: string }) {
  await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
  if (typeof window !== 'undefined') {
    window.location.href = options?.callbackUrl || '/login'
  }
  return { url: options?.callbackUrl || '/login' }
}
