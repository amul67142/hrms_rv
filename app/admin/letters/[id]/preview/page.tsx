'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Printer, FileText, Loader2 } from 'lucide-react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface LetterData {
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
  employee?: {
    firstName: string
    lastName: string
    email: string
    employeeCode: string
    department: string
    designation: string
    joiningDate: string
  }
}

interface CompanySettings {
  companyName: string
  companyAddress: string
  phone?: string
  email?: string
}

const TYPE_COLORS: Record<string, string> = {
  OFFER: '#8B5CF6',
  APPOINTMENT: '#3B82F6',
  CONFIRMATION: '#22C55E',
  PROMOTION: '#F59E0B',
  RELIEVING: '#EF4444',
  EXPERIENCE: '#06B6D4',
  OTHER: '#9CA3AF',
}

export default function LetterPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [letter, setLetter] = React.useState<LetterData | null>(null)
  const [companySettings, setCompanySettings] = React.useState<CompanySettings>({ companyName: 'Company', companyAddress: '' })
  const [loading, setLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)
  const [renderedContent, setRenderedContent] = React.useState('')

  const letterId = params.id as string

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [letterRes, settingsRes] = await Promise.all([
          fetch(`/api/letters/${letterId}`),
          fetch('/api/settings/company'),
        ])
        const letterData = await letterRes.json()
        const settingsData = await settingsRes.json()
        if (letterData.success) setLetter(letterData.data)
        if (settingsData.success) setCompanySettings(settingsData.data)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [letterId])

  React.useEffect(() => {
    if (letter && companySettings) {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      const joiningDate = letter.employee?.joiningDate
        ? new Date(letter.employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '{{joining_date}}'

      const content = letter.content || ''
      const rendered = content
        .replace(/\{\{employee_name\}\}/g, letter.employee ? `${letter.employee.firstName} ${letter.employee.lastName}` : '[Employee Name]')
        .replace(/\{\{employee_code\}\}/g, letter.employee?.employeeCode || '[Employee Code]')
        .replace(/\{\{department\}\}/g, letter.employee?.department || '[Department]')
        .replace(/\{\{designation\}\}/g, letter.employee?.designation || '[Designation]')
        .replace(/\{\{joining_date\}\}/g, joiningDate)
        .replace(/\{\{company_name\}\}/g, companySettings.companyName)
        .replace(/\{\{company_address\}\}/g, companySettings.companyAddress || '[Company Address]')
        .replace(/\{\{current_date\}\}/g, today)

      setRenderedContent(rendered)
    }
  }, [letter, companySettings])

  const generatePDF = async () => {
    if (!letter) return
    setExporting(true)

    try {
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89])
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

      const { width, height } = page.getSize()
      const margin = 72
      const contentWidth = width - margin * 2
      let y = height - margin

      const fontSize = 11
      const lineHeight = 16

      const addText = (text: string, size: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
        const currentFont = isBold ? boldFont : font
        const textWidth = currentFont.widthOfTextAtSize(text, size)
        let x = margin
        if (align === 'center') x = (width - textWidth) / 2
        if (align === 'right') x = width - margin - textWidth

        page.drawText(text, { x, y, size, font: currentFont, color: rgb(0.067, 0.067, 0.067) })
        y -= lineHeight
      }

      const addWrappedText = (text: string, size: number) => {
        const words = text.split(' ')
        let line = ''
        const lines: string[] = []

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, size)
          if (testWidth > contentWidth) {
            lines.push(line)
            line = word
          } else {
            line = testLine
          }
        }
        if (line) lines.push(line)

        for (const l of lines) {
          page.drawText(l, { x: margin, y, size, font, color: rgb(0.067, 0.067, 0.067) })
          y -= lineHeight
        }
      }

      addText(companySettings.companyName, 16, true, 'center')
      if (companySettings.companyAddress) {
        addText(companySettings.companyAddress, 9, false, 'center')
      }
      y -= 10

      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      })
      y -= 30

      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      addText(`Date: ${today}`, 10, false, 'right')
      y -= 30

      if (letter.title) {
        addText(letter.title, 14, true, 'center')
        y -= 20
      }

      if (letter.employee) {
        addText(`${letter.employee.firstName} ${letter.employee.lastName}`, fontSize, false)
        addText(`${letter.employee.employeeCode}`, 10, false)
        addText(`${letter.employee.department}`, 10, false)
        addText(`${letter.employee.designation}`, 10, false)
        y -= 20
      }

      const contentLines = renderedContent.split('\n')
      for (const line of contentLines) {
        if (y < margin + 50) {
          const newPage = pdfDoc.addPage([595.28, 841.89])
          y = newPage.getSize().height - margin
        }
        if (line.trim()) {
          addWrappedText(line, fontSize)
        } else {
          y -= 8
        }
      }

      y -= 40
      if (y < margin + 100) {
        const newPage = pdfDoc.addPage([595.28, 841.89])
        y = newPage.getSize().height - margin
      }

      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })
      y -= 20

      addText('Authorized Signatory', 10, false)
      addText(companySettings.companyName, 9, false)

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}_${letter.employee ? letter.employee.employeeCode : 'template'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF generation failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3" style={{ color: '#9CA3AF' }}>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading letter...</span>
        </div>
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FileText className="h-12 w-12" style={{ color: '#374151' }} />
        <p style={{ color: '#6B7280' }}>Letter not found</p>
        <Button onClick={() => router.back()} variant="outline" style={{ background: 'transparent', borderColor: '#2D2D2D', color: '#9CA3AF' }}>
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white">{letter.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-white text-xs" style={{ background: TYPE_COLORS[letter.type] || TYPE_COLORS.OTHER }}>
                {letter.type}
              </Badge>
              {letter.employee && (
                <span className="text-sm" style={{ color: '#9CA3AF' }}>
                  {letter.employee.firstName} {letter.employee.lastName} ({letter.employee.employeeCode})
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-gray-300"
            style={{ background: 'transparent', borderColor: '#2D2D2D' }}
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button
            onClick={generatePDF}
            disabled={exporting}
            className="text-white"
            style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div id="letter-content" className="p-12 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{companySettings.companyName}</h1>
            {companySettings.companyAddress && (
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{companySettings.companyAddress}</p>
            )}
          </div>

          <div className="border-b border-gray-200 pb-6 mb-6">
            <p className="text-right text-sm" style={{ color: '#6B7280' }}>
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {letter.employee && (
            <div className="mb-6">
              <p className="font-medium" style={{ color: '#111827' }}>
                {letter.employee.firstName} {letter.employee.lastName}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>Employee Code: {letter.employee.employeeCode}</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>{letter.employee.department}</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>{letter.employee.designation}</p>
            </div>
          )}

          {letter.title && (
            <h2 className="text-lg font-bold mb-4 text-center" style={{ color: '#111827' }}>{letter.title}</h2>
          )}

          <div className="whitespace-pre-wrap leading-relaxed" style={{ color: '#374151', fontFamily: 'Times New Roman, serif', fontSize: '14px', lineHeight: '1.8' }}>
            {renderedContent}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="font-medium" style={{ color: '#374151' }}>Authorized Signatory</p>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{companySettings.companyName}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #letter-content, #letter-content * {
            visibility: visible;
          }
          #letter-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
        }
      `}</style>
    </div>
  )
}
