-- Ensure restaurante_id column exists on acoes_operacionais (idempotent retry)
ALTER TABLE public.acoes_operacionais
  ADD COLUMN IF NOT EXISTS restaurante_id BIGINT REFERENCES public.config_restaurantes(id);

CREATE INDEX IF NOT EXISTS idx_acoes_restaurante_id ON public.acoes_operacionais(restaurante_id);
