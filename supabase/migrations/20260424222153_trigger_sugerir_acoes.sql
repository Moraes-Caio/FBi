CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trg_check_sugestoes_acoes()
RETURNS trigger AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if we are transitioning away from 'SUGERIDA'
  -- OR if it's a DELETE of a 'SUGERIDA'
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'SUGERIDA' AND NEW.status != 'SUGERIDA' THEN
      SELECT COUNT(*) INTO v_count FROM public.acoes_operacionais WHERE status = 'SUGERIDA';
      IF v_count = 0 THEN
        -- Trigger HTTP to run the suggestion cycle again automatically
        PERFORM net.http_post(
          url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/sugerir-acoes',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
          body := '{"trigger": "db_empty_queue"}'::jsonb
        );
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'SUGERIDA' THEN
      SELECT COUNT(*) INTO v_count FROM public.acoes_operacionais WHERE status = 'SUGERIDA';
      IF v_count = 0 THEN
        PERFORM net.http_post(
          url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/sugerir-acoes',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
          body := '{"trigger": "db_empty_queue"}'::jsonb
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_acoes_operacionais_sugestoes ON public.acoes_operacionais;
CREATE TRIGGER trg_acoes_operacionais_sugestoes
  AFTER UPDATE OR DELETE ON public.acoes_operacionais
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_sugestoes_acoes();
