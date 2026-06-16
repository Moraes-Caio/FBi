-- Set up storage bucket for avatars
DO $do_block$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
END $do_block$;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Upload Access" ON storage.objects;
CREATE POLICY "Avatar Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Update Access" ON storage.objects;
CREATE POLICY "Avatar Update Access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;
CREATE POLICY "Avatar Delete Access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- RLS for usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
CREATE POLICY "usuarios_select_own" ON public.usuarios FOR SELECT TO authenticated USING (true); -- Allow seeing team members for TeamTab

DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own" ON public.usuarios FOR UPDATE TO authenticated USING (id = auth.uid());

-- RLS for config_restaurantes
ALTER TABLE public.config_restaurantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_select" ON public.config_restaurantes;
CREATE POLICY "tenant_isolation_select" ON public.config_restaurantes FOR SELECT TO authenticated USING (id = public.get_user_restaurante_id());

DROP POLICY IF EXISTS "tenant_isolation_update" ON public.config_restaurantes;
CREATE POLICY "tenant_isolation_update" ON public.config_restaurantes FOR UPDATE TO authenticated USING (id = public.get_user_restaurante_id()) WITH CHECK (id = public.get_user_restaurante_id());

-- RLS for garcons
ALTER TABLE public.garcons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_select" ON public.garcons;
CREATE POLICY "tenant_isolation_select" ON public.garcons FOR SELECT TO authenticated USING (restaurante_id = public.get_user_restaurante_id());

DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.garcons;
CREATE POLICY "tenant_isolation_insert" ON public.garcons FOR INSERT TO authenticated WITH CHECK (restaurante_id = public.get_user_restaurante_id());

DROP POLICY IF EXISTS "tenant_isolation_update" ON public.garcons;
CREATE POLICY "tenant_isolation_update" ON public.garcons FOR UPDATE TO authenticated USING (restaurante_id = public.get_user_restaurante_id());

DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.garcons;
CREATE POLICY "tenant_isolation_delete" ON public.garcons FOR DELETE TO authenticated USING (restaurante_id = public.get_user_restaurante_id());

-- Fix message_buffer RLS
ALTER TABLE public.message_buffer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_buffer_all" ON public.message_buffer;
CREATE POLICY "message_buffer_all" ON public.message_buffer FOR ALL TO authenticated USING (true);
