CREATE OR REPLACE FUNCTION public.trg_call_gerar_perguntas()
RETURNS trigger AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'PENDENTE') OR
     (TG_OP = 'UPDATE' AND OLD.status = 'SUGERIDA' AND NEW.status = 'PENDENTE') THEN
    
    -- Chama a Edge Function para gerar perguntas
    PERFORM net.http_post(
      url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/gerar-perguntas-direcionadas',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
      body := jsonb_build_object('acao_id', NEW.id)
    );
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status != 'CONCLUIDO' AND NEW.status = 'CONCLUIDO') THEN
    -- Desativa as perguntas associadas
    UPDATE public.perguntas_direcionadas SET ativa = false WHERE acao_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_acoes_operacionais_perguntas ON public.acoes_operacionais;
CREATE TRIGGER trg_acoes_operacionais_perguntas
  AFTER INSERT OR UPDATE ON public.acoes_operacionais
  FOR EACH ROW EXECUTE FUNCTION public.trg_call_gerar_perguntas();
