import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAuthToken } from '@/lib/core/token'

export default async function HomePage() {
  const authCookie = cookies().get('auth_token')?.value
  const session = await verifyAuthToken(authCookie)

  if (session) {
    if (session.role === 'EMPLOYEE') {
      redirect('/employee/dashboard')
    } else {
      redirect('/admin/dashboard')
    }
  } else {
    redirect('/login')
  }
}
