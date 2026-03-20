
-- Add phone number to profiles
alter table public.profiles add column if not exists phone text;

-- Add consultation details to cases (optional, if separate table not needed yet)
alter table public.cases add column if not exists consultation_notes text;
alter table public.cases add column if not exists fee_amount decimal(12, 2);
