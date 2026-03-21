'use client'

import { useState } from 'react'
import { updateCaseInfo } from '../actions'

interface Props {
  caseId: string
  title: string
  consultationNotes: string | null
  description: string | null
}

export function CaseInfoForm({ caseId, title, consultationNotes, description }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(title)
  const [notesVal, setNotesVal] = useState(consultationNotes ?? '')
  const [descVal, setDescVal] = useState(description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleVal.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await updateCaseInfo(caseId, {
        title: titleVal.trim(),
        consultationNotes: notesVal,
        description: descVal,
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setTitleVal(title)
    setNotesVal(consultationNotes ?? '')
    setDescVal(description ?? '')
    setError('')
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <>
        {/* 사건명 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건명</p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-slate-500 hover:text-green-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
              수정
            </button>
          </div>
          <p className="text-slate-300">{titleVal || '-'}</p>
        </div>

        {/* 상담 내용 */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">상담 내용</p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-h-16 whitespace-pre-wrap text-slate-300 text-sm">
            {notesVal || '(없음)'}
          </div>
        </div>

        {/* 사건 개요 */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건 개요</p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-h-16 whitespace-pre-wrap text-slate-300 text-sm">
            {descVal || '(없음)'}
          </div>
        </div>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* 사건명 */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건명</label>
        <input
          type="text"
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 focus:border-green-500/50 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/30 outline-none transition-colors text-sm"
        />
      </div>

      {/* 상담 내용 */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">상담 내용</label>
        <textarea
          value={notesVal}
          onChange={(e) => setNotesVal(e.target.value)}
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 focus:border-green-500/50 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/30 outline-none transition-colors text-sm resize-none leading-relaxed"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* 사건 개요 */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건 개요</label>
        <textarea
          value={descVal}
          onChange={(e) => setDescVal(e.target.value)}
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 focus:border-green-500/50 text-slate-50 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/30 outline-none transition-colors text-sm resize-none leading-relaxed"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              저장 중
            </>
          ) : '저장'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          취소
        </button>
      </div>
    </form>
  )
}
