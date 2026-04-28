'use client'

import * as React from 'react'
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileUpload } from '@/components/file-upload'
import { ExcelPreview } from '@/components/excel-preview'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Step = 1 | 2 | 3 | 4

interface PreviewRow {
  row: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

const previewColumns = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'email', header: 'Email' },
  { key: 'department', header: 'Department' },
  { key: 'designation', header: 'Designation' },
  { key: 'joiningDate', header: 'Joining Date' },
  { key: 'basicSalary', header: 'Basic Salary' },
]

const mockPreviewRows: PreviewRow[] = [
  { row: 1, data: { employeeCode: 'EMP006', firstName: 'Neha', lastName: 'Kapoor', email: 'neha@example.com', department: 'Marketing', designation: 'Marketing Executive', joiningDate: '2024-02-01', basicSalary: '35000' }, errors: [], isValid: true },
  { row: 2, data: { employeeCode: 'EMP007', firstName: 'Rajesh', lastName: 'Verma', email: 'rajesh@example.com', department: 'Sales', designation: 'Sales Manager', joiningDate: '2024-02-15', basicSalary: '45000' }, errors: [], isValid: true },
  { row: 3, data: { employeeCode: 'EMP008', firstName: 'Priya', lastName: 'Singh', email: 'invalid-email', department: 'Finance', designation: 'Accountant', joiningDate: '2024-03-01', basicSalary: '40000' }, errors: ['Invalid email format'], isValid: false },
  { row: 4, data: { employeeCode: 'EMP009', firstName: '', lastName: 'Jain', email: 'jain@example.com', department: 'HR', designation: 'HR Assistant', joiningDate: '2024-03-10', basicSalary: '30000' }, errors: ['First name is required'], isValid: false },
  { row: 5, data: { employeeCode: 'EMP010', firstName: 'Ankit', lastName: 'Mehta', email: 'ankit@example.com', department: 'Engineering', designation: 'Frontend Developer', joiningDate: '2024-03-15', basicSalary: '55000' }, errors: [], isValid: true },
]

export default function ImportEmployeesPage() {
  const { toast } = useToast()
  const [step, setStep] = React.useState<Step>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewRows] = React.useState<PreviewRow[]>(mockPreviewRows)
  const [importing, setImporting] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [importComplete, setImportComplete] = React.useState(false)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setStep(3)
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/employees/template')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'employee_import_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_e) {
      toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setProgress(0)
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200))
      setProgress(i)
    }
    setImportComplete(true)
    setImporting(false)
    toast({ title: 'Success', description: '3 employees imported successfully' })
  }

  const validCount = previewRows.filter((r) => r.isValid).length
  const invalidCount = previewRows.filter((r) => !r.isValid).length

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/employees">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Import Employees</h2>
          <p className="text-sm text-slate-500">Bulk import employees from Excel file</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[
          { num: 1, label: 'Download Template' },
          { num: 2, label: 'Upload File' },
          { num: 3, label: 'Preview Data' },
          { num: 4, label: 'Import' },
        ].map(({ num, label }, idx) => (
          <React.Fragment key={num}>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${step >= num ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > num ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              <span className={`text-sm hidden sm:block ${step >= num ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{label}</span>
            </div>
            {idx < 3 && <div className={`w-8 sm:w-16 h-0.5 ${step > num ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Download Template */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Template</CardTitle>
            <CardDescription>Download the Excel template to fill in employee data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
              <div className="text-center">
                <Download className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-sm text-slate-600 mb-4">Download the employee import template</p>
                <Button onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next: Upload File</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Excel File</CardTitle>
            <CardDescription>Upload the filled Excel template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload accept=".xlsx,.xls,.csv" onFileSelect={handleFileSelect} file={file} onClear={() => setFile(null)} />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              {file && <Button onClick={() => setStep(3)}>Next: Preview Data</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Preview &amp; Validate</CardTitle>
            <CardDescription>Review the data before importing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{validCount} valid rows</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{invalidCount} invalid rows</span>
              </div>
            </div>
            <ExcelPreview
              columns={previewColumns}
              rows={previewRows}
              totalValid={validCount}
              totalInvalid={invalidCount}
              maxDisplayRows={10}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={validCount === 0}>Next: Import</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Import Data</CardTitle>
            <CardDescription>Confirm and import the valid employee records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!importComplete ? (
              <>
                <p className="text-sm text-slate-600">
                  Ready to import <strong>{validCount} employees</strong>. Invalid rows will be skipped.
                </p>
                {importing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-slate-500 text-center">Importing... {progress}%</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)} disabled={importing}>Back</Button>
                  <Button onClick={handleImport} loading={importing} disabled={validCount === 0}>
                    <Upload className="mr-2 h-4 w-4" />
                    Confirm Import
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Complete!</h3>
                <p className="text-sm text-slate-600 mb-6">
                  {validCount} employees have been imported successfully.
                </p>
                <Button asChild>
                  <Link href="/admin/employees">View Employees</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
