'use client'

import { useState } from 'react'

export function CopySQLButton() {
  const [copied, setCopied] = useState(false)

  const sql = `create table if not exists public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
alter table public.profiles enable row level security;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`w-full py-2 rounded font-semibold transition-colors ${
        copied
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {copied ? '✅ 복사됨!' : '📋 SQL 복사하기'}
    </button>
  )
}

export function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
    >
      🔄 새로고침
    </button>
  )
}
