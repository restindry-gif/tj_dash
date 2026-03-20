import { createDatabaseClient } from '@/lib/supabase/client'
import { createStaff } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StaffManagementPage() {
  const supabase = createDatabaseClient()

  // Fetch staff list
  const { data: staffList } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'staff')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">직원 관리</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 1. Create Staff Form */}
        <Card>
          <CardHeader>
            <CardTitle>신규 직원 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createStaff} className="space-y-4">
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
                  required
                  placeholder="초기 비밀번호 입력"
                  className="w-full p-2 border rounded-md"
                />
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
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium"
              >
                직원 계정 생성
              </button>
            </form>
          </CardContent>
        </Card>

        {/* 2. Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>직원 목록 ({staffList?.length || 0}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {staffList?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">등록된 직원이 없습니다.</p>
            ) : (
              <ul className="divide-y">
                {staffList?.map((staff) => (
                  <li key={staff.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{staff.full_name}</p>
                      <p className="text-sm text-gray-500">{staff.email}</p>
                      {staff.phone && <p className="text-xs text-gray-400">{staff.phone}</p>}
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Staff
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
