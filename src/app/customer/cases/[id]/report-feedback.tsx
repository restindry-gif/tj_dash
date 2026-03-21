'use client'

import { useState, useTransition } from 'react'
import { toggleReportCheck, submitReportComment } from '../actions'

export function ReportFeedback({
  reportId,
  caseId,
  initialChecked,
  initialComment,
}: {
  reportId: string
  caseId: string
  initialChecked: boolean
  initialComment: string | null
}) {
  const [checked, setChecked] = useState(initialChecked)
  const [comment, setComment] = useState(initialComment ?? '')
  const [editing, setEditing] = useState(false)
  const [checkPending, startCheckTransition] = useTransition()
  const [commentPending, startCommentTransition] = useTransition()

  const handleCheck = () => {
    const next = !checked
    setChecked(next)
    startCheckTransition(async () => {
      const result = await toggleReportCheck(reportId, caseId, next)
      if (result?.error) setChecked(!next)
    })
  }

  const handleCommentSubmit = () => {
    startCommentTransition(async () => {
      const result = await submitReportComment(reportId, caseId, comment)
      if (!result?.error) setEditing(false)
    })
  }

  return (
    <div className="border-t border-slate-700/40 mt-3 pt-4 flex flex-col gap-3">

      {/* 버튼 행 — 항상 두 버튼 나란히 */}
      <div className="flex gap-2">
        {/* 확인 버튼 */}
        <button
          onClick={handleCheck}
          disabled={checkPending}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border transition-all duration-200 disabled:opacity-50 cursor-pointer ${
            checked
              ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {checked
              ? <path d="M20 6 9 17l-5-5"/>
              : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></>
            }
          </svg>
          {checked ? '확인함' : '확인'}
        </button>

        {/* 코멘트 버튼 */}
        <button
          onClick={() => setEditing(true)}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            comment
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
              : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {comment ? '수정' : '코멘트'}
        </button>
      </div>

      {/* 코멘트 내용 (있을 때만) */}
      {comment && !editing && (
        <div
          className="flex items-start gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-600 transition-colors"
          onClick={() => setEditing(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="text-sm text-slate-300 leading-relaxed flex-1 whitespace-pre-wrap">{comment}</p>
        </div>
      )}

      {/* 코멘트 편집 */}
      {editing && (
        <div className="flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="담당자에게 전달할 내용을 입력하세요..."
            rows={3}
            autoFocus
            className="w-full bg-slate-900/80 border border-slate-600/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCommentSubmit}
              disabled={commentPending}
              className="flex-1 flex items-center justify-center text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {commentPending ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => { setComment(initialComment ?? ''); setEditing(false) }}
              className="flex-1 flex items-center justify-center text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 py-2 rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
