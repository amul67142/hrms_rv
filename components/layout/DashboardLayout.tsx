'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserInfo } from './AppSidebar'

export interface PageMeta {
  title: string
  subtitle?: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  mobileSidebar: React.ReactNode
  userInfo: UserInfo | null
  defaultMeta: Record<string, PageMeta>
  pageMeta?: Record<string, PageMeta>
  getPageMeta?: (pathname: string) => PageMeta
  fallbackTitle: string
}

export function DashboardLayout({
  children,
  sidebar,
  mobileSidebar,
  userInfo,
  defaultMeta,
  pageMeta,
  getPageMeta,
  fallbackTitle,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const pathname = usePathname()

  const metaMap = { ...defaultMeta, ...(pageMeta || {}) }

  function resolveMeta(path: string): PageMeta {
    if (getPageMeta) {
      return getPageMeta(path)
    }
    for (const [pathKey, meta] of Object.entries(metaMap)) {
      if (path.startsWith(pathKey)) {
        return meta
      }
    }
    return { title: fallbackTitle }
  }

  const meta = resolveMeta(pathname)

  // Auto-close mobile menu on path change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0F0F0F' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {sidebar}
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {mobileSidebar}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setMobileOpen(true)}
          userInfo={userInfo}
        />
        <ScrollArea className="flex-1">
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </ScrollArea>
      </div>
    </div>
  )
}
