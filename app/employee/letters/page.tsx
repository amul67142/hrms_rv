'use client'

import * as React from 'react'
import { FileText, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/core/utils'

const TYPE_COLORS: Record<string, string> = {
  OFFER: '#8B5CF6',
  APPOINTMENT: '#3B82F6',
  CONFIRMATION: '#22C55E',
  PROMOTION: '#F59E0B',
  RELIEVING: '#EF4444',
  EXPERIENCE: '#06B6D4',
  OTHER: '#9CA3AF',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6B7280',
  ISSUED: '#8B5CF6',
  ACCEPTED: '#22C55E',
  REJECTED: '#EF4444',
}

interface HRLetter {
  id: string
  employeeId: string
  type: string
  title: string
  content: string | null
  status: string
  issuedAt: string | null
  responseAt: string | null
  createdAt: string
  updatedAt: string
}

export default function EmployeeLettersPage() {
  const { toast } = useToast()
  const [letters, setLetters] = React.useState<HRLetter[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [selectedLetter, setSelectedLetter] = React.useState<HRLetter | null>(null)
  const [responding, setResponding] = React.useState(false)

  const fetchLetters = React.useCallback(async () => {
    try {
      const res = await fetch('/api/letters')
      const data = await res.json()
      if (data.success) setLetters(data.data)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to load letters', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => { fetchLetters() }, [fetchLetters])

  const stats = React.useMemo(() => ({
    total: letters.length,
    pending: letters.filter((l) => l.status === 'ISSUED').length,
    accepted: letters.filter((l) => l.status === 'ACCEPTED').length,
  }), [letters])

  const openView = (letter: HRLetter) => {
    setSelectedLetter(letter)
    setViewDialogOpen(true)
  }

  const handleRespond = async (status: string) => {
    if (!selectedLetter) return
    setResponding(true)
    try {
      const res = await fetch(`/api/letters/${selectedLetter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: `Letter ${status.toLowerCase()}` })
        setViewDialogOpen(false)
        fetchLetters()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to respond', variant: 'destructive' })
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to respond to letter', variant: 'destructive' })
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <p className="text-sm text-gray-400 mb-1">Total Letters</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <div className="mt-2 h-1 rounded-full" style={{ background: '#8B5CF6', width: '40px' }} />
        </div>
        <div className="rounded-xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <p className="text-sm text-gray-400 mb-1">Pending Response</p>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
          <div className="mt-2 h-1 rounded-full" style={{ background: '#F59E0B', width: '40px' }} />
        </div>
        <div className="rounded-xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
          <p className="text-sm text-gray-400 mb-1">Accepted</p>
          <p className="text-2xl font-bold text-white">{stats.accepted}</p>
          <div className="mt-2 h-1 rounded-full" style={{ background: '#22C55E', width: '40px' }} />
        </div>
      </div>

      {/* Letters List */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : letters.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No letters found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2D2D2D' }}>
                {['Type', 'Title', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {letters.map((letter) => (
                <tr key={letter.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: '#2D2D2D' }}>
                  <td className="px-4 py-3">
                    <Badge className="text-white text-xs" style={{ background: TYPE_COLORS[letter.type] || TYPE_COLORS.OTHER }}>
                      {letter.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{letter.title}</td>
                  <td className="px-4 py-3">
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[letter.status] || '#6B7280' }}>
                      {letter.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(letter.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => openView(letter)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Letter Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-white/10 max-w-2xl" style={{ background: '#1A1A1A' }}>
          {selectedLetter && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-white text-lg">{selectedLetter.title}</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1">Letter Type: {selectedLetter.type}</DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-white text-xs" style={{ background: TYPE_COLORS[selectedLetter.type] || TYPE_COLORS.OTHER }}>
                      {selectedLetter.type}
                    </Badge>
                    <Badge className="text-white text-xs" style={{ background: STATUS_COLORS[selectedLetter.status] || '#6B7280' }}>
                      {selectedLetter.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Letter Content</p>
                  <div className="rounded-lg p-4 border text-sm whitespace-pre-wrap leading-relaxed" style={{ background: '#0F0F0F', borderColor: '#2D2D2D', color: '#D1D5DB' }}>
                    {selectedLetter.content || 'No content provided.'}
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-gray-500">
                  <span>Issued: {formatDate(selectedLetter.createdAt)}</span>
                  {selectedLetter.issuedAt && <span>Issued: {formatDate(selectedLetter.issuedAt)}</span>}
                  {selectedLetter.responseAt && <span>Responded: {formatDate(selectedLetter.responseAt)}</span>}
                </div>
                {selectedLetter.status === 'ISSUED' && (
                  <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => handleRespond('REJECTED')} disabled={responding} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button onClick={() => handleRespond('ACCEPTED')} disabled={responding} className="text-white" style={{ background: '#22C55E', borderColor: '#22C55E' }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Accept
                    </Button>
                  </DialogFooter>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
