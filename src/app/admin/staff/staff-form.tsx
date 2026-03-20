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
      await createStaff(formData)
      setSuccess('직원이 정상적으로 등록되었습니다.')
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement
      if (form) form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '직원 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">이름</label>
        <input
          name="fullName"
          required
          placeholder="김탐정"
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">이메일 (로그인 ID)</label>
        <input
          name="email"
          type="email"
          required
          placeholder="staff@tj-detective.com"
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">비밀번호</label>
        <input
          name="password"
          type="password"
          placeholder="초기 비밀번호 입력"
          className="w-full p-2 border rounded-md text-gray-400"
          disabled
        />
        <p className="text-xs text-gray-500">인증 시스템 미적용 (향후 추가 예정)</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">전화번호</label>
        <input
          name="phone"
          placeholder="010-0000-0000"
          className="w-full p-2 border rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50"
      >
        {isSubmitting ? '등록 중...' : '직원 계정 생성'}
      </button>
    </form>
  )
}
