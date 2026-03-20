'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { convertConsultationToCase } from '../actions'

export function ConvertToCaseButton({
  consultationId,
  isConverted,
}: {
  consultationId: string
  isConverted: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const router = useRouter()

  if (isConverted) {
    return (
      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <p className="text-sm text-purple-400">이 상담은 사건으로 전환되었습니다.</p>
      </div>
    )
  }

  const handleConvert = async () => {
    setIsLoading(true)
    setError('')

    try {
      await convertConsultationToCase(consultationId)
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '사건 전환 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 px-4 rounded-lg font-medium disabled:opacity-50 transition-colors text-sm"
      >
        {isLoading ? '전환 중...' : '사건으로 전환'}
      </button>

      <p className="text-xs text-slate-500">
        상담 정보를 바탕으로 새로운 사건이 생성됩니다.
      </p>
    </div>
  )
}
