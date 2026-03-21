# P1: 사건 검색 & 필터 기능 설계서

**작성일:** 2026-03-21
**작성자:** Claude
**상태:** 승인 대기

---

## Executive Summary

사건 목록 페이지(`/admin/cases`)에 고급 검색 & 필터 기능을 추가합니다.
- 🔍 키워드 검색 (사건명, 고객명, 상담내용)
- 📅 날짜 범위 필터
- 👤 담당자 필터
- ✓ 상태 필터
- ⭐ 중요 사건 표시 기능

**UI 방식:** 모달 필터 (반응형) + 무한 스크롤 + 검색 버튼 클릭 적용

---

## 1. 아키텍처

### 컴포넌트 분리

```
/admin/cases/
├── page.tsx (Server Component)
│   └─ 초기 데이터 20건 로드
│   └─ CaseFilterClient에 cases 전달
│
├── case-filter-client.tsx (Client Component)
│   └─ 필터 모달 UI
│   └─ 검색 입력 & 버튼
│   └─ 무한 스크롤 관리
│   └─ searchCases 호출
│
└── actions.ts (Server Action)
    └─ searchCases(params)
        └─ 필터/검색 로직 실행
        └─ DB 쿼리
```

### 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| **데이터 페칭** | Server Components | 초기 로드 최적화 |
| **필터 UI** | Client Component | 상호작용 필요 |
| **검색 실행** | Server Action | 보안 + DB 접근 |
| **스크롤** | Intersection Observer | 모바일 성능 |
| **URL 저장** | 없음 | 세션용 필터 |

---

## 2. 데이터베이스 스키마

### Cases 테이블 변경

```sql
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
```

### 추가된 인덱스

```sql
-- 검색 성능 (GIN + pg_trgm)
CREATE INDEX IF NOT EXISTS idx_cases_title_search ON cases USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_description_search ON cases USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_consultation_notes_search ON cases USING GIN (consultation_notes gin_trgm_ops);

-- 필터링 성능 (BTREE)
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_staff_id ON cases(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_cases_is_starred ON cases(is_starred);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
```

---

## 3. 필터 옵션 상세

### 3.1 검색 (Search)

```typescript
search?: string
```

**동작:**
- 사건명(`title`), 고객명(`profiles.full_name`), 상담내용(`consultation_notes`)에서 검색
- ILIKE 사용 (대소문자 무시, 한글 지원)
- 공백 기준으로 AND 검색

**예:** `"홍길동 채무"` → title OR notes에 "홍길동" AND "채무" 포함

### 3.2 날짜 범위 (Date Range)

```typescript
dateFrom?: string  // YYYY-MM-DD
dateTo?: string    // YYYY-MM-DD
```

**동작:**
- `created_at` 범위 필터
- 둘 다 선택하지 않으면 전체

### 3.3 담당자 (Assigned Staff)

```typescript
assignedStaffId?: string | null
```

**동작:**
- assigned_staff_id로 필터
- "전체" 선택 시 null 전달
- Dropdown에 직원 목록 표시

### 3.4 상태 (Status)

```typescript
statuses?: ('pending' | 'active' | 'completed' | 'cancelled')[]
```

**동작:**
- 다중 선택 가능 (체크박스)
- 선택 없으면 전체 상태

### 3.5 중요만 (Starred Only)

```typescript
starredOnly?: boolean
```

**동작:**
- `is_starred = true`인 사건만 필터
- 체크박스로 토글

---

## 4. UI 상세 설계

### 4.1 레이아웃

