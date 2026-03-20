'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaffRole } from './actions'

export function RoleToggle({
  staffId,
  currentRole,
}: {
  staffId: string
  currentRole: 'staff' | 'admin'
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRoleChange = async (newRole: 'staff' | 'admin') => {
    if (currentRole === newRole) return

    setIsLoading(true)
    setError('')

    try {
      await updateStaffRole(staffId, newRole)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 변경 실패')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleRoleChange('staff')}
          disabled={isLoading || currentRole === 'staff'}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            currentRole === 'staff'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          직원
        </button>
        <button
          onClick={() => handleRoleChange('admin')}
          disabled={isLoading || currentRole === 'admin'}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            currentRole === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          👑 관리자
        </button>
      </div>
    </div>
  )
}
