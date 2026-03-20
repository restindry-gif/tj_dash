'use client'

import { useState } from 'react'
import { updateCaseFees } from '../actions'

export function FeeForm({
  caseId,
  feeAmount,
  advancePayment,
}: {
  caseId: string
  feeAmount: number | null
  advancePayment: number | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [fee, setFee] = useState<number | null>(feeAmount)
  const [advance, setAdvance] = useState<number | null>(advancePayment)
  const [feeDisplay, setFeeDisplay] = useState(feeAmount ? feeAmount.toLocaleString('ko-KR') : '')
  const [advanceDisplay, setAdvanceDisplay] = useState(advancePayment ? advancePayment.toLocaleString('ko-KR') : '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const formatNumberInput = (value: string) => {
    const numOnly = value.replace(/[^0-9]/g, '')
    return numOnly ? parseInt(numOnly).toLocaleString('ko-KR') : ''
  }

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberInput(e.target.value)
    setFeeDisplay(formatted)
    setFee(formatted ? parseInt(formatted.replace(/[^0-9]/g, '')) : null)
  }

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberInput(e.target.value)
    setAdvanceDisplay(formatted)
    setAdvance(formatted ? parseInt(formatted.replace(/[^0-9]/g, '')) : null)
  }

  const remaining = fee && advance ? Math.max(0, fee - advance) : fee || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await updateCaseFees(caseId, fee, advance)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '수임료 변경 실패')
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    return value ? value.toLocaleString('ko-KR') : '0'
  }

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">수임료</p>
            <p className="text-slate-300 font-medium">₩{formatCurrency(fee)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">착수금</p>
            <p className="text-slate-300 font-medium">₩{formatCurrency(advance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">잔금</p>
            <p className="text-slate-300 font-medium">₩{formatCurrency(remaining || 0)}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          수정
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">수임료 (원)</label>
          <input
            type="text"
            value={feeDisplay}
            onChange={handleFeeChange}
            className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            placeholder="1,000,000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">착수금 (원)</label>
          <input
            type="text"
            value={advanceDisplay}
            onChange={handleAdvanceChange}
            className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
            placeholder="500,000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">잔금 (원)</label>
          <input
            type="text"
            readOnly
            value={`₩${formatCurrency(remaining || 0)}`}
            className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg px-3 py-2 outline-none cursor-default"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false)
            setFee(feeAmount)
            setAdvance(advancePayment)
          }}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}
