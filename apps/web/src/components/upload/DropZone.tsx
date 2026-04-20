'use client'

import { useCallback } from 'react'
import { useStore, selectors } from '@/store'
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function DropZone() {
  const setUploadedFile = useStore((s) => s.setUploadedFile)
  const uploadedFile = useStore(selectors.uploadedFile)
  const previewUrl = useStore(selectors.previewUrl)
  const uploadStatus = useStore(selectors.uploadStatus)

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return
      if (file.size > MAX_UPLOAD_SIZE_BYTES) return
      setUploadedFile(file)
    },
    [setUploadedFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <label
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        'group relative flex min-h-64 cursor-pointer flex-col items-center justify-center border border-dashed border-canvas-muted bg-canvas-subtle transition-colors duration-250',
        'hover:border-ink-placeholder hover:bg-canvas',
        uploadStatus === 'error' && 'border-error/50',
      )}
    >
      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={onInputChange}
      />

      {previewUrl ? (
        /* Preview */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={uploadedFile?.name ?? 'Artwork preview'}
          className="max-h-64 max-w-full object-contain"
        />
      ) : (
        /* Idle prompt */
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center border border-canvas-muted text-ink-tertiary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-sans text-sm text-ink-secondary">
            Drop your artwork here, or{' '}
            <span className="text-ink underline underline-offset-2">browse</span>
          </p>
          <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">
            JPG · PNG · WEBP · TIFF — max 10 MB
          </p>
        </div>
      )}
    </label>
  )
}
