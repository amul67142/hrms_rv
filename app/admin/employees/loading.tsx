export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded animate-pulse" style={{ background: '#262626' }} />
        <div className="h-9 w-28 rounded animate-pulse" style={{ background: '#262626' }} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-40 rounded animate-pulse" style={{ background: '#262626' }} />
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <div className="p-3" style={{ borderBottom: '1px solid #2D2D2D' }}>
          <div className="flex gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 w-20 rounded animate-pulse" style={{ background: '#262626' }} />
            ))}
          </div>
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="p-3" style={{ borderBottom: row < 4 ? '1px solid #1F1F1F' : 'none' }}>
            <div className="flex gap-4 items-center">
              {[0, 1, 2, 3, 4, 5].map((col) => (
                <div key={col} className="h-3 rounded animate-pulse" style={{ background: '#262626', width: col === 0 ? '120px' : col === 1 ? '100px' : '80px' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
