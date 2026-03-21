export interface Report {
  id: string
  case_id: string
  report_type: 'text' | 'location' | 'photo' | 'voice' | 'route'
  content: string | null
  address: string | null
  lat: number | null
  lng: number | null
  media_url: string | null
  is_live: boolean
  is_shared_with_customer: boolean
  original_requested: boolean | null
  client_checked: boolean | null
  client_comment: string | null
  created_at: string
  session_id: string | null
  total_points: number | null
  distance_km: number | null
  profiles: { full_name: string } | null
}
