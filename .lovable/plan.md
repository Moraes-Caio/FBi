## Problema

A preview está branca porque `src/lib/supabase/client.ts` chama `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` com valores `undefined`, lançando `supabaseUrl is required` antes do React montar. Confirmado no console:

```
[pageerror] supabaseUrl is required.
```

## Plano

Você prefere conectar seu próprio projeto Supabase em vez de usar Lovable Cloud. O fluxo é:

1. **Você conecta o Supabase pela UI do Lovable** (botão "Supabase" no canto superior direito → autoriza → seleciona o projeto). Não tenho ferramenta para acionar essa conexão externa por aqui — só Lovable Cloud é acionável via tool.
2. Assim que a conexão for concluída, o Lovable injeta automaticamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (e regenera `src/lib/supabase/types.ts` a partir do seu schema). O `client.ts` atual já lê dessas variáveis, então a tela branca some sozinha.
3. **Eu valido**: recarrego a preview via Playwright e confirmo que a rota `/` redireciona para `/login` (esperado, sem sessão) e que o erro `supabaseUrl is required` sumiu do console.
4. **Schema**: o código usa as tabelas `usuarios`, `mensagens_chat`, `acoes_operacionais`, `perguntas_direcionadas`, `qr_codes`, `qr_scans`, `config_restaurantes`, `feedbacks` etc. Após a conexão, eu listo o que existe no seu Supabase vs. o que o código espera e te apresento um segundo plano com as migrações necessárias (CREATE TABLE + GRANTs + RLS + policies).
5. **Edge functions e secrets**: as funções em `supabase/functions/` (`chamar-ia`, `gerar-insights`, `qr-redirect`, etc.) precisam do secret `OPENROUTER_API_KEY` e, no caso do `webhook-n8n`, do secret `mensagem_follow_up_feedback`. Esses devem ser configurados no painel do seu Supabase (Edge Functions → Secrets) — não consigo gerenciá-los pelo Lovable quando o backend é Supabase externo.

## Trade-offs (vs. Lovable Cloud)

- ✅ Você mantém controle total do projeto Supabase (billing, dashboard, backups).
- ⚠️ Secrets de edge functions, deploy de migrações e gestão de usuários ficam no painel do Supabase, não no Lovable.
- ⚠️ Não posso provisionar nem editar segredos do backend daqui — você administra direto no Supabase.

## Próximo passo (sua ação)

Clique em **"Supabase"** no canto superior direito do editor e conecte o projeto. Quando terminar, me avise que eu valido a preview e proponho as migrações de schema.
