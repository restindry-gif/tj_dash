-- supabase/migrations/20260321120000_add_report_sharing.sql

-- Add is_shared_with_customer column to case_reports
ALTER TABLE case_reports
ADD COLUMN is_shared_with_customer BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering by share status (improves query performance)
CREATE INDEX idx_case_reports_shared_status ON case_reports(case_id, is_shared_with_customer);

-- Add comment documenting the column
COMMENT ON COLUMN case_reports.is_shared_with_customer IS 'Whether this report is shared with the customer. Customers can only see reports marked as shared.';
