DO $$
BEGIN
  ALTER TABLE public.perguntas_direcionadas 
    DROP CONSTRAINT IF EXISTS perguntas_direcionadas_acao_id_fkey;
    
  ALTER TABLE public.perguntas_direcionadas
    ADD CONSTRAINT perguntas_direcionadas_acao_id_fkey
    FOREIGN KEY (acao_id) REFERENCES public.acoes_operacionais(id)
    ON DELETE CASCADE;
END $$;
