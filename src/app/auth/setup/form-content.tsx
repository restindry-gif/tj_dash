'use client'

import { useFormStatus } from 'react-dom'

export default function SetupAdminFormContent() {
  const { pending, data } = useFormStatus()

  return (
    <>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          관리자 이메일
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="admin@tj-detective.com"
          required
          disabled={pending}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          disabled={pending}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {pending ? '생성 중...' : '관리자 계정 생성'}
      </button>
    </>
  )
}
