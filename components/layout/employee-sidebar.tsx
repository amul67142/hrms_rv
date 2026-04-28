'use client'

import { AppSidebar, NavItem, UserInfo } from './AppSidebar'
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  DollarSign,
  FileText,
  FileInput,
  User,
  UserMinus,
  GraduationCap,
  Wrench,
  CheckSquare,
  Headphones,
} from 'lucide-react'

const employeeNavItems: NavItem[] = [
  { label: 'My Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
  { label: 'My Attendance', href: '/employee/attendance', icon: CalendarCheck },
  { label: 'Leave', href: '/employee/leave', icon: Calendar },
  { label: 'My Salary Slips', href: '/employee/salary-slips', icon: FileText },
  { label: 'Reimbursements', href: '/employee/reimbursements', icon: DollarSign },
  { label: 'Team Tools', href: '/employee/tools', icon: Wrench },
  { label: 'Learning', href: '/employee/learning', icon: GraduationCap },
  { label: 'My Documents', href: '/employee/documents', icon: FileInput },
  { label: 'My Letters', href: '/employee/letters', icon: FileText },
  { label: 'Helpdesk', href: '/employee/tickets', icon: Headphones },
  { label: 'Resignation', href: '/employee/resignation', icon: UserMinus },
  { label: 'My Profile', href: '/employee/profile', icon: User },
]

interface EmployeeSidebarProps {
  collapsed: boolean
  onToggle: () => void
  userInfo?: UserInfo | null
}

export function EmployeeSidebar({ collapsed, onToggle, userInfo }: EmployeeSidebarProps) {
  return (
    <AppSidebar
      collapsed={collapsed}
      onToggle={onToggle}
      userInfo={userInfo}
      navItems={employeeNavItems}
      portalType="Employee"
    />
  )
}
