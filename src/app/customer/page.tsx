import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Helper for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function CustomerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check role to ensure they are at least a customer (or anyone really, but let's be safe)
  // Actually, RLS protects data, so we just query cases where client_id = user.id
  // But let's verify profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div>Profile not found. Please contact support.</div>
  }

  // Fetch MY cases
  const { data: cases, error } = await supabase
    .from('cases')
    .select(`
      *,
      assigned_staff:profiles!assigned_staff_id (
        full_name,
        email
      )
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customer cases:', error)
    return <div>Error loading cases</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">내 사건 의뢰 내역</h1>
      
      {cases?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
          <p className="text-gray-500">진행 중인 의뢰가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {cases?.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
                      등록일: {formatDate(item.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">상세 내용</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {item.description || '내용 없음'}
                    </p>
                  </div>
                  
                  {item.assigned_staff && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">담당 탐정</h4>
                      <p className="text-sm text-gray-600">
                        {item.assigned_staff.full_name || '비공개'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  
  const labels: Record<string, string> = {
    pending: '대기 중',
    active: '조사 진행 중',
    completed: '완료됨',
    cancelled: '취소됨',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}
