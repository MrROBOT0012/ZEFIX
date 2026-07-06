-- ============================================================
-- Storage policies for the "workbooks" bucket
-- Apply via Supabase Dashboard > SQL Editor, or supabase db push.
-- The bucket itself is created by supabase/setup-workbook-storage.js
-- (private — the synced Excel workbook is only reachable via signed URLs).
-- ============================================================

CREATE POLICY authenticated_full_access_workbooks
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'workbooks')
  WITH CHECK (bucket_id = 'workbooks');
