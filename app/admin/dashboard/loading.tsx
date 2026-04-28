export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="h-8 w-32 rounded animate-pulse" style={{ background: '#262626' }} />
          <div className="h-4 w-56 rounded animate-pulse mt-2" style={{ background: '#262626' }} />
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #1E1530 100%)', border: '1px solid #2D2D2D' }}>
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#262626' }} />
        <div className="h-4 w-72 rounded animate-pulse mt-2" style={{ background: '#262626' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <div className="p-5">
              <div className="h-3 w-24 rounded" style={{ background: '#262626' }} />
              <div className="h-9 w-16 mt-3 rounded" style={{ background: '#262626' }} />
              <div className="h-3 w-32 mt-3 rounded" style={{ background: '#262626' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <div className="p-4">
              <div className="h-4 w-40 rounded" style={{ background: '#262626' }} />
            </div>
            <div className="h-[280px]" style={{ background: '#262626' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
