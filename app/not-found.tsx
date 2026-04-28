import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F0F' }}>
      <div className="text-center max-w-md mx-auto p-8">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.1)' }}
        >
          <span className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-lg font-medium transition-colors"
          style={{ background: '#8B5CF6', color: 'white' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
