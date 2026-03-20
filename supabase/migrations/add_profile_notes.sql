-- Add notes column to profiles for customer special notes
alter table public.profiles add column if not exists notes text;
