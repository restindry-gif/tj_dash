'use client'

import { useState } from 'react'
import { updateCaseAssignedStaff } from '../actions'

export function AssignStaffForm({
  caseId,
  currentStaffId,
  staffList,
  currentStaffName,
}: {
  caseId: string
  currentStaffId: string | null
  staffList: Array<{ id: string; full_name: string }>
  currentStaffName: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    currentStaffId
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await updateCaseAssignedStaff(caseId, selectedStaffId)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '직원 배정 변경 실패')
      setIsSubmitting(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-slate-300">{currentStaffName}</p>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          변경
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

      <div>
        <select
          value={selectedStaffId || ''}
          onChange={(e) =>
            setSelectedStaffId(e.target.value ? e.target.value : null)
          }
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        >
          <option value="">배정하지 않음</option>
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
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
            setSelectedStaffId(currentStaffId)
          }}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}
