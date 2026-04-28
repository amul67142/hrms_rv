'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="dark min-h-screen flex items-center justify-center" style={{ background: '#0F0F0F' }}>
        <div className="text-center max-w-md mx-auto p-8">
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#F87171"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Error</h1>
          <p className="text-gray-400 mb-6">
            A critical error occurred. Please refresh the page or contact support.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2 rounded-lg font-medium transition-colors"
            style={{ background: '#8B5CF6', color: 'white' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
