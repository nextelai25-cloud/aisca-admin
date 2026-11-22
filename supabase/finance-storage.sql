-- ============================================================
-- File storage for finance bills, quotations, signed forms and slips.
-- Fixes "Upload failed: Bucket not found". Run ONCE in the Supabase
-- SQL editor. Safe to re-run.
-- ============================================================

-- Bucket: files are readable by link (names are random and unguessable),
-- max 10 MB, images and PDFs only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('finance_attachments', 'finance_attachments', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Logged-in admin users may upload. Nobody can overwrite or delete through
-- the website, so a recorded bill cannot be swapped later.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'finance_attachments_upload') THEN
    CREATE POLICY finance_attachments_upload ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'finance_attachments');
  END IF;
END $$;
