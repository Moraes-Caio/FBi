ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS configuracoes JSONB DEFAULT '{}'::jsonb;
