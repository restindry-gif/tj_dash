import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import { StaffForm } from './staff-form'
import { StaffEditForm } from './staff-edit-form'

export default async function StaffManagementPage() {
  const currentUser = await getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  const supabase = createDatabaseClient()
  const { data: staffList } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['staff', 'admin'])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-50">직원 관리</h1>
        <div className="text-xs text-slate-400">
          {currentUser?.email} | {currentUser?.role || '없음'}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 1. 신규 직원 등록 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">신규 직원 등록</p>
          {isAdmin ? (
            <StaffForm />
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">관리자만 직원을 등록할 수 있습니다.</p>
              <p className="text-xs text-slate-500 mt-2">현재 역할: {currentUser?.role || '없음'}</p>
            </div>
          )}
        </div>

        {/* 2. 직원 목록 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
            직원 목록 ({staffList?.length || 0}명)
          </p>
          {!staffList || staffList.length === 0 ? (
            <p className="text-slate-400 text-center py-4 text-sm">등록된 직원이 없습니다.</p>
          ) : (
            <ul>
              {staffList.map((staff, index) => (
                <li
                  key={staff.id}
                  className={index !== 0 ? 'border-t border-slate-800 pt-4 mt-4' : ''}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-50">{staff.full_name}</p>
                      <p className="text-sm text-slate-400 truncate">{staff.email}</p>
                      {staff.phone && (
                        <p className="text-xs text-slate-500">{staff.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={
                          staff.role === 'admin'
                            ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded-full px-3 py-1 text-xs font-medium'
                            : 'bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-full px-3 py-1 text-xs font-medium'
                        }
                      >
                        {staff.role === 'admin' ? '관리자' : '직원'}
                      </span>
                      {isAdmin && <StaffEditForm staff={staff} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
