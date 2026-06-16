CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Criação das novas tabelas solicitadas
CREATE TABLE IF NOT EXISTS public.usuarios (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    nome text,
    restaurante_id bigint references public.config_restaurantes(id),
    cargo text default 'gerente' check (cargo in ('admin','gerente','visualizador')),
    onboarding_completo boolean default false,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.mensagens_chat (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid references public.usuarios(id),
    sessao_id text not null,
    mensagem text not null,
    papel text not null check (papel in ('usuario','assistente')),
    contexto_pagina text,
    contexto_dados jsonb,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.insights (
    id uuid primary key default gen_random_uuid(),
    restaurante_id bigint references public.config_restaurantes(id),
    prioridade text not null check (prioridade in ('URGENTE','IMPORTANTE','OBSERVACAO')),
    categoria text,
    titulo text not null,
    descricao text,
    sugestao text,
    feedbacks_relacionados integer default 0,
    gerado_por text default 'ia' check (gerado_por in ('ia','manual')),
    ativo boolean default true,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.categorias (
    id uuid primary key default gen_random_uuid(),
    restaurante_id bigint references public.config_restaurantes(id),
    nome text not null,
    ativa boolean default true,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.relatorios (
    id uuid primary key default gen_random_uuid(),
    restaurante_id bigint references public.config_restaurantes(id),
    periodo text not null,
    dados_json jsonb,
    resumo_executivo text,
    url_pdf text,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid references public.usuarios(id),
    feedback_negativo boolean default true,
    insight_urgente boolean default true,
    resumo_diario boolean default false,
    canal_email boolean default true,
    canal_push boolean default false,
    canal_whatsapp boolean default false,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.perguntas_direcionadas (
    id uuid primary key default gen_random_uuid(),
    acao_id bigint references public.acoes_operacionais(id),
    pergunta text not null,
    ativa boolean default true,
    created_at timestamptz default now()
);

-- 2. Adição de colunas na tabela config_restaurantes
ALTER TABLE public.config_restaurantes 
ADD COLUMN IF NOT EXISTS config_insights jsonb default '{"feedbacks_por_analise": 10, "horas_entre_analises": 24, "max_importantes": 5, "max_observacoes": 3, "max_sugestoes_acoes_por_ciclo": 3}'::jsonb,
ADD COLUMN IF NOT EXISTS mascote_config jsonb default '{"nome": "Chef Pepê", "personalidade": "profissional_amigavel"}'::jsonb,
ADD COLUMN IF NOT EXISTS ultima_analise_insights timestamptz,
ADD COLUMN IF NOT EXISTS ultima_atualizacao_banner timestamptz,
ADD COLUMN IF NOT EXISTS texto_banner text;

-- 3. Atualização da constraint de status em acoes_operacionais
DO $DO$
BEGIN
  ALTER TABLE public.acoes_operacionais DROP CONSTRAINT IF EXISTS acoes_operacionais_status_check;
  
  ALTER TABLE public.acoes_operacionais ADD CONSTRAINT acoes_operacionais_status_check 
    CHECK (status IN ('SUGERIDA','PENDENTE','EM_ANDAMENTO','CONCLUIDO')) NOT VALID;
END $DO$;

-- 4. Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_direcionadas ENABLE ROW LEVEL SECURITY;

-- 5. Criação de RLS Policies Seguras (Idempotente)
DO $DO$
BEGIN
    -- usuarios
    DROP POLICY IF EXISTS "authenticated_select_usuarios" ON public.usuarios;
    CREATE POLICY "authenticated_select_usuarios" ON public.usuarios FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_usuarios" ON public.usuarios;
    CREATE POLICY "authenticated_insert_usuarios" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_usuarios" ON public.usuarios;
    CREATE POLICY "authenticated_update_usuarios" ON public.usuarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_usuarios" ON public.usuarios;
    CREATE POLICY "authenticated_delete_usuarios" ON public.usuarios FOR DELETE TO authenticated USING (true);

    -- mensagens_chat
    DROP POLICY IF EXISTS "authenticated_select_mensagens_chat" ON public.mensagens_chat;
    CREATE POLICY "authenticated_select_mensagens_chat" ON public.mensagens_chat FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_mensagens_chat" ON public.mensagens_chat;
    CREATE POLICY "authenticated_insert_mensagens_chat" ON public.mensagens_chat FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_mensagens_chat" ON public.mensagens_chat;
    CREATE POLICY "authenticated_update_mensagens_chat" ON public.mensagens_chat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_mensagens_chat" ON public.mensagens_chat;
    CREATE POLICY "authenticated_delete_mensagens_chat" ON public.mensagens_chat FOR DELETE TO authenticated USING (true);

    -- insights
    DROP POLICY IF EXISTS "authenticated_select_insights" ON public.insights;
    CREATE POLICY "authenticated_select_insights" ON public.insights FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_insights" ON public.insights;
    CREATE POLICY "authenticated_insert_insights" ON public.insights FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_insights" ON public.insights;
    CREATE POLICY "authenticated_update_insights" ON public.insights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_insights" ON public.insights;
    CREATE POLICY "authenticated_delete_insights" ON public.insights FOR DELETE TO authenticated USING (true);

    -- categorias
    DROP POLICY IF EXISTS "authenticated_select_categorias" ON public.categorias;
    CREATE POLICY "authenticated_select_categorias" ON public.categorias FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_categorias" ON public.categorias;
    CREATE POLICY "authenticated_insert_categorias" ON public.categorias FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_categorias" ON public.categorias;
    CREATE POLICY "authenticated_update_categorias" ON public.categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_categorias" ON public.categorias;
    CREATE POLICY "authenticated_delete_categorias" ON public.categorias FOR DELETE TO authenticated USING (true);

    -- relatorios
    DROP POLICY IF EXISTS "authenticated_select_relatorios" ON public.relatorios;
    CREATE POLICY "authenticated_select_relatorios" ON public.relatorios FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_relatorios" ON public.relatorios;
    CREATE POLICY "authenticated_insert_relatorios" ON public.relatorios FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_relatorios" ON public.relatorios;
    CREATE POLICY "authenticated_update_relatorios" ON public.relatorios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_relatorios" ON public.relatorios;
    CREATE POLICY "authenticated_delete_relatorios" ON public.relatorios FOR DELETE TO authenticated USING (true);

    -- preferencias_notificacao
    DROP POLICY IF EXISTS "authenticated_select_preferencias_notificacao" ON public.preferencias_notificacao;
    CREATE POLICY "authenticated_select_preferencias_notificacao" ON public.preferencias_notificacao FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_preferencias_notificacao" ON public.preferencias_notificacao;
    CREATE POLICY "authenticated_insert_preferencias_notificacao" ON public.preferencias_notificacao FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_preferencias_notificacao" ON public.preferencias_notificacao;
    CREATE POLICY "authenticated_update_preferencias_notificacao" ON public.preferencias_notificacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_preferencias_notificacao" ON public.preferencias_notificacao;
    CREATE POLICY "authenticated_delete_preferencias_notificacao" ON public.preferencias_notificacao FOR DELETE TO authenticated USING (true);

    -- perguntas_direcionadas
    DROP POLICY IF EXISTS "authenticated_select_perguntas_direcionadas" ON public.perguntas_direcionadas;
    CREATE POLICY "authenticated_select_perguntas_direcionadas" ON public.perguntas_direcionadas FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "authenticated_insert_perguntas_direcionadas" ON public.perguntas_direcionadas;
    CREATE POLICY "authenticated_insert_perguntas_direcionadas" ON public.perguntas_direcionadas FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_update_perguntas_direcionadas" ON public.perguntas_direcionadas;
    CREATE POLICY "authenticated_update_perguntas_direcionadas" ON public.perguntas_direcionadas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "authenticated_delete_perguntas_direcionadas" ON public.perguntas_direcionadas;
    CREATE POLICY "authenticated_delete_perguntas_direcionadas" ON public.perguntas_direcionadas FOR DELETE TO authenticated USING (true);
END $DO$;

-- 6. Seed do usuário administrador e ajuste de RLS pendente
DO $DO$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed do usuário
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'comercial@soulhappynutri.com.br') THEN
    new_user_id := gen_random_uuid();
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
      '{"name": "Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.usuarios (id, email, nome, cargo, onboarding_completo)
    VALUES (new_user_id, 'comercial@soulhappynutri.com.br', 'Admin', 'admin', true)
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- Correção do warning de RLS sem policies para Categorias de Emails
  DROP POLICY IF EXISTS "authenticated_select_categorias_emails" ON public."Categorias de Emails";
  CREATE POLICY "authenticated_select_categorias_emails" ON public."Categorias de Emails" FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "authenticated_insert_categorias_emails" ON public."Categorias de Emails";
  CREATE POLICY "authenticated_insert_categorias_emails" ON public."Categorias de Emails" FOR INSERT TO authenticated WITH CHECK (true);
  DROP POLICY IF EXISTS "authenticated_update_categorias_emails" ON public."Categorias de Emails";
  CREATE POLICY "authenticated_update_categorias_emails" ON public."Categorias de Emails" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "authenticated_delete_categorias_emails" ON public."Categorias de Emails";
  CREATE POLICY "authenticated_delete_categorias_emails" ON public."Categorias de Emails" FOR DELETE TO authenticated USING (true);
END $DO$;
