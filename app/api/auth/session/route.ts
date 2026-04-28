import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json({})
  }

  return NextResponse.json({
    user: {
      id: token.sub,
      email: token.email,
      role: token.role,
      employeeId: token.employeeId,
      department: token.department ?? null,
      status: token.status ?? null,
    },
  })
}
