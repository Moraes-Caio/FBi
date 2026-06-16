DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key'
  ) THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_username_key UNIQUE (username);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public logos read" ON storage.objects;
CREATE POLICY "Public logos read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated logos insert" ON storage.objects;
CREATE POLICY "Authenticated logos insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated logos update" ON storage.objects;
CREATE POLICY "Authenticated logos update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos');

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
CREATE POLICY "Public avatars read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated avatars insert" ON storage.objects;
CREATE POLICY "Authenticated avatars insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated avatars update" ON storage.objects;
CREATE POLICY "Authenticated avatars update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
