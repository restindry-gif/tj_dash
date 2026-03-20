/* Create custom types */
create type user_role as enum ('admin', 'staff', 'customer');
create type case_status as enum ('pending', 'active', 'completed', 'cancelled');

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  role user_role default 'customer'::user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create cases table
create table public.cases (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status case_status default 'pending'::case_status,
  client_id uuid references public.profiles(id) not null,
  assigned_staff_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.cases enable row level security;

-- RLS Policies for Profiles
-- 1. Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- 2. Staff can view all profiles (to see client details)
create policy "Staff can view all profiles"
  on public.profiles for select
  using ( auth.uid() in ( select id from public.profiles where role = 'staff' ) );

-- 3. Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- 4. Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- RLS Policies for Cases
-- 1. Admins can view all cases
create policy "Admins can view all cases"
  on public.cases for select
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- 2. Staff can view all cases (collaborative environment)
create policy "Staff can view all cases"
  on public.cases for select
  using ( auth.uid() in ( select id from public.profiles where role = 'staff' ) );

-- 3. Customers can view ONLY their own cases
create policy "Customers can view own cases"
  on public.cases for select
  using ( auth.uid() = client_id );

-- 4. Admins can insert/update cases
create policy "Admins can manage cases"
  on public.cases for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
