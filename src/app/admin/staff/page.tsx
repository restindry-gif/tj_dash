import { createDatabaseClient } from '@/lib/supabase/client'
import { StaffForm } from './staff-form'
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
            <StaffForm />
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
