-- Migration: Add new tables and columns for Feedback Inteligente
-- Date: 2026-03-28

-- 1. Create new tables

-- usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT,
    restaurante_id BIGINT REFERENCES public.config_restaurantes(id),
    cargo TEXT DEFAULT 'gerente' CHECK (cargo IN ('admin','gerente','visualizador')),
    onboarding_completo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mensagens_chat
CREATE TABLE IF NOT EXISTS public.mensagens_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id),
    sessao_id TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('usuario','assistente')),
    contexto_pagina TEXT,
    contexto_dados JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- insights
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id BIGINT REFERENCES public.config_restaurantes(id),
    prioridade TEXT NOT NULL CHECK (prioridade IN ('URGENTE','IMPORTANTE','OBSERVACAO')),
    categoria TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    sugestao TEXT,
    feedbacks_relacionados INTEGER DEFAULT 0,
    gerado_por TEXT DEFAULT 'ia' CHECK (gerado_por IN ('ia','manual')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id BIGINT REFERENCES public.config_restaurantes(id),
    nome TEXT NOT NULL,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- relatorios
CREATE TABLE IF NOT EXISTS public.relatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id BIGINT REFERENCES public.config_restaurantes(id),
    periodo TEXT NOT NULL,
    dados_json JSONB,
    resumo_executivo TEXT,
    url_pdf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- preferencias_notificacao
CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id),
    feedback_negativo BOOLEAN DEFAULT true,
    insight_urgente BOOLEAN DEFAULT true,
    resumo_diario BOOLEAN DEFAULT false,
    canal_email BOOLEAN DEFAULT true,
    canal_push BOOLEAN DEFAULT false,
    canal_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- perguntas_direcionadas
CREATE TABLE IF NOT EXISTS public.perguntas_direcionadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acao_id BIGINT REFERENCES public.acoes_operacionais(id),
    pergunta TEXT NOT NULL,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to config_restaurantes
ALTER TABLE public.config_restaurantes 
ADD COLUMN IF NOT EXISTS config_insights JSONB DEFAULT '{"feedbacks_por_analise": 10, "horas_entre_analises": 24, "max_importantes": 5, "max_observacoes": 3, "max_sugestoes_acoes_por_ciclo": 3}'::jsonb,
ADD COLUMN IF NOT EXISTS mascote_config JSONB DEFAULT '{"nome": "Chef Pepê", "personalidade": "profissional_amigavel"}'::jsonb,
ADD COLUMN IF NOT EXISTS ultima_analise_insights TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ultima_atualizacao_banner TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS texto_banner TEXT;

-- 3. Modify acoes_operacionais constraint
DO $$
BEGIN
  ALTER TABLE public.acoes_operacionais DROP CONSTRAINT IF EXISTS acoes_operacionais_status_check;
  
  ALTER TABLE public.acoes_operacionais ADD CONSTRAINT acoes_operacionais_status_check 
    CHECK (status IN ('SUGERIDA','PENDENTE','EM_ANDAMENTO','CONCLUIDO')) NOT VALID;
END $$;

-- 4. Enable RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_direcionadas ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
-- Policies for usuarios
DROP POLICY IF EXISTS "authenticated_select_usuarios" ON public.usuarios;
CREATE POLICY "authenticated_select_usuarios" ON public.usuarios FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_usuarios" ON public.usuarios;
CREATE POLICY "authenticated_insert_usuarios" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_usuarios" ON public.usuarios;
CREATE POLICY "authenticated_update_usuarios" ON public.usuarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_usuarios" ON public.usuarios;
CREATE POLICY "authenticated_delete_usuarios" ON public.usuarios FOR DELETE TO authenticated USING (true);

-- Policies for mensagens_chat
DROP POLICY IF EXISTS "authenticated_select_mensagens_chat" ON public.mensagens_chat;
CREATE POLICY "authenticated_select_mensagens_chat" ON public.mensagens_chat FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_mensagens_chat" ON public.mensagens_chat;
CREATE POLICY "authenticated_insert_mensagens_chat" ON public.mensagens_chat FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_mensagens_chat" ON public.mensagens_chat;
CREATE POLICY "authenticated_update_mensagens_chat" ON public.mensagens_chat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_mensagens_chat" ON public.mensagens_chat;
CREATE POLICY "authenticated_delete_mensagens_chat" ON public.mensagens_chat FOR DELETE TO authenticated USING (true);

-- Policies for insights
DROP POLICY IF EXISTS "authenticated_select_insights" ON public.insights;
CREATE POLICY "authenticated_select_insights" ON public.insights FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_insights" ON public.insights;
CREATE POLICY "authenticated_insert_insights" ON public.insights FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_insights" ON public.insights;
CREATE POLICY "authenticated_update_insights" ON public.insights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_insights" ON public.insights;
CREATE POLICY "authenticated_delete_insights" ON public.insights FOR DELETE TO authenticated USING (true);

-- Policies for categorias
DROP POLICY IF EXISTS "authenticated_select_categorias" ON public.categorias;
CREATE POLICY "authenticated_select_categorias" ON public.categorias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_categorias" ON public.categorias;
CREATE POLICY "authenticated_insert_categorias" ON public.categorias FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_categorias" ON public.categorias;
CREATE POLICY "authenticated_update_categorias" ON public.categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_categorias" ON public.categorias;
CREATE POLICY "authenticated_delete_categorias" ON public.categorias FOR DELETE TO authenticated USING (true);

-- Policies for relatorios
DROP POLICY IF EXISTS "authenticated_select_relatorios" ON public.relatorios;
CREATE POLICY "authenticated_select_relatorios" ON public.relatorios FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_relatorios" ON public.relatorios;
CREATE POLICY "authenticated_insert_relatorios" ON public.relatorios FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_relatorios" ON public.relatorios;
CREATE POLICY "authenticated_update_relatorios" ON public.relatorios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_relatorios" ON public.relatorios;
CREATE POLICY "authenticated_delete_relatorios" ON public.relatorios FOR DELETE TO authenticated USING (true);

-- Policies for preferencias_notificacao
DROP POLICY IF EXISTS "authenticated_select_preferencias_notificacao" ON public.preferencias_notificacao;
CREATE POLICY "authenticated_select_preferencias_notificacao" ON public.preferencias_notificacao FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_preferencias_notificacao" ON public.preferencias_notificacao;
CREATE POLICY "authenticated_insert_preferencias_notificacao" ON public.preferencias_notificacao FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_preferencias_notificacao" ON public.preferencias_notificacao;
CREATE POLICY "authenticated_update_preferencias_notificacao" ON public.preferencias_notificacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_preferencias_notificacao" ON public.preferencias_notificacao;
CREATE POLICY "authenticated_delete_preferencias_notificacao" ON public.preferencias_notificacao FOR DELETE TO authenticated USING (true);

-- Policies for perguntas_direcionadas
DROP POLICY IF EXISTS "authenticated_select_perguntas_direcionadas" ON public.perguntas_direcionadas;
CREATE POLICY "authenticated_select_perguntas_direcionadas" ON public.perguntas_direcionadas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_perguntas_direcionadas" ON public.perguntas_direcionadas;
CREATE POLICY "authenticated_insert_perguntas_direcionadas" ON public.perguntas_direcionadas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_perguntas_direcionadas" ON public.perguntas_direcionadas;
CREATE POLICY "authenticated_update_perguntas_direcionadas" ON public.perguntas_direcionadas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_perguntas_direcionadas" ON public.perguntas_direcionadas;
CREATE POLICY "authenticated_delete_perguntas_direcionadas" ON public.perguntas_direcionadas FOR DELETE TO authenticated USING (true);
