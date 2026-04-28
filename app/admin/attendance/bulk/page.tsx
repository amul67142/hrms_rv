'use client'

import * as React from 'react'
import { Download, Upload, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/file-upload'
import { ExcelPreview } from '@/components/excel-preview'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

interface PreviewRow {
  row: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

const previewColumns = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'date', header: 'Date' },
  { key: 'status', header: 'Status' },
  { key: 'checkIn', header: 'Check In' },
  { key: 'checkOut', header: 'Check Out' },
]

const mockRows: PreviewRow[] = [
  { row: 1, data: { employeeCode: 'EMP001', date: '2024-04-01', status: 'PRESENT', checkIn: '09:15', checkOut: '18:30' }, errors: [], isValid: true },
  { row: 2, data: { employeeCode: 'EMP002', date: '2024-04-01', status: 'PRESENT', checkIn: '09:00', checkOut: '18:00' }, errors: [], isValid: true },
  { row: 3, data: { employeeCode: 'EMP003', date: '2024-04-01', status: 'ABSENT', checkIn: '-', checkOut: '-' }, errors: [], isValid: true },
]

export default function BulkAttendancePage() {
  const { toast } = useToast()
  const [file, setFile] = React.useState<File | null>(null)
  const [step, setStep] = React.useState<'upload' | 'preview'>('upload')
  const [previewRows] = React.useState<PreviewRow[]>(mockRows)

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/attendance/template')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'attendance_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    await new Promise((r) => setTimeout(r, 1000))
    toast({ title: 'Success', description: 'Attendance imported successfully' })
    setFile(null)
    setStep('upload')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/attendance">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bulk Attendance Upload</h2>
          <p className="text-sm text-slate-500">Upload attendance data via Excel</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>Download the attendance template and fill in the data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
            <div className="text-center">
              <Download className="h-10 w-10 mx-auto mb-3 text-slate-400" />
              <p className="text-sm text-slate-600 mb-3">Download the attendance upload template</p>
              <Button onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload your filled attendance Excel file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload accept=".xlsx,.xls,.csv" onFileSelect={(f) => { setFile(f); setStep('preview') }} file={file} onClear={() => { setFile(null); setStep('upload') }} />
          {step === 'preview' && file && (
            <>
              <ExcelPreview columns={previewColumns} rows={previewRows} totalValid={2} totalInvalid={1} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setFile(null); setStep('upload') }}>Back</Button>
                <Button onClick={handleImport}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Attendance
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
