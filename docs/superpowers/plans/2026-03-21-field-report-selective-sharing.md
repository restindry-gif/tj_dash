# Field Report Selective Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable staff and admin to selectively share field reports with customers, so customers only see reports marked for sharing.

**Architecture:**
- Add `is_shared_with_customer` boolean column to `case_reports` table (default: false)
- Add share toggle UI in admin/staff reports panel
- Filter customer view to show only shared reports
- Use optimistic state management for immediate UI feedback

**Tech Stack:**
- Next.js 16, React, TypeScript, Supabase (PostgreSQL)
- Server actions for data mutation
- Tailwind CSS for styling

---

## File Structure

**Files to modify:**
1. `supabase/migrations/[timestamp]_add_shared_column.sql` - NEW - Add column to case_reports
2. `src/app/admin/cases/[id]/reports-panel.tsx` - Modify - Add share toggle button to each card
3. `src/app/admin/cases/actions.ts` - Modify - Add toggleReportShare server action
4. `src/app/customer/cases/[id]/page.tsx` - Modify - Filter reports by is_shared_with_customer
5. `src/lib/types/report.ts` - NEW - Define Report interface with new field

---

## Task 1: Define Report Type with is_shared_with_customer

**Files:**
- Create: `src/lib/types/report.ts`

**Rationale:** Extract Report interface to shared location for reuse across components. Makes the `is_shared_with_customer` field available everywhere.

- [ ] **Step 1: Create report types file with interface**

```typescript
// src/lib/types/report.ts
export interface Report {
  id: string
  case_id: string
  report_type: 'text' | 'location' | 'photo' | 'voice' | 'route'
  content: string | null
  address: string | null
  lat: number | null
  lng: number | null
  media_url: string | null
  is_live: boolean
  is_shared_with_customer: boolean  // ← NEW FIELD
  created_at: string
  session_id: string | null
  total_points: number | null
  distance_km: number | null
  profiles: { full_name: string } | null
}
```

- [ ] **Step 2: Verify types file is created**

Run: `test -f src/lib/types/report.ts && echo "✓ File created"`

---

## Task 2: Create Database Migration for is_shared_with_customer

**Files:**
- Create: `supabase/migrations/[YYYYMMDD]_add_report_sharing.sql`

**Rationale:** Add boolean column with default false. This is a non-breaking change — existing reports default to private.

- [ ] **Step 1: Create migration file**

Use timestamp: `20260321120000_add_report_sharing.sql`

```sql
-- supabase/migrations/20260321120000_add_report_sharing.sql

-- Add is_shared_with_customer column to case_reports
ALTER TABLE case_reports
ADD COLUMN is_shared_with_customer BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering by share status (improves query performance)
CREATE INDEX idx_case_reports_shared_status ON case_reports(case_id, is_shared_with_customer);

-- Add comment documenting the column
COMMENT ON COLUMN case_reports.is_shared_with_customer IS 'Whether this report is shared with the customer. Customers can only see reports marked as shared.';
```

- [ ] **Step 2: Verify migration file is created**

Run: `ls -la supabase/migrations/*report_sharing*`
Expected: Migration file should be visible

---

## Task 3: Add toggleReportShare Server Action

**Files:**
- Modify: `src/app/admin/cases/actions.ts`

**Rationale:** Server action handles authorization and database mutation. Use service role to bypass RLS for admin operations.

- [ ] **Step 1: Read current file to understand structure**

Read: `src/app/admin/cases/actions.ts`

- [ ] **Step 2: Add toggleReportShare function**

```typescript
// Add to src/app/admin/cases/actions.ts

import { createAdminClient } from '@/lib/supabase/admin'  // Use service role for admin operations

export async function toggleReportShare(
  reportId: string,
  caseId: string,
  shouldShare: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = createAdminClient()

    // Verify report belongs to this case
    const { data: report, error: fetchError } = await supabase
      .from('case_reports')
      .select('id, case_id')
      .eq('id', reportId)
      .eq('case_id', caseId)
      .single()

    if (fetchError || !report) {
      return { error: 'Report not found' }
    }

    // Toggle share status
    const { error: updateError } = await supabase
      .from('case_reports')
      .update({ is_shared_with_customer: shouldShare })
      .eq('id', reportId)
      .eq('case_id', caseId)

    if (updateError) {
      console.error('Toggle share error:', updateError)
      return { error: 'Failed to update share status' }
    }

    // Revalidate customer case page to reflect changes
    revalidatePath(`/customer/cases/${caseId}`)

    return {}
  } catch (err) {
    console.error('toggleReportShare error:', err)
    return { error: 'An error occurred' }
  }
}
```

