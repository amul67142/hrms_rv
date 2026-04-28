'use client'

import { HelpCircle, Sparkles } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #05966922, #05966944)' }}>
        <HelpCircle className="w-10 h-10" style={{ color: '#059669' }} />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
        style={{ background: '#05966915', color: '#059669' }}>
        <Sparkles className="w-3 h-3" />
        Coming Soon
      </div>
      <h1 className="text-3xl font-extrabold mb-3"
        style={{ background: 'linear-gradient(135deg, #1a0533, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Help & Support
      </h1>
      <p className="text-slate-500 max-w-md text-sm leading-relaxed">
        Documentation, FAQs and contact support — this feature is under development and will be available soon.
      </p>
    </div>
  )
}
