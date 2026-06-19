DO $$
BEGIN
  -- Convert empty string usernames to NULL to avoid duplicate key errors on unique constraint
  UPDATE public.usuarios SET username = NULL WHERE username = '';

  -- Cleanup duplicates for username if any still exist
  UPDATE public.usuarios 
  SET username = NULL 
  WHERE username IS NOT NULL 
    AND username IN (
      SELECT username FROM public.usuarios GROUP BY username HAVING COUNT(*) > 1
    );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key'
  ) THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_username_key UNIQUE (username);
  END IF;
END $$;

-- Fix RLS for usuarios
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Fix RLS for config_restaurantes
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.config_restaurantes;
CREATE POLICY "tenant_isolation_update" ON public.config_restaurantes
  FOR UPDATE TO authenticated USING (id = get_user_restaurante_id()) WITH CHECK (id = get_user_restaurante_id());

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar insert access" ON storage.objects;
CREATE POLICY "Avatar insert access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update access" ON storage.objects;
CREATE POLICY "Avatar update access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete access" ON storage.objects;
CREATE POLICY "Avatar delete access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- Policies for logos bucket
DROP POLICY IF EXISTS "Logos public access" ON storage.objects;
CREATE POLICY "Logos public access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Logos insert access" ON storage.objects;
CREATE POLICY "Logos insert access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Logos update access" ON storage.objects;
CREATE POLICY "Logos update access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Logos delete access" ON storage.objects;
CREATE POLICY "Logos delete access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
