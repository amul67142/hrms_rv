'use client'

import { AppSidebar, NavGroup, UserInfo } from './AppSidebar'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  Briefcase,
  Clock,
  Target,
  GraduationCap,
  FolderTree,
  Megaphone,
  HelpCircle,
  Key,
  Database,
  Receipt,
  Network,
  ClipboardList,
  Mail,
  UserX,
  Ticket,
} from 'lucide-react'

const adminNavGroups: NavGroup[] = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Employees', href: '/admin/employees', icon: Users },
      { label: 'Departments', href: '/admin/departments', icon: Network },
      { label: 'Org Chart', href: '/admin/org-chart', icon: FolderTree },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
      { label: 'Leave Management', href: '/admin/leave', icon: Calendar },
      { label: 'Task Management', href: '/admin/tasks', icon: ClipboardList },
      { label: 'Payroll', href: '/admin/payroll', icon: DollarSign },
      { label: 'Salary Slips', href: '/admin/salary-slips', icon: FileText },
      { label: 'Reimbursements', href: '/admin/reimbursements', icon: Receipt },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'HR Letters', href: '/admin/letters', icon: Mail },
      { label: 'Resignations', href: '/admin/resignations', icon: UserX },
      { label: 'Helpdesk', href: '/admin/tickets', icon: Ticket },
      { label: 'Learning Center', href: '/admin/learning', icon: GraduationCap },
      { label: 'Tools & Credentials', href: '/admin/tools', icon: Key },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Holidays', href: '/admin/holidays', icon: Calendar },
      { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
      { label: 'ESSL Sync', href: '/admin/essl', icon: Database },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
  userInfo?: UserInfo | null
}

export function AdminSidebar({ collapsed, onToggle, userInfo }: AdminSidebarProps) {
  return (
    <AppSidebar
      collapsed={collapsed}
      onToggle={onToggle}
      userInfo={userInfo}
      navGroups={adminNavGroups}
      portalType="Admin"
    />
  )
}
