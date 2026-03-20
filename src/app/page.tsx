import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50 text-slate-900 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
          TJ 탐정 사무소
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          진실을 향한 끈질긴 추적. 프로페셔널한 탐정들이 당신의 고민을 해결해드립니다.
          <br />
          사건 의뢰부터 진행 상황 확인까지, 전용 대시보드에서 안전하게 관리하세요.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            href="/login"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-slate-900 text-white gap-2 hover:bg-slate-700 text-sm sm:text-base h-10 sm:h-12 px-8"
          >
            로그인 / 의뢰하기
          </Link>
          <a
            href="https://github.com/restindry-gif/tj_dash"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-solid border-black/[.08] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-8 sm:min-w-44"
          >
            GitHub 저장소
          </a>
        </div>
      </main>
      <footer className="mt-16 text-slate-500 text-sm">
        &copy; 2026 TJ Detective Agency. All rights reserved.
      </footer>
    </div>
  );
}
