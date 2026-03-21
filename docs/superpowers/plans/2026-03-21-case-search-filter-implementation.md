# P1 사건 검색 & 필터 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사건 목록에 모달 기반 검색 & 필터 기능 추가 (모달 필터 + 무한 스크롤 + 중요 표시)

**Architecture:** Server Action으로 검색 로직 분리 → Client Component에서 UI/상호작용 담당 → Server Component에서 초기 20건 로드

**Tech Stack:** Next.js 16 (Server/Client Components), Supabase PostgREST, Intersection Observer, Tailwind CSS

---

## 파일 구조

```
/admin/cases/
├── page.tsx (수정) - Server Component, 초기 데이터 로드
├── actions.ts (수정/확장) - searchCases, toggleStarred 서버 액션
└── case-filter-client.tsx (신규) - Client Component, 모달 필터 + 무한 스크롤
```

---

## Task 1: searchCases 서버 액션 작성

**Files:**
- Modify: `src/app/admin/cases/actions.ts`

- [ ] **Step 1: 기존 actions.ts 파일 확인**

```bash
cat src/app/admin/cases/actions.ts
```

Expected: 현재 파일의 내용 확인

- [ ] **Step 2: searchCases 서버 액션 추가**

`src/app/admin/cases/actions.ts`의 파일 끝에 다음 함수 추가:

```typescript
'use server'

import { createDatabaseClient } from '@/lib/supabase/client'

interface SearchParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  assignedStaffId?: string | null
  statuses?: string[]
  starredOnly?: boolean
  offset: number
  limit: number
}

export async function searchCases(params: SearchParams) {
  const supabase = createDatabaseClient()

  let query = supabase
    .from('cases')
    .select('*, profiles!assigned_staff_id(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 검색 (title, description, consultation_notes)
  if (params.search?.trim()) {
    const terms = params.search.trim().split(/\s+/)
    const searchConditions = terms
      .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%,consultation_notes.ilike.%${term}%`)
      .join(',')
    query = query.or(searchConditions)
  }

  // 날짜 범위
  if (params.dateFrom) {
    query = query.gte('created_at', `${params.dateFrom}T00:00:00`)
  }
  if (params.dateTo) {
    query = query.lte('created_at', `${params.dateTo}T23:59:59`)
  }

  // 담당자
  if (params.assignedStaffId !== undefined) {
    if (params.assignedStaffId === null) {
      query = query.is('assigned_staff_id', null)
    } else {
      query = query.eq('assigned_staff_id', params.assignedStaffId)
    }
  }

  // 상태 (다중 선택)
  if (params.statuses && params.statuses.length > 0) {
    query = query.in('status', params.statuses)
  }

  // 중요만
  if (params.starredOnly) {
    query = query.eq('is_starred', true)
  }

  // 페이지네이션
  query = query.range(params.offset, params.offset + params.limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('searchCases error:', error)
    throw new Error(`Failed to search cases: ${error.message}`)
  }

  return data || []
}
```

- [ ] **Step 3: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 타입 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/cases/actions.ts
git commit -m "feat: add searchCases server action for case filtering"
```

---

## Task 2: toggleStarred 서버 액션 작성

**Files:**
- Modify: `src/app/admin/cases/actions.ts`

- [ ] **Step 1: toggleStarred 함수 추가**

`src/app/admin/cases/actions.ts`에 다음 함수 추가:

```typescript
export async function toggleStarred(caseId: string) {
  const supabase = createDatabaseClient()

  // 현재 값 조회
  const { data: currentCase, error: fetchError } = await supabase
    .from('cases')
    .select('is_starred')
    .eq('id', caseId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch case: ${fetchError.message}`)
  }

  // 토글
  const { error: updateError } = await supabase
    .from('cases')
    .update({ is_starred: !currentCase.is_starred })
    .eq('id', caseId)

  if (updateError) {
    throw new Error(`Failed to update case: ${updateError.message}`)
  }

  return { id: caseId, is_starred: !currentCase.is_starred }
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/cases/actions.ts
git commit -m "feat: add toggleStarred server action"
```

---

## Task 3: CaseFilterClient 컴포넌트 작성 (UI & 필터 상태)

**Files:**
- Create: `src/app/admin/cases/case-filter-client.tsx`

- [ ] **Step 1: 기본 Client Component 구조 작성**

`src/app/admin/cases/case-filter-client.tsx` 신규 파일 생성:

```typescript
'use client'

import { useState } from 'react'
import { searchCases, toggleStarred } from './actions'

interface CaseItem {
  id: string
  title: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  created_at: string
  is_starred: boolean
  profiles?: { full_name: string } | null
}

interface CaseFilterClientProps {
  initialCases: CaseItem[]
  staffList: { id: string; full_name: string }[]
}

