alter table public.case_reports
  add column if not exists original_requested boolean default false;
