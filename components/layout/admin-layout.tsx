'use client'

import * as React from 'react'
import { AdminSidebar } from './sidebar'
import { DashboardLayout, PageMeta } from './DashboardLayout'
import { useUserInfo } from '@/lib/core/hooks/use-user-info'

interface AdminLayoutProps {
  children: React.ReactNode
  pageMeta?: Record<string, PageMeta>
  getPageMeta?: (pathname: string) => PageMeta
}

const adminDefaultMeta: Record<string, PageMeta> = {
  '/admin/dashboard': { title: 'Dashboard', subtitle: 'Overview of your HRMS system' },
  '/admin/employees': { title: 'Employees', subtitle: 'Manage employee records' },
  '/admin/employees/add': { title: 'Add Employee', subtitle: 'Create a new employee record' },
  '/admin/employees/import': { title: 'Import Employees', subtitle: 'Bulk import from Excel' },
  '/admin/attendance': { title: 'Attendance', subtitle: 'Daily attendance management' },
  '/admin/attendance/bulk': { title: 'Bulk Attendance', subtitle: 'Upload attendance via Excel' },
  '/admin/leave': { title: 'Leave Management', subtitle: 'Review and manage leave requests' },
  '/admin/leave/calendar': { title: 'Leave Calendar', subtitle: 'View leave calendar' },
  '/admin/payroll': { title: 'Payroll', subtitle: 'Monthly payroll management' },
  '/admin/salary-slips': { title: 'Salary Slips', subtitle: 'Generate and download salary slips' },
  '/admin/reports': { title: 'Reports', subtitle: 'Generate and export reports' },
  '/admin/reports/attendance': { title: 'Attendance Report', subtitle: 'Attendance summary and exports' },
  '/admin/reports/leave': { title: 'Leave Report', subtitle: 'Leave summary and exports' },
  '/admin/reports/payroll': { title: 'Payroll Report', subtitle: 'Payroll summary and exports' },
  '/admin/reports/employees': { title: 'Employee Master Report', subtitle: 'Employee data export' },
  '/admin/holidays': { title: 'Holidays', subtitle: 'Manage company holidays' },
  '/admin/settings': { title: 'Settings', subtitle: 'Company settings and configuration' },
  '/admin/org-chart': { title: 'Org Chart', subtitle: 'Company hierarchy and structure' },
  '/admin/recruitment': { title: 'Recruitment', subtitle: 'Job postings and applicant tracking' },
  '/admin/time-tracker': { title: 'Time Tracker', subtitle: 'Billable hours and project time' },
  '/admin/performance': { title: 'Performance', subtitle: 'Reviews, goals and metrics' },
  '/admin/training': { title: 'Training', subtitle: 'Courses and learning paths' },
  '/admin/documents': { title: 'Documents', subtitle: 'Company document storage' },
  '/admin/announcements': { title: 'Announcements', subtitle: 'Team-wide updates and news' },
  '/admin/help': { title: 'Help & Support', subtitle: 'Documentation and contact support' },
  '/admin/tools': { title: 'Tools & Credentials', subtitle: 'Manage shared tools and credentials' },
  '/admin/tools/add': { title: 'Add Tool', subtitle: 'Add a new tool or credential' },
  '/admin/learning': { title: 'Learning Management', subtitle: 'Manage training modules' },
  '/admin/learning/add': { title: 'Add Learning Module', subtitle: 'Create a new training module' },
  '/admin/essl': { title: 'ESSL Sync', subtitle: 'ESSL device synchronization configuration' },
  '/admin/reimbursements': { title: 'Reimbursements', subtitle: 'Review and manage employee reimbursement requests' },
  '/admin/departments': { title: 'Departments', subtitle: 'Manage departments' },
  '/admin/tasks': { title: 'Task Management', subtitle: 'Assign and track tasks' },
  '/admin/letters': { title: 'HR Letters', subtitle: 'Manage HR letters and documents' },
  '/admin/resignations': { title: 'Resignations', subtitle: 'Manage employee resignation requests' },
  '/admin/tickets': { title: 'Helpdesk', subtitle: 'Manage employee support tickets' },
}

export function AdminLayout({ children, pageMeta, getPageMeta }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const userInfo = useUserInfo('ADMIN', 'AD')

  const sidebar = (
    <AdminSidebar
      collapsed={sidebarCollapsed}
      onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      userInfo={userInfo}
    />
  )

  const mobileSidebar = (
    <AdminSidebar collapsed={false} onToggle={() => {}} userInfo={userInfo} />
  )

  return (
    <DashboardLayout
      sidebar={sidebar}
      mobileSidebar={mobileSidebar}
      userInfo={userInfo}
      defaultMeta={adminDefaultMeta}
      pageMeta={pageMeta}
      getPageMeta={getPageMeta}
      fallbackTitle="HRMS Portal"
    >
      {children}
    </DashboardLayout>
  )
}
