import { createClient } from '@supabase/supabase-js'
import { RefreshButton } from './copy-button'

export const dynamic = 'force-dynamic'

const CLEANUP_SQL = `-- Supabase 데이터베이스 완전 초기화
-- 1. 기존 trigger와 function 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. profiles 테이블 생성 (trigger 없이)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- 5. RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. 정책 설정
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);`

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
    // Step 1: profiles 테이블 존재 확인
    console.log('📋 프로필 테이블 확인 중...')
    const { error: tableCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)

    // 테이블이 없으면 SQL 가이드 표시
    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      return (
        <div className="p-8 max-w-2xl">
          <h1 className="text-red-600 font-bold text-2xl mb-4">⚠️ Supabase 설정 필요</h1>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-yellow-700 font-semibold mb-2">profiles 테이블이 없습니다</p>
            <p className="text-yellow-700 text-sm">
              아래 SQL을 Supabase에서 실행해야 합니다.
            </p>
          </div>

          <div className="space-y-4">
            {/* 복사 가능한 SQL 박스 */}
            <div className="bg-gray-900 p-4 rounded font-mono text-xs overflow-auto max-h-96 text-green-400">
              <pre className="whitespace-pre-wrap">{CLEANUP_SQL}</pre>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(CLEANUP_SQL)
                alert('SQL이 클립보드에 복사되었습니다!')
              }}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
            >
              📋 위 SQL 복사하기
            </button>

            {/* 설정 단계 */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h2 className="font-bold text-blue-900 mb-3">✅ 설정 단계</h2>
              <ol className="space-y-2 text-sm text-blue-900">
                <li className="flex gap-3">
                  <span className="font-bold">1.</span>
                  <span>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-semibold"
                    >
                      Supabase 대시보드
                    </a>
                    에 로그인
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">2.</span>
                  <span>프로젝트 선택 → SQL Editor → New Query</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">3.</span>
                  <span>위 SQL을 붙여넣기하고 <strong>Run</strong> 클릭</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">4.</span>
                  <span>이 페이지를 새로고침</span>
                </li>
              </ol>
            </div>

            <div className="mt-6">
              <RefreshButton />
            </div>
          </div>
        </div>
      )
    }

    // Step 2: 기존 admin 계정 삭제
    console.log('🗑️ 기존 관리자 계정 확인 중...')
    try {
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = allUsers.users.find(u => u.email === email)

      if (targetUser) {
        console.log('❌ 기존 계정 삭제 중...')
        await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (err) {
      console.log('ℹ️ 기존 계정 없음 (정상)')
    }

    // Step 3: 새 관리자 계정 생성
    console.log('✨ 새 관리자 계정 생성 중...')
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: '최고관리자' }
    })

    if (createError) {
      console.error('❌ 사용자 생성 실패:', createError)

      return (
        <div className="p-8 max-w-2xl">
          <h1 className="text-red-600 font-bold text-2xl mb-4">⚠️ 계정 생성 실패</h1>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">
              <strong>에러:</strong> {createError.message}
            </p>
            <p className="text-red-600 text-sm mt-2">
              코드: {createError.code}
            </p>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <p className="text-orange-900 font-semibold mb-2">🔍 이 문제가 계속 발생하면:</p>
            <ol className="text-sm text-orange-900 space-y-2 list-decimal ml-5">
              <li>Supabase 대시보드에서 모든 trigger와 function 삭제</li>
              <li>위의 SQL을 실행하여 완전히 초기화</li>
              <li>이 페이지를 새로고침</li>
            </ol>
          </div>

          <div className="bg-gray-900 p-4 rounded font-mono text-xs overflow-auto max-h-40 text-red-400 mb-4">
            <pre className="whitespace-pre-wrap">{CLEANUP_SQL}</pre>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(CLEANUP_SQL)
              alert('SQL이 클립보드에 복사되었습니다!')
            }}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 mb-4"
          >
            📋 SQL 복사하기
          </button>

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

    // Step 4: 프로필 레코드 생성
    console.log('👤 프로필 레코드 생성 중...')
    const userId = newUser.user.id

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: '최고관리자',
        role: 'admin'
      })

    if (profileError) {
      console.error('⚠️ 프로필 생성 에러:', profileError)
      // 프로필 에러는 경고만 하고 계속 진행
    } else {
      console.log('✅ 프로필 생성 완료')
    }

    return (
      <div className="p-8 space-y-4 max-w-2xl">
        <h1 className="text-green-600 font-bold text-3xl">✅ 성공!</h1>

        <div className="bg-green-50 border-2 border-green-300 p-6 rounded">
          <p className="text-sm text-gray-600 mb-4">관리자 계정이 생성되었습니다</p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">🆔 로그인 ID</p>
              <p className="font-mono text-lg bg-white p-3 rounded border border-green-200 select-all">
                {email}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-1">🔑 비밀번호</p>
              <p className="font-mono text-lg bg-white p-3 rounded border border-green-200 select-all">
                {password}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700 font-semibold text-sm">
            ⚠️ 중요: 로그인 후 반드시 비밀번호를 변경하세요!
          </p>
        </div>

        <a
          href="/login"
          className="block w-full text-center bg-indigo-600 text-white px-6 py-3 rounded shadow hover:bg-indigo-700 font-semibold text-lg"
        >
          🔓 로그인 페이지로 이동
        </a>
      </div>
    )
  } catch (error) {
    console.error('💥 예상 외 에러:', error)
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-red-600 font-bold text-xl mb-4">💥 예상 외 에러</h1>
        <pre className="p-4 bg-red-50 rounded text-sm overflow-auto border border-red-200">
          {String(error)}
        </pre>
      </div>
    )
  }
}
