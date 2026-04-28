import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from '@/lib/core/token'

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024 // 10MB

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApiRoute = path.startsWith('/api/')

  // Payload size check for API routes
  if (isApiRoute && request.body) {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Request payload too large (max 10MB)' },
        { status: 413 }
      )
    }
  }

  // Allow NextAuth routes and static assets through without auth
  if (path.startsWith('/api/auth') || path.startsWith('/_next') || path === '/favicon.ico' || path === '/login') {
    return NextResponse.next()
  }

  // Get token from cookie directly
  const token = await getToken({ req: request })

  // No token = unauthorized
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based routing
  // ADMIN, HR_MANAGER, and MANAGER can access /admin routes
  if (path.startsWith('/admin') && token.role !== 'ADMIN' && token.role !== 'HR_MANAGER' && token.role !== 'MANAGER') {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/employee/dashboard', request.url))
  }

  // Admin/HR/Manager: redirect away from employee UI pages (but allow API access for management)
  if (path.startsWith('/employee') && !isApiRoute && (token.role === 'ADMIN' || token.role === 'HR_MANAGER' || token.role === 'MANAGER')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Allow admin/HR/Manager to access employee API routes for management purposes
  if (path.startsWith('/api/employee') && (token.role === 'ADMIN' || token.role === 'HR_MANAGER' || token.role === 'MANAGER')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
