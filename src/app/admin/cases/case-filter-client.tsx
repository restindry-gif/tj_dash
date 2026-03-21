'use client'

import { useState, useRef, useEffect } from 'react'
import { searchCases, toggleStarred } from './actions'

interface CaseItem {
  id: string
  title: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  created_at: string
  is_starred: boolean
  assigned_staff_id: string | null
}

interface CaseFilterClientProps {
  initialCases: CaseItem[]
  staffList: { id: string; full_name: string }[]
}

export function CaseFilterClient({ initialCases, staffList }: CaseFilterClientProps) {
  const [cases, setCases] = useState<CaseItem[]>(initialCases)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [offset, setOffset] = useState(20)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)

  // 필터 상태
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedStaffId, setAssignedStaffId] = useState<string | null | undefined>()
  const [statuses, setStatuses] = useState<string[]>([])
  const [starredOnly, setStarredOnly] = useState(false)

  // 필터 조건 객체 생성 함수
  function getFilterParams() {
    return {
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      assignedStaffId,
      statuses: statuses.length > 0 ? statuses : undefined,
      starredOnly,
    }
  }

  // 검색 실행 (offset 리셋)
  async function handleSearch() {
    try {
      const results = await searchCases({
        ...getFilterParams(),
        offset: 0,
        limit: 20,
      })
      setCases(results)
      setOffset(20)
      setHasMore(results.length === 20)
    } catch (error) {
      console.error('Search failed:', error)
      alert('검색 중 오류가 발생했습니다.')
    }
  }

  // 필터 초기화
  function handleReset() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setAssignedStaffId(undefined)
    setStatuses([])
    setStarredOnly(false)
    setCases(initialCases)
    setOffset(20)
    setHasMore(initialCases.length === 20)
  }

  // 상태 체크박스 토글
  function toggleStatus(status: string) {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  // 별 토글
  async function handleToggleStar(caseId: string, currentStar: boolean) {
    try {
      await toggleStarred(caseId)
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, is_starred: !currentStar } : c))
      )
    } catch (error) {
      console.error('Failed to toggle star:', error)
      alert('중요 표시 변경 중 오류가 발생했습니다.')
    }
  }

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore && cases.length > 0) {
          setIsLoadingMore(true)
          try {
            const more = await searchCases({
              ...getFilterParams(),
              offset,
              limit: 10,
            })
            if (more.length > 0) {
              setCases((prev) => [...prev, ...more])
              setOffset((prev) => prev + 10)
              // 10개 미만이면 더 이상 데이터 없음
              if (more.length < 10) {
                setHasMore(false)
              }
            } else {
              // 0개 반환 = 데이터 끝
              setHasMore(false)
            }
          } catch (error) {
            console.error('Failed to load more:', error)
          } finally {
            setIsLoadingMore(false)
          }
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [offset, isLoadingMore, hasMore, search, dateFrom, dateTo, assignedStaffId, statuses, starredOnly])

  const STATUS_LABELS: Record<string, string> = {
    pending: '대기',
    active: '진행 중',
    completed: '완료',
    cancelled: '취소',
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="space-y-6">
      {/* 검색 & 필터 바 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        {/* 검색 입력 */}
        <input
          type="text"
          placeholder="사건명, 고객명, 상담내용..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm"
        />

        {/* 버튼들 - 모바일에서는 2행, 데스크톱에서는 1행 */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
          >
            🔽 필터
          </button>
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
          >
            초기화
          </button>
        </div>

        {/* 필터 모달 */}
        {isFilterOpen && (
          <div className="border-t border-slate-800 pt-4 space-y-4 max-h-96 overflow-y-auto md:max-h-none md:overflow-y-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  시작일
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  종료일
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  담당자
                </label>
                <select
                  value={assignedStaffId ?? ''}
                  onChange={(e) => setAssignedStaffId(e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm"
                >
                  <option value="">전체</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  상태
                </label>
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statuses.includes(key)}
                        onChange={() => toggleStatus(key)}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={starredOnly}
                onChange={(e) => setStarredOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-300">⭐ 중요만</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
              >
                적용
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 사건 목록 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {cases.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 text-sm">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="flex items-start gap-3 p-4 hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleToggleStar(caseItem.id, caseItem.is_starred)
                  }}
                  className="text-lg mt-0.5 hover:scale-110 transition-transform shrink-0"
                >
                  {caseItem.is_starred ? '⭐' : '☆'}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 text-sm group-hover:text-white">
                    {caseItem.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>
                      {caseItem.assigned_staff_id
                        ? staffList.find((s) => s.id === caseItem.assigned_staff_id)?.full_name || '미배정'
                        : '미배정'}
                    </span>
                    <span>|</span>
                    <span>{new Date(caseItem.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                <span
                  className={`text-xs rounded-full px-2 py-1 font-medium border shrink-0 whitespace-nowrap ${STATUS_COLORS[caseItem.status]}`}
                >
                  {STATUS_LABELS[caseItem.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 무한 스크롤 감지 영역 */}
      {hasMore && <div ref={observerTarget} className="h-4" />}

      {isLoadingMore && hasMore && (
        <div className="text-center py-4">
          <p className="text-slate-500 text-sm">더 불러오는 중...</p>
        </div>
      )}
    </div>
  )
}
