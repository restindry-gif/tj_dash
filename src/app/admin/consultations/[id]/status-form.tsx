'use client'

import { useState } from 'react'
import { updateConsultationStatus } from '../actions'
import { useRouter } from 'next/navigation'

export function StatusChangeForm({
  consultationId,
  currentStatus,
}: {
  consultationId: string
  currentStatus: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      await updateConsultationStatus(consultationId, newStatus)
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: '대기 중', color: 'bg-yellow-500' },
    { value: 'in_progress', label: '진행 중', color: 'bg-blue-500' },
    { value: 'completed', label: '완료됨', color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">현재 상태: <strong>{statusOptions.find(s => s.value === currentStatus)?.label}</strong></p>

      <div className="flex flex-wrap gap-2">
        {statusOptions
          .filter((option) => option.value !== currentStatus)
          .map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-white font-medium transition-opacity ${option.color} hover:opacity-90 disabled:opacity-50`}
            >
              {isLoading ? '변경 중...' : option.label}로 변경
            </button>
          ))}
      </div>

      <p className="text-xs text-gray-500">
        💡 대기 중 → 진행 중 → 완료됨 순서로 진행합니다
      </p>
    </div>
  )
}
