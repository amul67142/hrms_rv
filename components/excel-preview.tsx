'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/core/utils'

interface PreviewColumn {
  key: string
  header: string
}

interface PreviewRow {
  row: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

interface ExcelPreviewProps {
  columns: PreviewColumn[]
  rows: PreviewRow[]
  totalValid?: number
  totalInvalid?: number
  maxDisplayRows?: number
}

export function ExcelPreview({
  columns,
  rows,
  totalValid,
  totalInvalid,
  maxDisplayRows = 10,
}: ExcelPreviewProps) {
  const displayRows = rows.slice(0, maxDisplayRows)
  const hasMore = rows.length > maxDisplayRows

  return (
    <div className="space-y-4">
      {/* Summary */}
      {(totalValid !== undefined || totalInvalid !== undefined) && (
        <div className="flex items-center gap-4">
          {totalValid !== undefined && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-400">
                <span className="font-semibold" style={{ color: '#22C55E' }}>{totalValid}</span> valid rows
              </span>
            </div>
          )}
          {totalInvalid !== undefined && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-400">
                <span className="font-semibold" style={{ color: '#EF4444' }}>{totalInvalid}</span> invalid rows
              </span>
            </div>
          )}
          {hasMore && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Showing first {maxDisplayRows} of {rows.length} rows
            </Badge>
          )}
        </div>
      )}

      {/* Preview table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ borderColor: '#2D2D2D', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#262626' }}>
              <TableHead className="w-12 text-gray-400">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-gray-300">{col.header}</TableHead>
              ))}
              <TableHead className="w-24 text-gray-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row) => (
              <TableRow
                key={row.row}
                style={!row.isValid ? { background: 'rgba(239, 68, 68, 0.05)' } : undefined}
              >
                <TableCell className="font-mono text-xs text-gray-500">{row.row}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-sm text-gray-300">
                    {row.data[col.key] !== undefined && row.data[col.key] !== null
                      ? String(row.data[col.key])
                      : '-'}
                  </TableCell>
                ))}
                <TableCell>
                  {row.isValid ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid
                    </Badge>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Error
                      </Badge>
                      {row.errors.length > 0 && (
                        <p className="text-xs" style={{ color: '#EF4444' }}>{row.errors[0]}</p>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
