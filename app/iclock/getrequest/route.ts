import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export const dynamic = 'force-dynamic'

/**
 * GET /iclock/getrequest — Device command polling
 *
 * The device polls this endpoint periodically asking: "Do you have any commands for me?"
 * Commands could be: remote door open, user enrollment, device reboot, etc.
 *
 * For now, we always respond with "OK" (no pending commands).
 * To send commands to the device, you would respond with the command string instead.
 *
 * Example commands (for future use):
 *   "C:ID1:DATA UPDATE USERINFO PIN=1\tName=John\tPri=0"
 *   "C:ID2:CONTROL DEVICE 1 0"  (door open)
 *   "C:ID3:REBOOT"
 *   "C:ID4:CLEAR LOG"
 */
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get('SN') || 'UNKNOWN'

  // Log request for debugging (less verbose — don't log every poll to avoid DB bloat)
  // Only log occasionally or when debugging
  try {
    // Log 1 in 10 getrequest polls to avoid flooding the raw_logs table
    if (Math.random() < 0.1) {
      await prisma.biometricRawLog.create({
        data: {
          deviceSn: sn,
          endpoint: '/iclock/getrequest',
          method: 'GET',
          queryParams: request.nextUrl.search,
          body: null,
        },
      })
    }
  } catch (e) {
    // Non-critical — ignore logging failures
  }

  // No pending commands
  return new NextResponse('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
