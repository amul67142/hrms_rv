'use client'

import * as React from 'react'
import { Upload, X, File, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/core/utils'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  accept?: string
  onFileSelect: (file: File) => void
  onClear?: () => void
  file?: File | null
  progress?: number
  error?: string
  disabled?: boolean
}

export function FileUpload({
  accept,
  onFileSelect,
  onClear,
  file,
  progress,
  error,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isHovering, setIsHovering] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragging && 'border-blue-500 bg-blue-500/8',
            !isDragging && !isHovering && 'border-neutral-700 bg-neutral-900',
            !isDragging && isHovering && !disabled && 'border-neutral-500 bg-neutral-800',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />
          <Upload
            className={cn('mx-auto h-10 w-10 mb-3', isDragging ? 'text-blue-500' : 'text-gray-400')}
          />
          <p className="text-sm font-medium text-gray-300">
            {isDragging ? 'Drop file here' : 'Drag & drop a file, or click to browse'}
          </p>
          {accept && (
            <p className="text-xs text-gray-400 mt-1">
              Accepted formats: {accept}
            </p>
          )}
        </div>
      ) : (
        <div
          className="border rounded-xl p-4"
          style={{ borderColor: '#2D2D2D', background: '#1A1A1A' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(59, 130, 246, 0.1)' }}
            >
              <File className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
            </div>
            {progress !== undefined && progress < 100 ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="w-24 h-2 rounded-full overflow-hidden"
                  style={{ background: '#262626' }}
                >
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{progress}%</span>
              </div>
            ) : progress === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : null}
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-200 flex-shrink-0"
                onClick={() => {
                  onClear?.()
                  if (inputRef.current) inputRef.current.value = ''
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3" style={{ color: '#EF4444' }}>
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
