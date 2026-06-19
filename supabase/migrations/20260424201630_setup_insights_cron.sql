-- Habilitar extensões necessárias para CRON e requisições HTTP (comuns no ecossistema Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o agendamento de CRON para chamar a Edge Function de gerar insights automaticamente
-- A função de edge não exige o JWT forçado quando acionada via http_post sem headers de auth (se assim configurada),
-- ou pode validar pelo service_role. O agendador aqui faz a chamada simples para ativar a verificação horária.
DO $$
BEGIN
  -- Remove o job caso já exista para manter a idempotência da migration
  PERFORM cron.unschedule('gerar-insights-horario');
  
  -- Agendar para rodar toda hora, no minuto 0
  PERFORM cron.schedule(
    'gerar-insights-horario',
    '0 * * * *',
    $cron$
      SELECT net.http_post(
        url:='https://lixrcruilisncfhfhndo.supabase.co/functions/v1/gerar-insights',
        headers:='{"Content-Type": "application/json"}',
        body:='{"force": false}'
      );
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  -- Ignora de forma segura erros caso a extensão pg_cron não esteja disponível 
  -- ou o usuário não tenha permissão no banco local de desenvolvimento
  RAISE NOTICE 'Aviso: Não foi possível agendar o cron job. Erro: %', SQLERRM;
END $$;
