import { createDatabaseClient } from '@/lib/supabase/client'
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
  // For now, this page shows all cases
  // In the future with authentication, this would show only the logged-in customer's cases
  const supabase = createDatabaseClient()

  // Fetch all cases (simplified query without joins for now)
  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customer cases:', error)
    return <div>Error loading cases</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">전체 의뢰 현황</h1>

      {cases?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
          <p className="text-gray-500">등록된 의뢰가 없습니다.</p>
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
                  {item.fee_amount && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">착수금</h4>
                      <p className="text-sm text-gray-900">
                        {item.fee_amount.toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">상세 내용</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {item.description || '내용 없음'}
                    </p>
                  </div>

                  {item.consultation_notes && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">상담 내용</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {item.consultation_notes}
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
