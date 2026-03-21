-- ============================================================
-- 프로덕션 RLS 정책 (개발 완료 후 적용)
-- 현재는 "모든 허용" 개발 정책 사용 중
-- 배포 전 아래 정책으로 교체할 것
-- ============================================================

-- ── profiles ──────────────────────────────────────────────
-- 자기 프로필만 읽기/수정 가능. admin/staff는 전체 읽기.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
  );

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id);

-- ── cases ─────────────────────────────────────────────────
-- 고객: 자기 사건만 읽기. admin/staff: 전체.
drop policy if exists "cases_select" on cases;
create policy "cases_select" on cases for select
  using (
    client_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
  );

drop policy if exists "cases_insert_admin" on cases;
create policy "cases_insert_admin" on cases for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "cases_update_admin_staff" on cases;
create policy "cases_update_admin_staff" on cases for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
  );

-- ── case_reports ──────────────────────────────────────────
-- 고객: is_shared_with_customer=true 이고 deleted_at IS NULL인 것만 읽기
-- admin/staff: 전체 읽기 (deleted 포함)
drop policy if exists "reports_select_customer" on case_reports;
create policy "reports_select_customer" on case_reports for select
  using (
    -- admin/staff: 전체 허용
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
    or
    -- 고객: 공유된 것만, 삭제 안 된 것만
    (
      is_shared_with_customer = true
      and deleted_at is null
      and exists (
        select 1 from cases c
        where c.id = case_reports.case_id
          and c.client_id = auth.uid()
      )
    )
  );

drop policy if exists "reports_insert_staff" on case_reports;
create policy "reports_insert_staff" on case_reports for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
  );

drop policy if exists "reports_update_staff" on case_reports;
create policy "reports_update_staff" on case_reports for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
    -- 고객은 자기 사건의 보고에만 client_* 필드만 수정 가능 (서비스 롤 사용으로 우회)
  );

-- ── location_tracks ───────────────────────────────────────
drop policy if exists "tracks_admin_staff" on location_tracks;
create policy "tracks_admin_staff" on location_tracks for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','staff')
    )
  );

-- ============================================================
-- 주의: 고객 client_* 필드 수정은 서버 액션에서 service_role로 처리
-- (verifyReportOwnership으로 소유권 검증 후 업데이트)
-- ============================================================
