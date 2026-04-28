export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 rounded animate-pulse" style={{ background: '#262626' }} />
        <div className="h-9 w-32 rounded animate-pulse" style={{ background: '#262626' }} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <div className="p-3 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded animate-pulse" style={{ background: '#262626' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
