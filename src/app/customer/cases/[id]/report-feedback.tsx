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
    <div className="border-t border-slate-700/40 pt-3 mt-1 space-y-2.5">
      {/* 확인 체크 */}
      <button
        onClick={handleCheck}
        disabled={checkPending}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          checked
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            : 'bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/70'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {checked
            ? <path d="M20 6 9 17l-5-5"/>
            : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></>
          }
        </svg>
        {checked ? '확인함' : '확인'}
      </button>

      {/* 코멘트 */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="코멘트를 입력하세요..."
            rows={3}
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-slate-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCommentSubmit}
              disabled={commentPending}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {commentPending ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => { setComment(initialComment ?? ''); setEditing(false) }}
              className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : comment ? (
        <div
          className="flex items-start gap-2 bg-slate-900/50 border border-slate-700/30 rounded-lg px-3 py-2 cursor-pointer hover:border-slate-600/50 transition-colors"
          onClick={() => setEditing(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 mt-0.5 shrink-0">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="text-xs text-slate-300 leading-relaxed flex-1 whitespace-pre-wrap">{comment}</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0 mt-0.5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          코멘트 추가
        </button>
      )}
    </div>
  )
}
