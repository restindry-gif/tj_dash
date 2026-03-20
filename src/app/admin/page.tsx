import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Helper for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function AdminPage() {
  const supabase = createDatabaseClient()

  // Fetch cases
  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cases:', error)
    return <div>Error loading cases</div>
  }

  // Calculate stats
  const totalCases = cases?.length || 0
  const activeCases = cases?.filter((c) => c.status === 'active').length || 0
  const pendingCases = cases?.filter((c) => c.status === 'pending').length || 0
  const completedCases = cases?.filter((c) => c.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/consultations/new"
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
          >
            + 신규 상담
          </Link>
          <Link
            href="/admin/cases/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            + 신규 사건 등록
          </Link>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex gap-2 border-b">
        <Link
          href="/admin"
          className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600"
        >
          📊 대시보드
        </Link>
        <Link
          href="/admin/consultations"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          💬 상담 관리
        </Link>
        <Link
          href="/admin/staff"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          👥 직원 관리
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="전체 의뢰" value={totalCases} />
        <StatsCard title="진행 중" value={activeCases} type="active" />
        <StatsCard title="대기 중" value={pendingCases} type="pending" />
        <StatsCard title="완료됨" value={completedCases} type="completed" />
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">최근 의뢰 목록</h2>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-3">의뢰명</th>
                  <th className="px-6 py-3">의뢰인</th>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">등록일</th>
                  <th className="px-6 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {cases?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      등록된 의뢰가 없습니다.
                    </td>
                  </tr>
                ) : (
                  cases?.map((item) => (
                    <tr key={item.id} className="border-b bg-white hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.title}
                      </td>
                      <td className="px-6 py-4">
                        {item.client_id || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4">{formatDate(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <button className="font-medium text-blue-600 hover:underline">
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  type = 'default',
}: {
  title: string
  value: number
  type?: 'default' | 'active' | 'pending' | 'completed'
}) {
  const colors = {
    default: 'text-gray-900',
    active: 'text-blue-600',
    pending: 'text-yellow-600',
    completed: 'text-green-600',
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className={`mt-2 text-3xl font-bold ${colors[type]}`}>{value}</div>
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

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.toUpperCase()}
    </span>
  )
}
