'use client'

import { BookOpen, Sparkles } from 'lucide-react'

export default function TrainingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #db277722, #db277744)' }}>
        <BookOpen className="w-10 h-10" style={{ color: '#db2777' }} />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
        style={{ background: '#db277715', color: '#db2777' }}>
        <Sparkles className="w-3 h-3" />
        Coming Soon
      </div>
      <h1 className="text-3xl font-extrabold mb-3"
        style={{ background: 'linear-gradient(135deg, #1a0533, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Training
      </h1>
      <p className="text-slate-500 max-w-md text-sm leading-relaxed">
        Courses, certifications and learning paths — this feature is under development and will be available soon.
      </p>
    </div>
  )
}
