# Supabase 초기 설정 가이드

## 1단계: SQL Editor에서 다음 명령 실행

Supabase 대시보드 → SQL Editor → New Query에서 아래 SQL을 복사하여 실행하세요:

```sql
-- Create profiles table
create table if not exists public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Function to create profile on user signup
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

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 2단계: 관리자 생성

브라우저에서 `http://localhost:3000/setup-admin` 접속

이 페이지는 자동으로:
1. 기존 admin@tj-detective.com 계정 삭제 (있으면)
2. 새 admin@tj-detective.com 계정 생성
3. 프로필 테이블에 admin 권한으로 저장

## 3단계: 로그인 시도

생성 완료 후 "로그인 페이지로 이동" 버튼을 클릭

- **아이디**: admin@tj-detective.com
- **비밀번호**: 1234
