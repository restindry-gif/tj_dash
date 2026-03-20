alter table public.case_reports
  add column if not exists client_checked boolean default false,
  add column if not exists client_comment text;