export function CaseFilterClient({ initialCases, staffList }: CaseFilterClientProps) {
  const [cases, setCases] = useState<CaseItem[]>(initialCases)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // 필터 상태
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedStaffId, setAssignedStaffId] = useState<string | null | undefined>()
  const [statuses, setStatuses] = useState<string[]>([])
  const [starredOnly, setStarredOnly] = useState(false)

  // 검색 실행
  async function handleSearch() {
    try {
      const results = await searchCases({
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        assignedStaffId,
        statuses: statuses.length > 0 ? statuses : undefined,
        starredOnly,
        offset: 0,
        limit: 20,
      })
      setCases(results)
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-50 font-manrope">사건 목록</h1>
          <p className="text-sm text-slate-400 mt-0.5">검색 결과: {cases.length}건</p>
        </div>
      </div>

      {/* 검색 & 필터 바 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="사건명, 고객명, 상담내용..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm"
          />
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
          >
            🔽 필터
          </button>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
          >
            초기화
          </button>
        </div>

        {/* 필터 모달 */}
        {isFilterOpen && (
          <div className="border-t border-slate-800 pt-4 space-y-4">
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
                    <span>{caseItem.profiles?.full_name || '미배정'}</span>
                    <span>|</span>
                    <span>{new Date(caseItem.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                <span
                  className={`text-xs rounded-full px-2.5 py-1 font-medium border shrink-0 ${STATUS_COLORS[caseItem.status]}`}
                >
                  {STATUS_LABELS[caseItem.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/cases/case-filter-client.tsx
git commit -m "feat: add CaseFilterClient component with modal filter UI"
```

---

## Task 4: 무한 스크롤 로직 추가

**Files:**
- Modify: `src/app/admin/cases/case-filter-client.tsx`

- [ ] **Step 1: 무한 스크롤 상태 추가**

`CaseFilterClient` 컴포넌트의 `useState` 섹션에 추가:

```typescript
const [offset, setOffset] = useState(20) // 초기 20건 이후부터
const [isLoadingMore, setIsLoadingMore] = useState(false)
const observerTarget = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: 필터 조건 객체 생성 함수 추가**

`CaseFilterClient` 함수 내부에 추가:

```typescript
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
```

- [ ] **Step 3: 검색 함수 수정 (offset 리셋)**

기존 `handleSearch` 함수를 다음으로 변경:

```typescript
async function handleSearch() {
  try {
    const results = await searchCases({
      ...getFilterParams(),
      offset: 0,
      limit: 20,
    })
    setCases(results)
    setOffset(20) // 무한 스크롤 offset 리셋
  } catch (error) {
    console.error('Search failed:', error)
    alert('검색 중 오류가 발생했습니다.')
  }
}
```

- [ ] **Step 4: 무한 스크롤 useEffect 추가**

`CaseFilterClient` 함수의 return 문 이전에 추가:

```typescript
import { useEffect, useRef } from 'react'

// ... 기존 코드 ...

useEffect(() => {
  const observer = new IntersectionObserver(
    async ([entry]) => {
      if (entry.isIntersecting && !isLoadingMore && cases.length > 0) {
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
}, [offset, isLoadingMore, search, dateFrom, dateTo, assignedStaffId, statuses, starredOnly])
```

- [ ] **Step 5: 사건 목록 하단에 observer target 추가**

사건 목록 div 바로 뒤에 추가:

```typescript
      </div>

      {/* 무한 스크롤 감지 영역 */}
      <div ref={observerTarget} className="h-4" />

      {isLoadingMore && (
        <div className="text-center py-4">
          <p className="text-slate-500 text-sm">더 불러오는 중...</p>
        </div>
      )}
```

- [ ] **Step 6: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/cases/case-filter-client.tsx
git commit -m "feat: add infinite scroll with Intersection Observer"
```

---

## Task 5: 기존 page.tsx 리팩토링

**Files:**
- Modify: `src/app/admin/cases/page.tsx`

- [ ] **Step 1: 현재 page.tsx 파일 읽기**

```bash
head -50 src/app/admin/cases/page.tsx
```

Expected: 현재 구조 확인

- [ ] **Step 2: searchCases 초기 로드로 변경**

`src/app/admin/cases/page.tsx` 전체 수정:

```typescript
import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { searchCases } from './actions'
import { CaseFilterClient } from './case-filter-client'

export const revalidate = 30

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  active: '진행 중',
  completed: '완료',
  cancelled: '취소',
}

export default async function AdminCasesPage() {
  const supabase = createDatabaseClient()

  // 초기 데이터 로드 (20건)
  const initialCases = await searchCases({
    offset: 0,
    limit: 20,
  })

  // 직원 목록 조회 (필터 드롭다운용)
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['staff', 'admin'])
    .order('full_name', { ascending: true })

  // 전체 사건 개수 통계
  const { data: cases } = await supabase
    .from('cases')
    .select('status')
    .is('deleted_at', null)

  const total = cases?.length ?? 0
  const active = cases?.filter((c) => c.status === 'active').length ?? 0
  const pending = cases?.filter((c) => c.status === 'pending').length ?? 0
  const completed = cases?.filter((c) => c.status === 'completed').length ?? 0

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-50 font-manrope">사건 목록</h1>
          <p className="text-sm text-slate-400 mt-0.5">전체 {total}건</p>
        </div>
        <Link
          href="/admin/cases/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          신규 사건 등록
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '전체', value: total, style: 'text-slate-200' },
          { label: '진행 중', value: active, style: 'text-blue-400' },
          { label: '대기', value: pending, style: 'text-yellow-400' },
          { label: '완료', value: completed, style: 'text-green-400' },
        ].map(({ label, value, style }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold tabular-nums ${style}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* CaseFilterClient 렌더링 */}
      <CaseFilterClient initialCases={initialCases} staffList={staffList || []} />
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/cases/page.tsx
git commit -m "refactor: update page.tsx to use CaseFilterClient and searchCases"
```

---

## Task 6: 수동 테스트 & 버그 수정

**Files:**
- Test: `src/app/admin/cases/` 전체

- [ ] **Step 1: 개발 서버 시작**

```bash
npm run dev
```

Expected: 서버 시작, http://localhost:3000 접속 가능

- [ ] **Step 2: 기본 기능 테스트**

1. http://localhost:3000/admin/cases 접속
2. 초기 20개 사건 표시 확인
3. 검색창에 사건명 입력 후 [검색] 클릭
   - Expected: 필터된 결과 표시
4. [필터] 버튼 클릭
   - Expected: 모달 열림 (날짜, 담당자, 상태, 중요만)
5. 날짜 범위 선택 후 [적용] 클릭
   - Expected: 필터 적용되고 결과 업데이트

- [ ] **Step 3: 무한 스크롤 테스트**

1. 목록을 끝까지 스크롤
2. Expected: 자동으로 10개 더 로드 ("더 불러오는 중..." 표시)
3. 계속 스크롤해서 여러 번 반복 확인

- [ ] **Step 4: 중요 표시 테스트**

1. ☆ (빈 별) 클릭
   - Expected: ⭐ (채워진 별)로 변경
2. ⭐ 클릭
   - Expected: ☆로 변경
3. 중요만 필터 체크 후 [적용]
   - Expected: 중요 표시된 사건만 표시

- [ ] **Step 5: 상태 다중 선택 테스트**

1. 필터 열기 → 상태에서 "진행 중"과 "대기" 체크
2. [적용] 클릭
   - Expected: 진행중 또는 대기 상태의 사건만 표시

- [ ] **Step 6: 필터 초기화 테스트**

1. 여러 필터 적용
2. [초기화] 버튼 클릭
   - Expected: 필터 초기화, 초기 20건 복원

- [ ] **Step 7: 모바일 반응형 테스트** (선택사항)

```bash
# DevTools에서 모바일 뷰 (375px) 확인
```

Expected: 필터 모달이 하단 시트로 표시됨 (향후 CSS 개선 가능)

- [ ] **Step 8: 버그 발견 시 수정**

발견된 버그:
- 검색 쿼리 오류 → actions.ts의 searchCases 수정
- UI 레이아웃 이상 → case-filter-client.tsx의 CSS 수정
- 성능 이슈 → useEffect 의존성 배열 최적화

각 수정 후 다시 테스트

- [ ] **Step 9: 최종 Commit (테스트 완료)**

```bash
git add -A
git commit -m "test: manual testing completed, all features working"
```

---

## Task 7: 통합 체크리스트

- [ ] 모든 필터 조건 조합 테스트 (검색 + 날짜 + 담당자 + 상태 + 중요)
- [ ] 검색 결과 0건일 때 UI 확인
- [ ] 무한 스크롤 중 필터 변경 후 동작 확인
- [ ] 중요 표시 토글 후 "중요만" 필터에서 반영 확인
- [ ] 브라우저 콘솔 에러 없음 확인
- [ ] TypeScript 타입 에러 없음 확인 (`npx tsc --noEmit`)

---

## 주요 설계 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| **필터 위치** | 모달 | 모바일 친화적, 화면 공간 효율적 |
| **필터 적용** | 버튼 클릭 | 불필요한 쿼리 방지, 명확한 UX |
| **무한 스크롤** | Intersection Observer | 성능 최적화, native API |
| **초기 로드** | 20건 | 초기 로딩 속도 vs 데이터 양 균형 |
| **URL 저장** | 없음 | 세션용 필터, 간단한 구현 |

---

## 예상 소요 시간

- Task 1 (searchCases): 5-10분
- Task 2 (toggleStarred): 3-5분
- Task 3 (CaseFilterClient): 20-30분
- Task 4 (무한 스크롤): 10-15분
- Task 5 (page.tsx 리팩토링): 10-15분
- Task 6 (수동 테스트): 20-30분
- **총 합계: 70-100분**

---

## 완료 후 다음 단계

- [ ] 성능 모니터링 (검색 속도, 쿼리 시간)
- [ ] 추가 UI 개선 (모바일 모달 스타일링)
- [ ] E2E 테스트 추가 (Playwright/Cypress)
- [ ] 사용자 피드백 수집
