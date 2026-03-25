-- 통화 분석 보고서 테이블
CREATE TABLE IF NOT EXISTS call_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  transcript TEXT NOT NULL,
  result JSONB NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_call_reports_name ON call_reports(name);
CREATE INDEX IF NOT EXISTS idx_call_reports_saved_at ON call_reports(saved_at DESC);

-- RLS 정책 (필요시 조정)
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 설정
CREATE POLICY "Enable read access for all users" ON call_reports
  FOR SELECT USING (true);

-- 모든 사용자가 삽입할 수 있도록 설정
CREATE POLICY "Enable insert access for all users" ON call_reports
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 삭제할 수 있도록 설정
CREATE POLICY "Enable delete access for all users" ON call_reports
  FOR DELETE USING (true);
