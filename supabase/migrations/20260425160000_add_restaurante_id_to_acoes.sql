-- Add restaurante_id to acoes_operacionais for multi-tenant support
ALTER TABLE public.acoes_operacionais 
  ADD COLUMN IF NOT EXISTS restaurante_id BIGINT REFERENCES public.config_restaurantes(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_acoes_restaurante_id ON public.acoes_operacionais(restaurante_id);
