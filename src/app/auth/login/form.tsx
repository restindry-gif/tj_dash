'use client'

import { useState } from 'react'
import { loginAction } from '@/app/auth/actions'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setPending(true)
    setError('')
    try {
      await loginAction(formData)
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      // 기술적인 에러 메시지 대신 사용자 친화적 메시지로 변환
      if (message.includes('Invalid login') || message.includes('invalid_credentials') || message.includes('틀렸습니다')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError(message)
      }
      setPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="w-full space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-slate-400 mb-1.5 block">
          이메일
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="admin@example.com"
          required
          disabled={pending}
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-400 mb-1.5 block">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          disabled={pending}
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-500 hover:bg-green-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {pending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
