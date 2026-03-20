import { logoutAction } from '@/app/auth/actions'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
      >
        로그아웃
      </button>
    </form>
  )
}
