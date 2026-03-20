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
      className="space-y-6 max-w-3xl"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* 의뢰인 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-300 font-semibold text-base mb-4">의뢰인 정보</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">이름 *</label>
            <input
              name="customerName"
              required
              placeholder="의뢰인 이름"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">이메일</label>
              <input
                name="customerEmail"
                type="email"
                placeholder="example@email.com"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">전화번호</label>
              <input
                name="customerPhone"
                placeholder="010-0000-0000"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 상담 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-300 font-semibold text-base mb-4">상담 정보</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">상담 일시 *</label>
            <input
              name="consultationDate"
              type="datetime-local"
              required
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">상담 내용 *</label>
            <textarea
              name="content"
              required
              rows={6}
              placeholder="의뢰인의 요청사항, 상담 내용을 자세히 기록해주세요"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">추가 메모</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="추가 사항이 있으면 기록하세요"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          {staffMembers.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">담당자 배정</label>
              <select
                name="assignedStaffId"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
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
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-6 py-2.5 rounded-lg border border-slate-700 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-500 hover:bg-green-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '상담 등록'}
        </button>
      </div>
    </form>
  )
}
