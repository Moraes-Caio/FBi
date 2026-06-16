DO $$
BEGIN
  -- Add new columns to user and restaurant tables
  ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS username text;
  ALTER TABLE public.config_restaurantes ADD COLUMN IF NOT EXISTS logo_url text;
  ALTER TABLE public.config_restaurantes ADD COLUMN IF NOT EXISTS detalhes text;
END $$;

-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "Give public access to logos" ON storage.objects;
  CREATE POLICY "Give public access to logos" ON storage.objects 
    FOR SELECT USING (bucket_id = 'logos');

  DROP POLICY IF EXISTS "Allow authenticated insert to logos" ON storage.objects;
  CREATE POLICY "Allow authenticated insert to logos" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

  DROP POLICY IF EXISTS "Allow authenticated update to logos" ON storage.objects;
  CREATE POLICY "Allow authenticated update to logos" ON storage.objects 
    FOR UPDATE TO authenticated USING (bucket_id = 'logos');

  DROP POLICY IF EXISTS "Allow authenticated delete to logos" ON storage.objects;
  CREATE POLICY "Allow authenticated delete to logos" ON storage.objects 
    FOR DELETE TO authenticated USING (bucket_id = 'logos');
END $$;

-- Ensure avatars bucket also exists and has policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Give public access to avatars" ON storage.objects;
  CREATE POLICY "Give public access to avatars" ON storage.objects 
    FOR SELECT USING (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Allow authenticated insert to avatars" ON storage.objects;
  CREATE POLICY "Allow authenticated insert to avatars" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Allow authenticated update to avatars" ON storage.objects;
  CREATE POLICY "Allow authenticated update to avatars" ON storage.objects 
    FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Allow authenticated delete to avatars" ON storage.objects;
  CREATE POLICY "Allow authenticated delete to avatars" ON storage.objects 
    FOR DELETE TO authenticated USING (bucket_id = 'avatars');
END $$;
