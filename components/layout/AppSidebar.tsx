'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/core/auth-client'
import { ChevronLeft, ChevronRight, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/core/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface UserInfo {
  name: string
  email: string
  role: string
  initials: string
  profileImage?: string | null
}

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  userInfo?: UserInfo | null
  navItems?: NavItem[]
  navGroups?: NavGroup[]
  portalType?: 'Admin' | 'Employee'
}

export function AppSidebar({
  collapsed,
  onToggle,
  userInfo,
  navItems,
  navGroups,
  portalType = 'Employee',
}: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || (pathname.startsWith(item.href) && (item.href.endsWith('/') || pathname.charAt(item.href.length) === '/'))
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 relative group',
          collapsed && 'justify-center px-2',
          isActive ? 'text-white' : 'text-gray-400 hover:text-white'
        )}
        style={isActive ? {
          background: 'rgba(124, 58, 237, 0.2)',
          color: '#A78BFA',
          borderLeft: '3px solid #7C3AED',
          paddingLeft: '10px',
        } : {}}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
            style={{ background: '#8B5CF6' }} />
        )}
        <Icon className={cn('flex-shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')}
          style={{ color: isActive ? '#A78BFA' : undefined }} />
        {!collapsed && <span className="truncate text-sm font-medium">{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-300 relative',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
      style={{ background: '#1A1A1A', borderRight: '1px solid #2D2D2D' }}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-16 border-b', collapsed ? 'px-4 justify-center' : 'px-5')}
        style={{ borderColor: '#2D2D2D' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
            <span className="text-white font-bold text-sm">R</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate">Realvibe HRM</span>
              <span className="text-[10px] truncate" style={{ color: '#A78BFA' }}>{portalType} Portal</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <div className="space-y-4 px-3">
          {navGroups ? (
            navGroups.map((group) => (
              <div key={group.title} className="mb-4">
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex items-center justify-between w-full px-3 mb-2 group"
                  >
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-50 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#6D28D9' }}>
                      {group.title}
                    </span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', collapsedGroups[group.title] ? '-rotate-90' : '')}
                      style={{ color: '#6D28D9' }} />
                  </button>
                )}
                {collapsed && <div className="h-px mx-2 mb-2 mt-1" style={{ background: 'rgba(109,40,217,0.2)' }} />}
                {!collapsedGroups[group.title] && group.items.map(renderNavItem)}
              </div>
            ))
          ) : (
            <nav className="space-y-1">
              {navItems?.map(renderNavItem)}
            </nav>
          )}
        </div>
      </ScrollArea>

      {/* User info */}
      <div className={cn('px-3 py-4 border-t', collapsed && 'px-2')} style={{ borderColor: '#2D2D2D' }}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="text-white text-xs font-bold" style={{ background: '#8B5CF6' }}>
              {userInfo?.initials || '...'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <span className="text-sm font-semibold text-white truncate">{userInfo?.name || 'Loading...'}</span>
              <span className="text-[10px] truncate" style={{ color: '#A78BFA' }}>{userInfo?.role || userInfo?.email || 'Loading...'}</span>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white flex-shrink-0"
              onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="px-3 pb-3">
        <Button variant="ghost" size="sm" onClick={onToggle}
          className="w-full justify-center text-gray-500 hover:text-white rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <><ChevronLeft className="h-4 w-4 mr-2" /><span className="text-xs">Collapse</span></>
          )}
        </Button>
      </div>
    </aside>
  )
}
