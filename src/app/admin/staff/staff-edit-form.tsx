'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaff, deleteStaff, updateStaffRole } from './actions'
import { PhoneInput } from '@/components/phone-input'

type Staff = {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
  role: string
}

export function StaffEditForm({ staff }: { staff: Staff }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState(staff.role as 'admin' | 'staff')
  const router = useRouter()

  const handleUpdate = async (formData: FormData) => {
    const newRole = formData.get('role') as 'admin' | 'staff'
    const roleChanged = newRole !== staff.role
    const confirmMsg = roleChanged
      ? `"${staff.full_name}" 정보를 수정하고 역할을 "${newRole === 'admin' ? '관리자' : '직원'}"으로 변경하시겠습니까?`
      : `"${staff.full_name}" 정보를 수정하시겠습니까?`

    if (!confirm(confirmMsg)) return

    setIsSubmitting(true)
    setError('')
    try {
      await updateStaff(formData)
      if (roleChanged) await updateStaffRole(staff.id, newRole)
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${staff.full_name}" 직원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setIsSubmitting(true)
    setError('')
    try {
      await deleteStaff(staff.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
      setIsSubmitting(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex gap-3 mt-1">
        {error && <p className="text-xs text-red-400 w-full">{error}</p>}
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-green-400 hover:text-green-300 transition-colors"
        >
          수정
        </button>
        <span className="text-xs text-slate-600">|</span>
        <button
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    )
  }

  return (
    <form action={handleUpdate} className="mt-3 space-y-3 border-t border-slate-700 pt-3">
      <input type="hidden" name="staffId" value={staff.id} />
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">이름</label>
          <input
            name="fullName"
            defaultValue={staff.full_name || ''}
            required
            className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">전화번호</label>
          <PhoneInput
            name="phone"
            defaultValue={staff.phone || ''}
            className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">새 비밀번호 (변경 시만 입력)</label>
        <input
          name="newPassword"
          type="password"
          placeholder="변경하지 않으면 비워두세요"
          minLength={6}
          className="w-full bg-slate-800 border border-slate-700 text-slate-50 placeholder:text-slate-500 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">역할</label>
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="staff"
              checked={selectedRole === 'staff'}
              onChange={() => setSelectedRole('staff')}
              className="h-3.5 w-3.5 accent-green-500"
            />
            <span className="text-sm text-slate-300">직원</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={selectedRole === 'admin'}
              onChange={() => setSelectedRole('admin')}
              className="h-3.5 w-3.5 accent-green-500"
            />
            <span className="text-sm text-slate-300">관리자</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => { setIsEditing(false); setError(''); setSelectedRole(staff.role as 'admin' | 'staff') }}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}
