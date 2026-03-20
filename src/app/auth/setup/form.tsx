import { setupAdminAction } from '@/app/auth/actions'
import SetupAdminFormContent from './form-content'

export default function SetupAdminForm() {
  return (
    <form action={setupAdminAction} className="w-full space-y-4">
      <SetupAdminFormContent />
    </form>
  )
}
