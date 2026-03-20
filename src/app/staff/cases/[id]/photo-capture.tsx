'use client'

import { useRef, useState } from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { submitReport } from '@/app/staff/actions'

interface PhotoCaptureProps {
  caseId: string
  staffId: string
  onComplete?: () => void
}

const MAX_BYTES = 500 * 1024 // 500KB
const MAX_DIMENSION = 1920   // px

/** Canvas 압축: 500KB 이하가 될 때까지 quality 감소 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')

        // 최대 치수 제한
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        // quality를 낮춰가며 500KB 이하 찾기
        const tryQuality = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('이미지 변환 실패'))
              if (blob.size <= MAX_BYTES || quality <= 0.3) {
                resolve(blob)
              } else {
                tryQuality(Math.max(quality - 0.1, 0.3))
              }
            },
            'image/jpeg',
            quality
          )
        }
        tryQuality(0.85)
      }
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function PhotoCapture({ caseId, staffId, onComplete }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [compressedSize, setCompressedSize] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'compressing' | 'ready' | 'uploading' | 'done'>('idle')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStatus('compressing')
    setPreview(null)

    try {
      const blob = await compressImage(file)
      const url = URL.createObjectURL(blob)
      setPreview(url)
      setCompressedBlob(blob)
      setCompressedSize(blob.size)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 처리 실패')
      setStatus('idle')
    }

    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!compressedBlob) return
    setStatus('uploading')
    setError('')

    try {
      const supabase = createDatabaseClient()
      const ext = 'jpg'
      const path = `${caseId}/${staffId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('case-reports')
        .upload(path, compressedBlob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('case-reports')
        .getPublicUrl(path)

      const result = await submitReport({
        caseId,
        staffId,
        reportType: 'photo',
        content: caption.trim() || '현장 사진',
        mediaUrl: publicUrl,
      })

      if (result?.error) throw new Error(result.error)

      setStatus('done')
      setTimeout(() => {
        onComplete?.()
        window.location.reload()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
      setStatus('ready')
    }
  }

  const reset = () => {
    setPreview(null)
    setCompressedBlob(null)
    setCaption('')
    setStatus('idle')
    setError('')
  }

  return (
    <div className="space-y-3">
      {/* 촬영/선택 버튼 */}
      {status === 'idle' && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute('capture')
                  inputRef.current.setAttribute('capture', 'environment')
                  inputRef.current.click()
                }
              }}
              className="flex flex-col items-center justify-center gap-2 min-h-[72px] bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-slate-300 hover:text-blue-400 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              <span className="text-xs font-medium">카메라 촬영</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute('capture')
                  inputRef.current.click()
                }
              }}
              className="flex flex-col items-center justify-center gap-2 min-h-[72px] bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-slate-300 hover:text-blue-400 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              <span className="text-xs font-medium">갤러리 선택</span>
            </button>
          </div>
        </>
      )}

      {/* 압축 중 */}
      {status === 'compressing' && (
        <div className="flex items-center justify-center gap-3 py-6 text-slate-400 text-sm">
          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          이미지 압축 중...
        </div>
      )}

      {/* 미리보기 + 설명 + 전송 */}
      {(status === 'ready' || status === 'uploading') && preview && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-slate-700">
            <img src={preview} alt="미리보기" className="w-full max-h-64 object-cover" />
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {(compressedSize / 1024).toFixed(0)}KB
            </div>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="사진 설명 (선택)"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            style={{ fontSize: '16px' }}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={status === 'uploading'}
              className="min-h-[48px] bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              다시 선택
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {status === 'uploading' ? '업로드 중...' : '전송'}
            </button>
          </div>
        </div>
      )}

      {/* 완료 */}
      {status === 'done' && (
        <div className="flex items-center gap-2 text-green-400 text-sm py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          사진이 전송되었습니다.
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
