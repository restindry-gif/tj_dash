'use client'

import { useState } from 'react'
import { createCase } from '../actions'

type Profile = {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
}

export function CreateCaseForm({
  staffMembers,
  customers,
}: {
  staffMembers: Profile[]
  customers: Profile[]
}) {
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [feeDisplay, setFeeDisplay] = useState('')
  const [advanceDisplay, setAdvanceDisplay] = useState('')

  const formatNumberInput = (value: string) => {
    const numOnly = value.replace(/[^0-9]/g, '')
    return numOnly ? parseInt(numOnly).toLocaleString('ko-KR') : ''
  }

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeeDisplay(formatNumberInput(e.target.value))
  }

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdvanceDisplay(formatNumberInput(e.target.value))
  }

  const updateRemaining = (fee: string, advance: string) => {
    const feeNum = parseInt(fee.replace(/[^0-9]/g, '') || '0')
    const advanceNum = parseInt(advance.replace(/[^0-9]/g, '') || '0')
    const remaining = Math.max(0, feeNum - advanceNum)
    const remainingField = document.getElementById('remainingBalance') as HTMLInputElement
    if (remainingField) {
      remainingField.value = remaining.toLocaleString('ko-KR')
    }
  }

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true)
        setSubmitError('')
        try {
          const result = await createCase(formData)
          if (result?.error) {
            setSubmitError(result.error)
            setIsSubmitting(false)
          }
          // void = redirect happening
        } catch (err: unknown) {
          const digest = err && typeof err === 'object' && 'digest' in err
            ? String((err as { digest: unknown }).digest) : ''
          if (digest.startsWith('NEXT_REDIRECT')) return
          setSubmitError('사건 등록 중 오류가 발생했습니다.')
          setIsSubmitting(false)
        }
      }}
      className="space-y-6 max-w-3xl"
    >
      {/* 1. 의뢰인 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-300 font-semibold text-base mb-4">의뢰인 정보</h3>

        <div className="flex gap-6 mb-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="clientMode"
              value="new"
              checked={clientMode === 'new'}
              onChange={() => setClientMode('new')}
              className="h-4 w-4 accent-green-500 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-300">신규 고객 등록</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="clientMode"
              value="existing"
              checked={clientMode === 'existing'}
              onChange={() => setClientMode('existing')}
              className="h-4 w-4 accent-green-500 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-300">기존 고객 선택</span>
          </label>
        </div>

        {clientMode === 'new' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">이름</label>
              <input
                name="clientName"
                required
                placeholder="홍길동"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">전화번호</label>
              <input
                name="clientPhone"
                placeholder="010-1234-5678"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">이메일 (로그인 ID)</label>
              <input
                name="clientEmail"
                type="email"
                required
                placeholder="client@example.com"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">임시 비밀번호</label>
              <input
                name="clientPassword"
                defaultValue="temp1234"
                placeholder="기본값: temp1234"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1.5">고객에게 전달할 초기 비밀번호입니다.</p>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">고객 선택</label>
            <select
              name="clientId"
              required
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            >
              <option value="">고객을 선택하세요</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email}) {c.phone ? `- ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. 사건 상세 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-300 font-semibold text-base mb-4">사건 상세 정보</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">사건명 (Title)</label>
            <input
              name="title"
              required
              placeholder="예: 강남구 실종자 찾기 의뢰"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">수임료 (원)</label>
              <input
                type="text"
                value={feeDisplay}
                onChange={(e) => {
                  handleFeeChange(e)
                  updateRemaining(e.target.value, advanceDisplay)
                }}
                placeholder="1,000,000"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
              <input
                name="feeAmount"
                type="hidden"
                value={parseInt(feeDisplay.replace(/[^0-9]/g, '') || '0')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">착수금 (원)</label>
              <input
                type="text"
                value={advanceDisplay}
                onChange={(e) => {
                  handleAdvanceChange(e)
                  updateRemaining(feeDisplay, e.target.value)
                }}
                placeholder="500,000"
                className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
              />
              <input
                name="advancePayment"
                type="hidden"
                value={parseInt(advanceDisplay.replace(/[^0-9]/g, '') || '0')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">잔금 (원)</label>
              <input
                id="remainingBalance"
                type="text"
                readOnly
                placeholder="0"
                className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg px-3 py-2.5 outline-none cursor-default"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">담당 직원 배정</label>
            <select
              name="assignedStaffId"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            >
              <option value="">미배정 (나중에 지정)</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">상담 내용 (Consultation Notes)</label>
            <textarea
              name="consultationNotes"
              rows={4}
              placeholder="초기 상담 내용, 특이사항, 요구사항 등..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">사건 개요 (Description)</label>
            <textarea
              name="description"
              rows={4}
              placeholder="사건의 구체적인 내용 (고객에게도 일부 공개될 수 있음)"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">초기 상태</label>
            <select
              name="status"
              className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            >
              <option value="pending">대기 중 (Pending)</option>
              <option value="active">진행 중 (Active)</option>
            </select>
          </div>
        </div>
      </div>

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
          {isSubmitting ? '등록 중...' : '사건 등록 완료'}
        </button>
      </div>
      {submitError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{submitError}</p>
      )}
    </form>
  )
}