```
┌─ /admin/cases ─────────────────────────────────┐
│                                                 │
│  [🔍 검색입력] [필터 열기] [초기화] [검색]     │
│                                                 │
│  ┌─ 필터 모달 (display: none, 클릭 시 표시) ┐ │
│  │ 시작일: [date input]                     │ │
│  │ 종료일: [date input]                     │ │
│  │ 담당자: [dropdown]                       │ │
│  │ 상태: ☐진행중 ☐대기 ☐완료 ☐취소        │ │
│  │ ☐⭐ 중요만                              │ │
│  │ [적용] [초기화]                          │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  검색 결과: 24건                                │
│  ─────────────────────────────────────────     │
│  ⭐ 홍길동 사건 | 김철수 | 2024-03-01          │
│  ☆ 위치 추적   | 이영희 | 2024-02-28          │
│  ... (20건 표시)                                │
│  [스크롤 하단 도달 → 자동 로드]                │
│  🔄 로딩 중...                                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.2 모달 (Desktop)

- 위치: 화면 중앙 오버레이
- 크기: max-width 500px
- 닫기: X 버튼 또는 바깥쪽 클릭

### 4.3 모달 (Mobile)

- 위치: 하단 시트 (sheet modal)
- 높이: 최대 80vh
- 닫기: 위로 스와이프 또는 X 버튼

---

## 5. 구현 세부사항

### 5.1 초기 로드 (Server Component)

```typescript
// page.tsx
export default async function AdminCasesPage() {
  const cases = await searchCases({
    offset: 0,
    limit: 20,
  })

  return <CaseFilterClient initialCases={cases} />
}
```

### 5.2 검색 Server Action

```typescript
// actions.ts
export async function searchCases(params: {
  search?: string
  dateFrom?: string
  dateTo?: string
  assignedStaffId?: string | null
  statuses?: string[]
  starredOnly?: boolean
  offset: number
  limit: number
}) {
  const supabase = createDatabaseClient()

  let query = supabase
    .from('cases')
    .select('*, profiles!assigned_staff_id(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 검색
  if (params.search) {
    const terms = params.search.split(' ').filter(Boolean)
    for (const term of terms) {
      query = query.or(
        `title.ilike.%${term}%,consultation_notes.ilike.%${term}%`
      )
    }
  }

  // 날짜 범위
  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom)
  }
  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo)
  }

  // 담당자
  if (params.assignedStaffId !== undefined) {
    query = query.eq('assigned_staff_id', params.assignedStaffId)
  }

  // 상태
  if (params.statuses?.length) {
    query = query.in('status', params.statuses)
  }

  // 중요만
  if (params.starredOnly) {
    query = query.eq('is_starred', true)
  }

  // 페이지네이션
  query = query.range(params.offset, params.offset + params.limit - 1)

  const { data, error } = await query

  if (error) throw error
  return data
}
```

### 5.3 무한 스크롤 (Client Component)

```typescript
// case-filter-client.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { searchCases } from './actions'

export function CaseFilterClient({ initialCases }) {
  const [cases, setCases] = useState(initialCases)
  const [offset, setOffset] = useState(20) // 초기 20건 이후
  const [isLoading, setIsLoading] = useState(false)
  const observerTarget = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setIsLoading(true)
          const more = await searchCases({
            ...filterParams,
            offset,
            limit: 10,
          })
          setCases(prev => [...prev, ...more])
          setOffset(prev => prev + 10)
          setIsLoading(false)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [offset, isLoading, filterParams])

  // ... 나머지 UI
}
```

### 5.4 중요 표시 토글

```typescript
// 별 아이콘 클릭 시
export async function toggleStarred(caseId: string, isStarred: boolean) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({ is_starred: !isStarred })
    .eq('id', caseId)

  if (error) throw error

  // 클라이언트에서 UI 업데이트
}
```

---

## 6. 사용자 흐름 (User Flow)

### 기본 검색

1. 검색 입력창에 "홍길동" 입력
2. [검색] 버튼 클릭
3. searchCases 호출 (offset=0, limit=20)
4. 결과 표시 (최대 20건)

### 필터 적용

1. [필터 열기] 버튼 클릭 → 모달 표시
2. 담당자 "김철수" 선택
3. 상태 체크: "진행 중", "대기"
4. [적용] 버튼 클릭
5. searchCases 호출 (검색어 + 필터 조건)
6. 결과 업데이트

### 무한 스크롤

1. 목록 스크롤 하단 도달
2. Intersection Observer 감지
3. searchCases 호출 (offset=20, limit=10)
4. 기존 목록에 10건 추가
5. offset을 30으로 업데이트
6. 반복...

---

## 7. 에러 처리

| 상황 | 처리 |
|------|------|
| 검색 쿼리 실패 | 토스트 에러 메시지 표시 |
| 네트워크 오류 (무한 스크롤) | 재시도 버튼 표시 |
| 검색 결과 0건 | "검색 결과가 없습니다" 메시지 |
| 중요 표시 토글 실패 | 토스트 에러 + 상태 롤백 |

---

## 8. 성능 최적화

| 항목 | 전략 |
|------|------|
| **DB 쿼리** | GIN 인덱스 (검색) + BTREE 인덱스 (필터) |
| **초기 로드** | Server Component에서 20건만 가져오기 |
| **무한 스크롤** | Intersection Observer (효율적) |
| **캐싱** | Next.js ISR 미사용 (실시간 업데이트 필요) |

---

## 9. 테스트 체크리스트

- [ ] 키워드 검색 (한글 포함)
- [ ] 날짜 범위 필터
- [ ] 담당자 필터
- [ ] 상태 다중 선택
- [ ] 중요만 필터
- [ ] 필터 초기화
- [ ] 무한 스크롤 (20 → 30 → 40...)
- [ ] 모바일 반응형 (모달 시트)
- [ ] 중요 표시 토글
- [ ] 에러 처리

---

## 10. 마이그레이션 계획

1. ✅ DB 스키마 변경 (is_starred 추가, 인덱스 생성)
2. 새 파일 생성:
   - `case-filter-client.tsx` (Client Component)
   - `actions.ts`에 `searchCases` 추가
3. `page.tsx` 리팩토링
4. E2E 테스트
5. 배포

---

**설계 승인 상태:** ⏳ 검토 중
