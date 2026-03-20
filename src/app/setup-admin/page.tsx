import { createClient } from '@supabase/supabase-js'
import { CopySQLButton, RefreshButton } from './copy-button'

export const dynamic = 'force-dynamic'

export default async function SetupAdminPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = 'admin@tj-detective.com'
  const password = '1234'

  try {
    // Step 1: Check if profiles table exists
    console.log('프로필 테이블 확인 중...')
    const { error: tableCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)

    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      // 테이블이 없음
      return (
        <div className="p-8 max-w-2xl">
          <h1 className="text-red-600 font-bold text-xl mb-4">⚠️ 데이터베이스 설정 필요</h1>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-yellow-700 mb-2">
              <strong>현재 상태:</strong> profiles 테이블이 존재하지 않습니다.
            </p>
            <p className="text-yellow-700">
              아래 지침을 따라 설정을 완료하세요.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h2 className="font-bold text-blue-900 mb-3">✅ 설정 방법</h2>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">1</span>
                  <span>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      Supabase 대시보드
                    </a>에 접속하세요
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">2</span>
                  <span>SQL Editor → New Query 메뉴를 선택하세요</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">3</span>
                  <span>
                    아래 SQL을 모두 복사하여 붙여넣기하고 "Run" 버튼을 클릭하세요
                  </span>
                </li>
              </ol>
            </div>

            <div className="bg-gray-100 p-4 rounded font-mono text-xs overflow-auto max-h-96">
              <pre className="text-gray-800">{`-- Create profiles table
create table public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id):`}</pre>
            </div>

            <CopySQLButton />

            <p className="text-sm text-gray-600 mt-4">
              4️⃣ SQL 실행 후 이 페이지를 새로고침하면 관리자 계정이 자동으로 생성됩니다.
            </p>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>에러:</strong> {tableCheckError.message}
            </p>
          </div>
        </div>
      )
    }

    // Step 2: 기존 유저 삭제
    console.log('기존 관리자 계정 확인 중...')
    try {
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = allUsers.users.find(u => u.email === email)

      if (targetUser) {
        await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
        console.log('기존 관리자 계정 삭제됨')
        // 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (err) {
      console.log('기존 유저 확인 중 에러 (무시함):', err)
    }

    // Step 3: 신규 관리자 계정 생성
    console.log('새 관리자 계정 생성 중...')
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: '최고관리자' }
    })

    if (createError) {
      console.error('사용자 생성 에러:', createError)
      return (
        <div className="p-8 max-w-2xl">
          <h1 className="text-red-600 font-bold text-xl mb-4">❌ 계정 생성 실패</h1>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">
              <strong>에러:</strong> {createError.message}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <p><strong>해결 방법:</strong></p>
            <ol className="list-decimal ml-5 space-y-2">
              <li>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Supabase 대시보드
                </a>에 접속하세요
              </li>
              <li>SQL Editor에서 다음을 실행하세요:
                <div className="bg-gray-100 p-3 mt-2 rounded font-mono text-xs overflow-auto">
                  <pre>{`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- profiles 테이블 생성
create table public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);
alter table public.profiles enable row level security;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);`}</pre>
                </div>
              </li>
              <li>그 후 이 페이지를 새로고침하세요</li>
            </ol>
          </div>

          <div className="mt-6">
            <RefreshButton />
          </div>
        </div>
      )
    }

    if (!newUser.user) {
      return (
        <div className="p-8">
          <h1 className="text-red-600 font-bold">생성 실패</h1>
          <p>사용자 생성 후 데이터를 받을 수 없습니다.</p>
        </div>
      )
    }

    // Step 4: 프로필 레코드 생성 (트리거에 의존하지 않음)
    console.log('프로필 레코드 생성 중...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        full_name: '최고관리자',
        role: 'admin'
      })

    if (profileError && profileError.code !== 'PGRST103') {
      // PGRST103은 중복 키 에러인데 이건 무시
      console.error('프로필 생성 에러:', profileError)
    }

    return (
      <div className="p-8 space-y-4 max-w-2xl">
        <h1 className="text-green-600 font-bold text-2xl">✅ 관리자 계정 생성 완료!</h1>
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded">
          <p className="mb-3"><strong>🆔 아이디 (로그인ID):</strong></p>
          <p className="font-mono text-lg bg-white p-2 rounded text-gray-800 mb-4 select-all">{email}</p>

          <p className="mb-3"><strong>🔑 비밀번호:</strong></p>
          <p className="font-mono text-lg bg-white p-2 rounded text-gray-800 select-all">{password}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>⚠️ 중요:</strong> 로그인 후 반드시 비밀번호를 변경하세요!
          </p>
        </div>

        <p className="text-gray-600">이제 아래 버튼을 눌러 로그인하세요.</p>
        <a
          href="/login"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded shadow hover:bg-indigo-700 font-semibold text-lg"
        >
          로그인 페이지로 이동 →
        </a>
      </div>
    )
  } catch (error) {
    console.error('설정 중 예상 외 에러:', error)
    return (
      <div className="p-8">
        <h1 className="text-red-600 font-bold">예상 외 에러 발생</h1>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {String(error)}
        </pre>
      </div>
    )
  }
}
