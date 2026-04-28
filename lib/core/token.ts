import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'auth_token'
const TOKEN_TTL_SECONDS = 8 * 60 * 60

export type AuthTokenPayload = {
  sub: string
  email: string
  role: string
  employeeId: string | null
  department?: string | null
  status?: string | null
  exp: number
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-insecure-secret'
}

/**
 * Signs data using Web Crypto API HMAC-SHA256.
 * Works in both Node.js runtime AND Edge runtime (Next.js middleware).
 */
async function signAsync(data: string): Promise<string> {
  const secret = getAuthSecret()
  const enc = new TextEncoder()
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await globalThis.crypto.subtle.sign('HMAC', keyMaterial, enc.encode(data))
  return Buffer.from(signature).toString('base64url')
}

export async function createAuthToken(payload: Omit<AuthTokenPayload, 'exp'>): Promise<string> {
  const fullPayload: AuthTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const encoded = base64UrlEncode(JSON.stringify(fullPayload))
  const signature = await signAsync(encoded)
  return `${encoded}.${signature}`
}

export async function verifyAuthToken(token: string | null | undefined): Promise<AuthTokenPayload | null> {
  if (!token) return null

  const dotIndex = token.lastIndexOf('.')
  if (dotIndex < 0) return null

  const encoded = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)
  if (!encoded || !signature) return null

  const expected = await signAsync(encoded)

  // Constant-time comparison using Web Crypto
  const sigBuf = Buffer.from(signature, 'base64url')
  const expBuf = Buffer.from(expected, 'base64url')

  if (sigBuf.length !== expBuf.length) return null

  let mismatch = 0
  for (let i = 0; i < sigBuf.length; i++) {
    mismatch |= sigBuf[i] ^ expBuf[i]
  }
  if (mismatch !== 0) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AuthTokenPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function extractCookieToken(req: NextRequest): string | null {
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value
  if (fromCookie) return fromCookie

  const cookieHeader = req.headers.get('cookie') || ''
  const found = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))

  return found ? decodeURIComponent(found.slice(`${AUTH_COOKIE_NAME}=`.length)) : null
}

export async function getToken({ req }: { req: NextRequest; secret?: string }) {
  const raw = extractCookieToken(req)
  return verifyAuthToken(raw)
}

export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  }
}
