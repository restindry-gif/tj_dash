'use client'

import { useState, useTransition } from 'react'
import { updateCustomer, deleteCustomer, resetCustomerPassword } from '../actions'
import { useRouter } from 'next/navigation'

interface CustomerProfile {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  notes?: string | null
}

export function CustomerEditForm({ customer }: { customer: CustomerProfile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isResetting, startReset] = useTransition()

  const [fullName, setFullName] = useState(customer.full_name ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  function handleSave() {
    startTransition(async () => {
      const result = await updateCustomer(customer.id, { full_name: fullName, email, phone, notes })
      if (result?.error) {
        setMsg(result.error)
      } else {
        setMsg('저장되었습니다.')
        setTimeout(() => setMsg(''), 2000)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`${customer.full_name ?? customer.email} 고객을 삭제하시겠습니까?\n삭제 시 사건 연결이 해제됩니다.`)) return
    startDelete(async () => {
      await deleteCustomer(customer.id)
      router.push('/admin/customers')
    })
  }

  function handleResetPassword() {
    if (!newPassword.trim()) return
    startReset(async () => {
      const result = await resetCustomerPassword(customer.id, newPassword)
      if (result?.error) {
        setPwMsg(result.error)
      } else {
        setPwMsg('비밀번호가 변경되었습니다.')
        setNewPassword('')
        setTimeout(() => setPwMsg(''), 2000)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 기본 정보 편집 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">기본 정보</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">이름</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="홍길동"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">이메일</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">연락처</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="010-0000-0000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">특이사항</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            placeholder="고객 관련 특이사항을 기록하세요..."
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          {msg && (
            <p className={`text-xs ${msg === '저장되었습니다.' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? '삭제 중...' : '고객 삭제'}
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 비밀번호 재설정 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">포털 비밀번호 재설정</p>
        <div className="flex items-center gap-2">
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="새 비밀번호 (6자 이상)"
          />
          <button
            onClick={handleResetPassword}
            disabled={isResetting || !newPassword.trim()}
            className="shrink-0 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isResetting ? '변경 중...' : '변경'}
          </button>
        </div>
        {pwMsg && (
          <p className={`text-xs ${pwMsg.includes('변경') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</p>
        )}
      </div>
    </div>
  )
}
