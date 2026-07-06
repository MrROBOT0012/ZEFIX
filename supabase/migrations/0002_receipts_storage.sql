-- ============================================================
-- Storage policies for the "receipts" bucket
-- Apply via Supabase Dashboard > SQL Editor, or supabase db push.
-- The bucket itself is created by supabase/setup-storage.js
-- (private, so photos/PDFs are only reachable via signed URLs).
-- ============================================================

CREATE POLICY authenticated_full_access_receipts
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');
