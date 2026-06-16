-- 1. Add avatar_url to usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Ensure feedbacks_restaurante has restaurante_id
ALTER TABLE public.feedbacks_restaurante ADD COLUMN IF NOT EXISTS restaurante_id BIGINT REFERENCES public.config_restaurantes(id);

-- 3. Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
CREATE POLICY "Avatar upload" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
CREATE POLICY "Avatar delete" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- 4. Create notificacoes table
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id BIGINT REFERENCES public.config_restaurantes(id),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    tipo TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Helper function for tenant isolation
CREATE OR REPLACE FUNCTION public.get_user_restaurante_id() RETURNS BIGINT AS $F$
  SELECT restaurante_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$F$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS for all required tables
ALTER TABLE public.config_restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks_restaurante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoes_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garcons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_direcionadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Clean existing isolation policies to make migration idempotent
DO $DO_BLOCK$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'config_restaurantes',
    'feedbacks_restaurante',
    'acoes_operacionais',
    'insights',
    'categorias',
    'garcons',
    'qr_codes',
    'relatorios',
    'notificacoes'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.%I', t);
  END LOOP;
END $DO_BLOCK$;

-- Apply RLS Policy for config_restaurantes (id matches restaurante_id)
CREATE POLICY "tenant_isolation_select" ON public.config_restaurantes 
  FOR SELECT TO authenticated USING (id = public.get_user_restaurante_id());
CREATE POLICY "tenant_isolation_update" ON public.config_restaurantes 
  FOR UPDATE TO authenticated USING (id = public.get_user_restaurante_id()) WITH CHECK (id = public.get_user_restaurante_id());

-- Apply RLS Policy for standard tables with restaurante_id
DO $DO_BLOCK$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'feedbacks_restaurante',
    'acoes_operacionais',
    'insights',
    'categorias',
    'garcons',
    'qr_codes',
    'relatorios',
    'notificacoes'
  ]) LOOP
    EXECUTE format('CREATE POLICY "tenant_isolation_select" ON public.%I FOR SELECT TO authenticated USING (restaurante_id = public.get_user_restaurante_id())', t);
    EXECUTE format('CREATE POLICY "tenant_isolation_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (restaurante_id = public.get_user_restaurante_id())', t);
    EXECUTE format('CREATE POLICY "tenant_isolation_update" ON public.%I FOR UPDATE TO authenticated USING (restaurante_id = public.get_user_restaurante_id()) WITH CHECK (restaurante_id = public.get_user_restaurante_id())', t);
    EXECUTE format('CREATE POLICY "tenant_isolation_delete" ON public.%I FOR DELETE TO authenticated USING (restaurante_id = public.get_user_restaurante_id())', t);
  END LOOP;
END $DO_BLOCK$;

-- Apply RLS Policy for perguntas_direcionadas (joined by acao_id)
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.perguntas_direcionadas;
CREATE POLICY "tenant_isolation_select" ON public.perguntas_direcionadas FOR SELECT TO authenticated 
USING (acao_id IN (SELECT id FROM public.acoes_operacionais WHERE restaurante_id = public.get_user_restaurante_id()));

DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.perguntas_direcionadas;
CREATE POLICY "tenant_isolation_insert" ON public.perguntas_direcionadas FOR INSERT TO authenticated 
WITH CHECK (acao_id IN (SELECT id FROM public.acoes_operacionais WHERE restaurante_id = public.get_user_restaurante_id()));

DROP POLICY IF EXISTS "tenant_isolation_update" ON public.perguntas_direcionadas;
CREATE POLICY "tenant_isolation_update" ON public.perguntas_direcionadas FOR UPDATE TO authenticated 
USING (acao_id IN (SELECT id FROM public.acoes_operacionais WHERE restaurante_id = public.get_user_restaurante_id()))
WITH CHECK (acao_id IN (SELECT id FROM public.acoes_operacionais WHERE restaurante_id = public.get_user_restaurante_id()));

DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.perguntas_direcionadas;
CREATE POLICY "tenant_isolation_delete" ON public.perguntas_direcionadas FOR DELETE TO authenticated 
USING (acao_id IN (SELECT id FROM public.acoes_operacionais WHERE restaurante_id = public.get_user_restaurante_id()));


-- 6. Seed Auth user
DO $SEED$
DECLARE
  new_user_id uuid;
  rest_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'comercial@soulhappynutri.com.br') THEN
    
    IF NOT EXISTS (SELECT 1 FROM public.config_restaurantes LIMIT 1) THEN
      INSERT INTO public.config_restaurantes (id, nome_restaurante, ativo) VALUES (1, 'Restaurante Teste', true) RETURNING id INTO rest_id;
    ELSE
      SELECT id INTO rest_id FROM public.config_restaurantes LIMIT 1;
    END IF;

    -- Check if user already exists in public.usuarios to avoid unique constraint violation and link tables properly
    SELECT id INTO new_user_id FROM public.usuarios WHERE email = 'comercial@soulhappynutri.com.br' LIMIT 1;
    IF new_user_id IS NULL THEN
      new_user_id := gen_random_uuid();
    END IF;
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'comercial@soulhappynutri.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin Soul Happy"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.usuarios (id, email, nome, restaurante_id, cargo)
    VALUES (new_user_id, 'comercial@soulhappynutri.com.br', 'Admin Soul Happy', rest_id, 'admin')
    ON CONFLICT (id) DO NOTHING;

    -- Seed mock feedbacks
    IF NOT EXISTS (SELECT 1 FROM public.feedbacks_restaurante WHERE restaurante_id = rest_id) THEN
      INSERT INTO public.feedbacks_restaurante (id, restaurante_id, texto_original, sentimento, categoria, created_at) VALUES 
        (1, rest_id, 'Comida maravilhosa, mas demorou muito.', 'neutral', 'Tempo de Espera', NOW() - INTERVAL '2 hours'),
        (2, rest_id, 'O garçom foi muito atencioso!', 'positivo', 'Atendimento', NOW() - INTERVAL '5 hours'),
        (3, rest_id, 'Achei o preço meio salgado pro tamanho da porção.', 'negativo', 'Preço', NOW() - INTERVAL '1 day');
    END IF;

    -- Seed mock notification
    INSERT INTO public.notificacoes (restaurante_id, titulo, mensagem, tipo) VALUES
      (rest_id, 'Bem-vindo ao Sistema', 'Sua conta foi configurada com sucesso.', 'info');
  END IF;
END $SEED$;
