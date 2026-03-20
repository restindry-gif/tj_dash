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
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
        <p className="text-sm text-purple-700">✓ 이 상담은 사건으로 전환되었습니다.</p>
      </div>
    )
  }

  const handleConvert = async () => {
    setIsLoading(true)
    setError('')

    try {
      const caseId = await convertConsultationToCase(consultationId)
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '사건 전환 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={isLoading}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 transition-colors"
      >
        {isLoading ? '전환 중...' : '📋 사건으로 전환'}
      </button>

      <p className="text-xs text-gray-500">
        상담 정보를 바탕으로 새로운 사건이 생성됩니다.
      </p>
    </div>
  )
}
