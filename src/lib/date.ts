/** 한국 표준시(KST, Asia/Seoul)로 날짜/시간 포맷 */

const KST = 'Asia/Seoul'

export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
) {
  return new Date(date).toLocaleDateString('ko-KR', { timeZone: KST, ...options })
}

export function formatDateTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
) {
  return new Date(date).toLocaleString('ko-KR', { timeZone: KST, ...options })
}

export function formatTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }
) {
  return new Date(date).toLocaleTimeString('ko-KR', { timeZone: KST, ...options })
}
