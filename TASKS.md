# Roadmap de Implementação — Feedback Inteligente

> **Como usar:** Abrir este arquivo no início de cada sessão. Marcar `[x]` nas tarefas concluídas antes de fechar o chat.
> Contexto completo do projeto: ver `CLAUDE.md`.

---

## Sessão 1 — Organização ✅

**Objetivo:** Criar estrutura de trabalho para múltiplas sessões sem perda de contexto.

- [x] Ler README.md e SRS completo
- [x] Mapear todo o código existente
- [x] Criar `CLAUDE.md` com contexto persistente
- [x] Criar `TASKS.md` com roadmap por sessão

---

## Sessão 2 — Ambiente: primeiro render funcional

**Objetivo:** App abre no Live Preview, login funciona, dashboard carrega.

**Antes de começar:** Ter em mãos a anon key do Supabase (painel Supabase → Project Settings → API).

- [x] Criar `.env` na raiz com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- [x] Rodar `npm install`
- [x] Rodar `npm start` e verificar que abre em `localhost:8080`
- [x] Testar Live Preview no VS Code
- [x] Verificar que página de login renderiza sem erros no console
- [x] Criar conta de teste e logar
- [x] Verificar que `RotaProtegida` redireciona para `/onboarding`

**Concluído quando:** Live Preview mostra `/login` sem erros de console críticos.

---

## Sessão 3 — Auth + Onboarding completo

**Objetivo:** Fluxo cadastro → onboarding → dashboard funciona end-to-end.

- [x] Testar `/cadastro` — cria `auth.users` + `usuarios` no Supabase
- [x] Verificar que `usuarios.onboarding_completo = false` após cadastro
- [x] Testar `/onboarding` — preencher todos os campos (nome restaurante, WhatsApp, instância UZapi, token)
- [x] Verificar que `config_restaurantes` é criado no Supabase
- [x] Verificar que `usuarios.restaurante_id` é preenchido
- [x] Verificar que `usuarios.onboarding_completo = true` ao finalizar
- [x] Verificar redirect para `/` após onboarding
- [x] Testar `/recuperar-senha` — email de reset chega
- [x] Verificar `/minha-conta` — dados do usuário carregam e salvam

**Concluído quando:** Novo usuário passa por todo o fluxo sem erros e chega ao dashboard.

---

## Sessão 4 — Dashboard + Feedbacks: dados reais

**Objetivo:** Dashboard e página de feedbacks funcionam com dados reais do Supabase.

- [x] Dashboard (`/`): verificar KPIs carregam (aceitar mock se < 5 feedbacks)
- [x] Dashboard: verificar gráfico de tendência
- [x] Dashboard: verificar CategoryScores e RecentFeedbacks
- [x] Verificar `AiBanner` carrega `config_restaurantes.texto_banner`
- [x] Feedbacks (`/feedbacks`): lista carrega do Supabase
- [x] Feedbacks: filtros funcionam (sentimento, categoria, período, busca)
- [x] Feedbacks: paginação funciona
- [x] Feedbacks: estado vazio quando não há dados (sem quebrar)
- [x] Inserir 1-2 feedbacks manuais no Supabase e verificar que aparecem

**Concluído quando:** Dashboard e /feedbacks exibem dados reais sem erros de console.

---

## Sessão 5 — Insights + Ações: dados reais

**Objetivo:** Páginas de insights e ações funcionam com dados reais.

- [ ] Insights (`/insights`): lista carrega do Supabase
- [ ] Insights: filtros por prioridade e categoria funcionam
- [ ] Insights: verificar valores de prioridade (`URGENTE` / `IMPORTANTE` / `OBSERVACAO`)
- [ ] Insights: botão "Gerar Insights" chama Edge Function `gerar-insights`
- [ ] Insights: TaskModal abre e fecha corretamente
- [ ] Ações (`/acoes`): TaskBoard carrega colunas com status reais
- [ ] Ações: verificar valores de status (`SUGERIDA` / `PENDENTE` / `EM_ANDAMENTO` / `CONCLUIDO`)
- [ ] Ações: drag-and-drop ou botão muda status no Supabase
- [ ] Ações: SugestoesSidebar carrega ações `SUGERIDA`
- [ ] Verificar trigger `trg_acoes_operacionais_perguntas` ao mudar status para `PENDENTE`

**Concluído quando:** Insights e ações exibem dados reais e atualizam status no banco.

---

## Sessão 6 — Settings + QR Code

**Objetivo:** Configurações salvam no Supabase, QR Code funciona.

- [ ] Settings → Restaurante: editar e salvar `config_restaurantes`
- [ ] Settings → Garçons: cadastrar, ativar e desativar em `garcons`
- [ ] Settings → Categorias: cadastrar e ativar/desativar em `categorias`
- [ ] Settings → Mascote: editar `mascote_config` jsonb
- [ ] Settings → Equipe: listar usuários do restaurante
- [ ] QR Code (`/qrcode`): verificar se existe QR code no banco para o restaurante
- [ ] QR Code: gerar novo QR code (`gerenciar-qr-code` Edge Function)
- [ ] QR Code: download PDF do QR code
- [ ] QR Code: verificar redirect (`qr-redirect` Edge Function) → abre WhatsApp correto
- [ ] QR Code: verificar contagem de scans em `qr_scans`

