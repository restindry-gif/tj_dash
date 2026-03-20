'use client'

import { useState } from 'react'
import { updateCaseStatus } from '../actions'
import { useRouter } from 'next/navigation'

export function CaseStatusForm({
  caseId,
  currentStatus,
}: {
  caseId: string
  currentStatus: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      await updateCaseStatus(caseId, newStatus)
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: '대기', color: 'bg-yellow-500' },
    { value: 'active', label: '진행', color: 'bg-blue-500' },
    { value: 'completed', label: '완료', color: 'bg-green-500' },
    { value: 'cancelled', label: '취소', color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        현재 상태: <span className="text-slate-200 font-medium">{statusOptions.find(s => s.value === currentStatus)?.label || currentStatus}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        {statusOptions
          .filter((option) => option.value !== currentStatus)
          .map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity ${option.color} hover:opacity-90 disabled:opacity-50`}
            >
              {isLoading ? '변경 중...' : `${option.label}으로 변경`}
            </button>
          ))}
      </div>

      <p className="text-xs text-slate-500">
        대기 → 진행 → 완료 순서로 진행합니다
      </p>
    </div>
  )
}
