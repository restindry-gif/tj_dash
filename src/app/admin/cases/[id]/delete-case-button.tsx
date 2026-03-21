'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCase } from '../actions'

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCase(caseId)
      if (!result.error) {
        router.push('/admin/cases')
      }
    })
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400 font-medium">삭제하시겠습니까?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-1 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 font-medium"
        >
          {isPending ? '삭제 중...' : '확인'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          취소
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </svg>
      사건 삭제
    </button>
  )
}