**Concluído quando:** Configurações persistem no banco e QR code redireciona para WhatsApp correto.

---

## Sessão 7 — Pipeline de Mensagens (n8n + chamar-ia)

**Objetivo:** Mensagem WhatsApp → buffer → análise IA → feedback salvo.

**Pré-requisito:** n8n configurado e rodando, UZapi com instância ativa.

- [ ] Revisar Edge Function `webhook-n8n` (`supabase/functions/webhook-n8n/index.ts`)
- [ ] Verificar que `webhook-n8n` insere em `buffer_mensagens` com `processado = false`
- [ ] Verificar que `webhook-n8n` chama `chamar-ia` após inserir no buffer
- [ ] Revisar Edge Function `chamar-ia` — prompt, modelo OpenRouter, estrutura de resposta
- [ ] Verificar que `chamar-ia` usa `OPENROUTER_API_KEY` (env var Supabase, não bundle)
- [ ] Testar com mensagem manual: inserir row em `buffer_mensagens`, chamar `chamar-ia`
- [ ] Verificar que `feedbacks_restaurante` recebe o resultado
- [ ] Verificar que `buffer_mensagens.processado = true` após análise
- [ ] Configurar variáveis de ambiente nas Edge Functions do Supabase (painel)
- [ ] Teste end-to-end: mensagem WhatsApp → aparece em `/feedbacks`

**Concluído quando:** Mensagem de texto no WhatsApp aparece como feedback analisado no dashboard.

---

## Sessão 8 — Insights automáticos + Ações sugeridas

**Objetivo:** Pipeline automático de insights e sugestões de ação funciona.

- [ ] Revisar `gerar-insights` Edge Function
- [ ] Verificar modelo IA e prompt em `gerar-insights`
- [ ] Testar `gerar-insights` manualmente via botão no dashboard
- [ ] Verificar que `insights` são criados com campos obrigatórios
- [ ] Verificar que `config_restaurantes.ultima_analise_insights` é atualizado
- [ ] Revisar `sugerir-acoes` Edge Function
- [ ] Verificar trigger `trg_check_sugestoes_acoes` dispara `sugerir-acoes`
- [ ] Verificar que `acoes_operacionais` com status `SUGERIDA` aparecem na sidebar
- [ ] Revisar `gerar-plano-acao` Edge Function
- [ ] Testar geração de plano de ação para um insight
- [ ] Revisar `gerar-perguntas-direcionadas` Edge Function
- [ ] Verificar que perguntas são criadas ao mover ação para `PENDENTE`
- [ ] Verificar que perguntas são desativadas ao mover ação para `CONCLUIDO`

**Concluído quando:** Ciclo completo funciona: feedbacks → insights → ações sugeridas → perguntas direcionadas.

---

## Sessão 9 — Relatórios + Banner IA

**Objetivo:** Relatórios gerados por IA e banner do dashboard funcionam.

- [ ] Relatórios (`/relatorios`): lista de relatórios existentes carrega
- [ ] Verificar se existe Edge Function `gerar-relatorio` (se não, criar)
- [ ] Testar geração de relatório para período selecionado
- [ ] Verificar que `relatorios.resumo_executivo` é preenchido
- [ ] PDF: verificar download funciona (jsPDF já instalado)
- [ ] Verificar `relatorios.url_pdf` é salvo (ou gerar localmente)
- [ ] Banner IA (`AiBanner`): verificar que carrega `config_restaurantes.texto_banner`
- [ ] Revisar `atualizar-banner` Edge Function
- [ ] Testar atualização do banner via IA
- [ ] Notificações (`/notificacoes`): lista carrega da tabela `notificacoes`
- [ ] Verificar marcação de notificação como lida

**Concluído quando:** Relatórios geram e fazem download, banner atualiza via IA.

---

## Sessão 10 — Polish + Launch

**Objetivo:** Revisão final, testes de RLS, preparação para deploy.

- [ ] Testar RLS: criar 2 contas de restaurantes diferentes, verificar isolamento de dados
- [ ] Verificar todos os estados de loading e erro nas páginas
- [ ] Verificar estados vazios (sem feedbacks, sem insights, etc.)
- [ ] Testar fluxo completo em modo mobile (responsividade)
- [ ] Revisar `preferencias_notificacao` em configurações de conta
- [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` não aparece no bundle (`npm run build`)
- [ ] Verificar que `OPENROUTER_API_KEY` não aparece no bundle
- [ ] `npm run build` sem erros de TypeScript
- [ ] `npm run lint` sem erros críticos
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Deploy no Vercel
- [ ] Smoke test no ambiente de produção

**Concluído quando:** App em produção no Vercel, fluxo completo funciona, RLS isolando dados corretamente.

---

## Notas Importantes

### Discrepâncias SRS vs Código Real
O SRS é o documento de referência para lógica de negócio, mas o README.md tem prioridade sobre escolhas técnicas. Principais diferenças já mapeadas no `CLAUDE.md`.

### Edge Functions — Deploy
Para fazer deploy das Edge Functions:
```bash
supabase functions deploy <nome-da-funcao>
```
Configurar variáveis secretas:
```bash
supabase secrets set OPENROUTER_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Testar Edge Functions localmente
```bash
supabase functions serve <nome-da-funcao> --env-file .env.local
```
