'use client'

import { useState } from 'react'
import { createStaff } from './actions'

export function StaffForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      console.log('직원 등록 시작:', {
        email: formData.get('email'),
        fullName: formData.get('fullName'),
      })

      await createStaff(formData)
      setSuccess('직원이 정상적으로 등록되었습니다.')
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement
      if (form) form.reset()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '직원 등록 중 오류가 발생했습니다.'
      console.error('직원 등록 실패:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-slate-400 mb-1.5 block">이름</label>
        <input
          name="fullName"
          required
          placeholder="김탐정"
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-400 mb-1.5 block">이메일 (로그인 ID)</label>
        <input
          name="email"
          type="email"
          required
          placeholder="staff@tj-detective.com"
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-400 mb-1.5 block">비밀번호 (6자 이상)</label>
        <input
          name="password"
          type="password"
          required
          placeholder="초기 비밀번호 입력"
          minLength={6}
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-400 mb-1.5 block">전화번호</label>
        <input
          name="phone"
          placeholder="010-0000-0000"
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-500 hover:bg-green-400 text-white py-2.5 px-4 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? '등록 중...' : '직원 계정 생성'}
      </button>
    </form>
  )
}
