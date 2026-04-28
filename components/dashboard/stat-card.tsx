'use client'

import * as React from 'react'
import { cn } from '@/lib/core/utils'

const gradients = [
  { bg: 'linear-gradient(135deg, #7c3aed, #8B5CF6)', glow: 'rgba(139,92,246,0.25)', icon: 'rgba(255,255,255,0.15)' },
  { bg: 'linear-gradient(135deg, #0891b2, #0e7490)', glow: 'rgba(8,145,178,0.25)', icon: 'rgba(255,255,255,0.15)' },
  { bg: 'linear-gradient(135deg, #059669, #047857)', glow: 'rgba(5,150,105,0.25)', icon: 'rgba(255,255,255,0.15)' },
  { bg: 'linear-gradient(135deg, #d97706, #b45309)', glow: 'rgba(217,119,6,0.25)', icon: 'rgba(255,255,255,0.15)' },
  { bg: 'linear-gradient(135deg, #db2777, #be185d)', glow: 'rgba(219,39,119,0.25)', icon: 'rgba(255,255,255,0.15)' },
]

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  changeLabel?: string
  className?: string
  colorIndex?: number
}

export function StatCard({ title, value, icon: Icon, changeLabel, className, colorIndex }: StatCardProps) {
  const idx = colorIndex !== undefined ? colorIndex % gradients.length : 0
  const grad = gradients[idx]

  return (
    <div className={cn('relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1', className)}
      style={{
        background: '#1A1A1A',
        border: '1px solid #2D2D2D',
        boxShadow: `0 8px 32px ${grad.glow}`,
      }}>
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
            {changeLabel && <span className="text-xs text-gray-500 mt-1 block">{changeLabel}</span>}
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
            style={{ background: grad.bg }}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
