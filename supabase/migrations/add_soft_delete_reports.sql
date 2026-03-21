-- 보고카드 소프트 삭제 (휴지통)
ALTER TABLE public.case_reports
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid        REFERENCES profiles(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_case_reports_deleted_at
  ON public.case_reports(deleted_at)
  WHERE deleted_at IS NOT NULL;
