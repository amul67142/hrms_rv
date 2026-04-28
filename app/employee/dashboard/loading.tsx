export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#262626' }} />
        <div className="h-4 w-72 rounded animate-pulse mt-2" style={{ background: '#262626' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl animate-pulse" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <div className="p-4">
              <div className="h-3 w-20 rounded" style={{ background: '#262626' }} />
              <div className="h-8 w-12 mt-2 rounded" style={{ background: '#262626' }} />
              <div className="h-2 w-full rounded mt-2" style={{ background: '#262626' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl animate-pulse" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
            <div className="p-4">
              <div className="h-4 w-40 rounded" style={{ background: '#262626' }} />
            </div>
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-12 rounded" style={{ background: '#262626' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
