-- 1. Create the 'music' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files (Select)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'music');

-- 3. Allow authenticated users to upload files (Insert)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'music');

-- 4. Allow authenticated users to update their own files (Update)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'music' AND owner = auth.uid())
WITH CHECK (bucket_id = 'music' AND owner = auth.uid());

-- 5. Allow authenticated users to delete their own files (Delete)
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'music' AND owner = auth.uid());