- [ ] **Step 3: Verify function is added correctly**

Run: `grep -n "toggleReportShare" src/app/admin/cases/actions.ts`
Expected: Function definition visible with 'use server' pragma

- [ ] **Step 4: Commit this change**

```bash
git add src/app/admin/cases/actions.ts src/lib/types/report.ts
git commit -m "feat: add toggleReportShare server action and Report type"
```

---

## Task 4: Add Share Toggle Button to Reports Panel (Admin/Staff View)

**Files:**
- Modify: `src/app/admin/cases/[id]/reports-panel.tsx`

**Rationale:** Add share/unshare button to each report card. Use optimistic state management for instant feedback while server updates in background.

- [ ] **Step 1: Update imports**

Add at top of file:
```typescript
import { toggleReportShare } from '../actions'
import { useTransition } from 'react'
import type { Report } from '@/lib/types/report'
```

- [ ] **Step 2: Convert ReportsPanel to client component and add share toggle**

Wrap the component in a new client component `ReportCard`:

```typescript
// Create new component in same file before ReportsPanel export

'use client'

import { useTransition } from 'react'
import { toggleReportShare } from '../actions'
import type { Report } from '@/lib/types/report'

function ReportCard({
  report,
  caseId,
  routePts
}: {
  report: Report
  caseId: string
  routePts?: [number, number][]
}) {
  const [isPending, startTransition] = useTransition()
  const [isShared, setIsShared] = useState(report.is_shared_with_customer)

  const handleToggleShare = () => {
    const newState = !isShared
    setIsShared(newState)
    startTransition(async () => {
      const result = await toggleReportShare(report.id, caseId, newState)
      if (result?.error) {
        // Revert on error
        setIsShared(!newState)
      }
    })
  }

  const cfg = TYPE_CONFIG[report.report_type] ?? TYPE_CONFIG.text
  const memo = report.report_type === 'route' && report.content
    ? report.content.split('\n').slice(1).join('\n').trim()
    : null

  return (
    <div
      key={report.id}
      className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${cfg.accent} rounded-xl overflow-hidden`}
    >
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          {/* 타입 아이콘 */}
          <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          {/* 타입 배지 */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {/* LIVE */}
          {report.is_live && (
            <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          )}
          {/* 보고자 */}
          {report.profiles?.full_name && (
            <span className="text-xs text-slate-400">{report.profiles.full_name}</span>
          )}
        </div>
        {/* 시간 + 공유 토글 + 링크복사 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 공유 토글 버튼 */}
          <button
            onClick={handleToggleShare}
            disabled={isPending}
            title={isShared ? '공유 중단' : '고객과 공유'}
            className={`p-1.5 rounded-lg transition-all ${
              isPending ? 'opacity-50' : ''
            } ${
              isShared
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isShared ? (
                <>
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </>
              ) : (
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              )}
            </svg>
          </button>
          <CopyLinkButton path={`/reports/${report.id}`} />
          <time className="text-xs text-slate-500 tabular-nums">
            {formatDateTime(report.created_at, {
              month: 'numeric', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </time>
        </div>
      </div>

      {/* 카드 바디 - 나머지는 원래 코드 유지 */}
      {/* ... rest of card body ... */}
    </div>
  )
}
```

- [ ] **Step 3: Update ReportsPanel to use new ReportCard component**

Replace the map function:
```typescript
// Replace: (reports as Report[]).map((report) => { ... })
// With:
<>
  {(reports as Report[]).map((report) => {
    const routePts = report.session_id ? routePointsMap[report.session_id] : undefined
    return <ReportCard key={report.id} report={report} caseId={caseId} routePts={routePts} />
  })}
</>
```

- [ ] **Step 4: Verify changes compile**

Run: `npm run build 2>&1 | head -30`
Expected: No TypeScript errors related to reports-panel

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/cases/[id]/reports-panel.tsx
git commit -m "feat: add share toggle button to report cards in admin view"
```

---

## Task 5: Filter Customer View to Show Only Shared Reports

**Files:**
- Modify: `src/app/customer/cases/[id]/page.tsx`

**Rationale:** Customer only sees reports where `is_shared_with_customer = true`. Prevents access to private reports.

- [ ] **Step 1: Read current customer case page**

Read: `src/app/customer/cases/[id]/page.tsx`

- [ ] **Step 2: Update query to filter by is_shared_with_customer**

Find the query that fetches reports and modify it:

```typescript
// Original (if exists):
// const { data: reports } = await supabase
//   .from('case_reports')
//   .select('...')
//   .eq('case_id', caseId)

// Updated:
const { data: reports } = await supabase
  .from('case_reports')
  .select('*')
  .eq('case_id', caseId)
  .eq('is_shared_with_customer', true)  // ← ADD THIS LINE
  .order('created_at', { ascending: false })
```

If no reports query exists, add:
```typescript
const { data: reports } = await supabase
  .from('case_reports')
  .select('*')
  .eq('case_id', caseId)
  .eq('is_shared_with_customer', true)
  .order('created_at', { ascending: false })
```

- [ ] **Step 3: Update any ReportsPanel/report display component**

If ReportsPanel is used in customer view, verify it receives only shared reports. If needed, add a prop to disable the share button:

```typescript
// If ReportsPanel used in customer view, update signature:
export async function ReportsPanel({
  caseId,
  isCustomerView = false
}: {
  caseId: string
  isCustomerView?: boolean
}) {
  // ... existing code ...
  // In ReportCard, conditionally render share button:
  {!isCustomerView && (
    <button onClick={handleToggleShare} ...>
      {/* share toggle button */}
    </button>
  )}
}
```

- [ ] **Step 4: Verify page renders without errors**

Run: `npm run build 2>&1 | grep -i "customer.*case.*error" || echo "✓ No errors"`

- [ ] **Step 5: Commit**

```bash
git add src/app/customer/cases/[id]/page.tsx
git commit -m "feat: filter reports to show only shared ones in customer view"
```

---

## Task 6: Verification & Testing

**Rationale:** Verify feature works end-to-end: admin can toggle, customer sees only shared reports.

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (in background or separate terminal)
Expected: http://localhost:3000 accessible

- [ ] **Step 2: Verify migration runs**

Check Supabase: Column `is_shared_with_customer` should exist on `case_reports` with default false.

Run in Supabase console:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'case_reports'
AND column_name = 'is_shared_with_customer';
```

Expected output:
```
column_name | data_type | column_default
is_shared_with_customer | boolean | false
```

- [ ] **Step 3: Create a test report in database**

Insert test case report via Supabase:
```sql
INSERT INTO case_reports (case_id, report_type, content, is_shared_with_customer)
SELECT id, 'text', 'Test shared report', true FROM cases LIMIT 1;

INSERT INTO case_reports (case_id, report_type, content, is_shared_with_customer)
SELECT id, 'text', 'Test private report', false FROM cases LIMIT 1;
```

- [ ] **Step 4: Test admin view (reports-panel)**

1. Navigate to admin case detail page
2. Find reports panel
3. Verify share toggle button visible on each report
4. Click toggle on one report (should change color/state instantly)
5. Verify toggle state persists after page refresh

Expected: Share button shows different state (green when shared, gray when not)

- [ ] **Step 5: Test customer view**

1. Navigate to customer case detail page
2. Verify only reports with `is_shared_with_customer = true` are visible
3. The private report should NOT appear
4. Go back to admin view, toggle a report to shared
5. Refresh customer view - new shared report should appear

Expected: Customer only sees shared reports

- [ ] **Step 6: Test error handling**

Simulate failure by temporarily breaking the server action. Verify:
- UI reverts on error
- Error message appears (or silent revert is acceptable)

- [ ] **Step 7: Commit final verification**

```bash
git add -A
git commit -m "feat: field report selective sharing complete and verified"
```

---

## Notes

- **Migration**: Existing reports default to `is_shared_with_customer = false` (private by default)
- **Performance**: Index added on `(case_id, is_shared_with_customer)` for efficient filtering
- **Permissions**: Uses service role client for admin operations (bypasses RLS)
- **UX**: Share toggle provides instant feedback with optimistic state management
- **Next steps**: Could add bulk share/unshare actions if needed

