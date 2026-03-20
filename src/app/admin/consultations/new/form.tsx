'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConsultation } from '../actions'

type Staff = {
  id: string
  full_name: string
  email: string
}

export function ConsultationForm({ staffMembers }: { staffMembers: Staff[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const router = useRouter()

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true)
        setError('')
        try {
          const consultationId = await createConsultation(formData)
          router.push(`/admin/consultations/${consultationId}`)
        } catch (err) {
          setError(err instanceof Error ? err.message : '상담 등록 중 오류가 발생했습니다.')
          setIsSubmitting(false)
        }
      }}
      className="space-y-6 max-w-2xl"
    >
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 의뢰인 정보 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">의뢰인 정보</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">이름 *</label>
          <input
            name="customerName"
            required
            placeholder="의뢰인 이름"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <input
              name="customerEmail"
              type="email"
              placeholder="example@email.com"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">전화번호</label>
            <input
              name="customerPhone"
              placeholder="010-0000-0000"
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 상담 정보 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">상담 정보</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">상담 일시 *</label>
          <input
            name="consultationDate"
            type="datetime-local"
            required
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">상담 내용 *</label>
          <textarea
            name="content"
            required
            rows={6}
            placeholder="의뢰인의 요청사항, 상담 내용을 자세히 기록해주세요"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">추가 메모</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="추가 사항이 있으면 기록하세요"
            className="w-full p-2 border rounded-md"
          />
        </div>

        {staffMembers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">담당자 배정</label>
            <select
              name="assignedStaffId"
              className="w-full p-2 border rounded-md"
            >
              <option value="">담당자를 선택하세요</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.email})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '상담 등록'}
        </button>
      </div>
    </form>
  )
}
