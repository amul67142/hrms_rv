'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { EmployeeSidebar } from './employee-sidebar'
import { DashboardLayout, PageMeta } from './DashboardLayout'
import { useUserInfo } from '@/lib/core/hooks/use-user-info'

interface EmployeeLayoutProps {
  children: React.ReactNode
  pageMeta?: Record<string, PageMeta>
  getPageMeta?: (pathname: string) => PageMeta
}

const employeeDefaultMeta: Record<string, PageMeta> = {
  '/employee/dashboard': { title: 'My Dashboard', subtitle: 'Your personal HRMS dashboard' },
  '/employee/attendance': { title: 'My Attendance', subtitle: 'View your attendance record' },
  '/employee/leave': { title: 'My Leave', subtitle: 'View and manage leave requests' },
  '/employee/leave/apply': { title: 'Apply for Leave', subtitle: 'Submit a new leave request' },
  '/employee/salary-slips': { title: 'My Salary Slips', subtitle: 'Download your salary slips' },
  '/employee/reimbursements': { title: 'My Reimbursements', subtitle: 'Submit and track your reimbursement requests' },
  '/employee/reimbursements/submit': { title: 'Submit Reimbursement', subtitle: 'File a new reimbursement request' },
  '/employee/profile': { title: 'My Profile', subtitle: 'View your profile information' },
  '/employee/tools': { title: 'Team Tools', subtitle: 'Shared tools and resources' },
  '/employee/learning': { title: 'Learning Center', subtitle: 'Training modules and educational content' },
  '/employee/documents': { title: 'My Documents', subtitle: 'Upload and manage your personal documents' },
  '/employee/tasks': { title: 'My Tasks', subtitle: 'View and manage your tasks' },
  '/employee/letters': { title: 'My Letters', subtitle: 'View your HR letters and documents' },
  '/employee/tickets': { title: 'Helpdesk', subtitle: 'Submit and track support tickets' },
  '/employee/resignation': { title: 'Resignation', subtitle: 'Submit and track your resignation' },
}

export function EmployeeLayout({ children, pageMeta, getPageMeta }: EmployeeLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const userInfo = useUserInfo('EMPLOYEE', 'EP')
  const pathname = usePathname()
  const router = useRouter()
  const [profileComplete, setProfileComplete] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const emp = d.data
          const complete = emp.profileCompleted &&
            emp.phone && emp.gender && emp.dateOfBirth &&
            emp.address && emp.emergencyContactName && emp.emergencyContactPhone
          setProfileComplete(!!complete)
          if (!complete && pathname !== '/employee/profile') {
            router.push('/employee/profile')
          }
        }
      })
      .catch(() => setProfileComplete(true)) // fail open
  }, [pathname, router])

  const sidebar = (
    <EmployeeSidebar
      collapsed={sidebarCollapsed}
      onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      userInfo={userInfo}
    />
  )

  const mobileSidebar = (
    <EmployeeSidebar collapsed={false} onToggle={() => {}} userInfo={userInfo} />
  )

  return (
    <DashboardLayout
      sidebar={sidebar}
      mobileSidebar={mobileSidebar}
      userInfo={userInfo}
      defaultMeta={employeeDefaultMeta}
      pageMeta={pageMeta}
      getPageMeta={getPageMeta}
      fallbackTitle="Employee Portal"
    >
      {/* Persistent incomplete-profile banner shown on all pages except /profile */}
      {profileComplete === false && pathname !== '/employee/profile' && (
        <div
          className="mb-5 rounded-xl p-3.5 flex items-center gap-3"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#EAB308' }} />
          <p className="text-sm flex-1" style={{ color: '#EAB308' }}>
            Your profile is incomplete. Please{' '}
            <button
              className="underline font-medium"
              onClick={() => router.push('/employee/profile')}
            >
              complete your profile
            </button>{' '}
            to unlock all features.
          </p>
        </div>
      )}
      {children}
    </DashboardLayout>
  )
}
