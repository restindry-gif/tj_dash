/** 한국 표준시(KST, Asia/Seoul)로 날짜/시간 포맷 */

const KST = 'Asia/Seoul'

/** KST 기준 날짜 키 (YYYY-MM-DD) 반환 */
export function getKSTDateKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: KST })
}

/** 오늘의 KST 날짜 키 */
export function getKSTTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: KST })
}

/** 날짜 키 → 아코디언 라벨 (오늘/어제/M월 D일 (요일)) */
export function getDateGroupLabel(dateKey: string): string {
  const todayKey = getKSTTodayKey()
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: KST })
  const [y, mo, d] = dateKey.split('-').map(Number)
  // UTC 03:00 = KST 12:00 — 타임존 경계 안전하게 파싱
  const dt = new Date(Date.UTC(y, mo - 1, d, 3, 0, 0))
  const label = dt.toLocaleDateString('ko-KR', {
    timeZone: KST,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  if (dateKey === todayKey) return `오늘 · ${label}`
  if (dateKey === yesterdayKey) return `어제 · ${label}`
  return label
}

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
