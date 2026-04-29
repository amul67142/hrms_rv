import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import { prisma } from '@/lib/core/db'
import { decrypt } from '@/lib/core/crypto'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Per-request token store (auto-cleanup after 60 seconds)
const tokenStore = new Map<string, { password: string; expiresAt: number }>()

function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token)
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    cleanupExpiredTokens()

    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const encryptedPassword = tool.encryptedPassword
    if (!encryptedPassword) {
      return NextResponse.json({ success: false, error: 'No encrypted password on this tool' }, { status: 404 })
    }

    // Decrypt and store in a one-time token (never returned in same response)
    const decrypted = decrypt(encryptedPassword)
    const oneTimeToken = crypto.randomBytes(32).toString('base64url')
    const expiresAt = Date.now() + 60000 // 60 seconds

    tokenStore.set(oneTimeToken, { password: decrypted, expiresAt })

    // Schedule cleanup
    setTimeout(() => { tokenStore.delete(oneTimeToken) }, 60000)

    return NextResponse.json({
      success: true,
      message: 'Password stored securely. Retrieve within 60 seconds using the token.',
      token: oneTimeToken,
    })
  } catch (error) {
    console.error('POST /api/tools/[id]/decrypt error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const oneTimeToken = searchParams.get('token')

    if (!oneTimeToken) {
      return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 })
    }

    const stored = tokenStore.get(oneTimeToken)
    if (!stored) {
      return NextResponse.json({ success: false, error: 'Token not found or expired' }, { status: 404 })
    }

    // Delete token immediately (one-time use)
    tokenStore.delete(oneTimeToken)

    return NextResponse.json({ success: true, password: stored.password })
  } catch (error) {
    console.error('GET /api/tools/[id]/decrypt error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
