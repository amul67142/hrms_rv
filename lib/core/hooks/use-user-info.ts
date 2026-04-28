'use client'

import * as React from 'react'
import { UserInfo } from '@/components/layout/AppSidebar'

export function useUserInfo(defaultRole: string, defaultInitials: string) {
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null)

  React.useEffect(() => {
    async function loadUser() {
      try {
        const [sessionRes, meRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/me'),
        ])
        const session = await sessionRes.json()
        const me = await meRes.json()

        const sessionUser = session?.user
        const employee = me?.success ? me.data : null

        const firstName = employee?.firstName || ''
        const lastName = employee?.lastName || ''
        const name = employee
          ? `${firstName} ${lastName}`.trim()
          : sessionUser?.email?.split('@')[0] || (defaultRole === 'ADMIN' ? 'Admin User' : 'Employee')
        
        const initials = firstName && lastName
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase()

        setUserInfo({
          name,
          email: sessionUser?.email || '',
          role: sessionUser?.role || defaultRole,
          initials,
          profileImage: employee?.profileImage || null,
        })
      } catch {
        setUserInfo({
          name: defaultRole === 'ADMIN' ? 'Admin User' : 'Employee',
          email: '',
          role: defaultRole,
          initials: defaultInitials,
          profileImage: null,
        })
      }
    }
    loadUser()
  }, [defaultRole, defaultInitials])

  return userInfo
}
