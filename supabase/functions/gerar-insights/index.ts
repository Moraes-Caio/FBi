import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Mínimo de feedbacks para permitir geração manual de insights
const MIN_FEEDBACKS_MANUAL = 3

// Processa um único restaurante: busca feedbacks, valida critérios, chama a IA e salva insights.
// Retorna um resumo — não lança erro fatal para não interromper o loop do cron.
async function processarRestaurante(
  supabaseAdmin: any,
  restauranteId: number,
  force: boolean,
  apiKey: string,
  modelo: string,
) {
  // Busca configurações e thresholds do restaurante
  const { data: config, error: configErr } = await supabaseAdmin
    .from('config_restaurantes')
    .select('*')
    .eq('id', restauranteId)
    .single()

  if (configErr || !config) {
    return { insights_gerados: 0, feedbacks_analisados: 0, status: 'sem_config' }
  }

  const config_insights = (config.config_insights as any) || {}
  const feedbacks_por_analise = config_insights.feedbacks_por_analise || 10
  const horas_entre_analises = config_insights.horas_entre_analises || 24
  const max_importantes = config_insights.max_importantes || 5
  const max_observacoes = config_insights.max_observacoes || 3

  const ultimaAnalise = config.ultima_analise_insights
    ? new Date(config.ultima_analise_insights)
    : null

  // Busca feedbacks SOMENTE deste restaurante.
  // Com force=true, ignora o filtro de data para reanalisar todos os feedbacks.
  let feedbacksQuery = supabaseAdmin
    .from('feedbacks_restaurante')
    .select('*', { count: 'exact' })
    .eq('restaurante_id', restauranteId)

  if (ultimaAnalise && !force) {
    feedbacksQuery = feedbacksQuery.gte('created_at', ultimaAnalise.toISOString())
  }

  const {
    data: feedbacks,
    count,
    error: countErr,
  } = await feedbacksQuery.order('created_at', { ascending: false }).limit(100)

  if (countErr) {
    return { insights_gerados: 0, feedbacks_analisados: 0, status: 'erro_busca' }
  }

  const horasPassadas = ultimaAnalise
    ? (new Date().getTime() - ultimaAnalise.getTime()) / (1000 * 60 * 60)
    : Infinity

  // Geração automática (force=false): só prossegue se atingir os thresholds configurados
  if (!force) {
    if ((count || 0) < feedbacks_por_analise && horasPassadas < horas_entre_analises) {
      return {
        insights_gerados: 0,
        feedbacks_analisados: count || 0,
        status: 'criterios_nao_atingidos',
      }
    }
  }

  const totalFeedbacks = feedbacks?.length || 0

  if (totalFeedbacks === 0) {
    return { insights_gerados: 0, feedbacks_analisados: 0, status: 'sem_feedbacks' }
  }

  // Geração manual exige um mínimo de feedbacks para produzir análise útil
  if (force && totalFeedbacks < MIN_FEEDBACKS_MANUAL) {
    return {
      insights_gerados: 0,
      feedbacks_analisados: totalFeedbacks,
      minimo_necessario: MIN_FEEDBACKS_MANUAL,
      status: 'insuficiente',
    }
  }

  const prompt = `Você é o "Chef Pepê", um assistente de inteligência artificial analisando feedbacks de clientes para um restaurante.
Sua missão é gerar insights operacionais estruturados em JSON baseados apenas nestes feedbacks recentes.

Regras rígidas de classificação:
1. "URGENTE": Qualquer risco sanitário (ex: cabelo, inseto), risco à segurança do cliente ou violação grave. Classifique assim INDEPENDENTE do volume.
2. "IMPORTANTE": Padrões relevantes, reclamações recorrentes consistentes ou pontos de melhoria fortes.
3. "OBSERVACAO": Assuntos notáveis, tendências menores e elogios sem necessidade de ação imediata.

Formato OBRIGATÓRIO (retorne SOMENTE este JSON):
{
  "insights": [
    {
      "prioridade": "URGENTE" | "IMPORTANTE" | "OBSERVACAO",
      "categoria": "Serviço" | "Comida" | "Ambiente" | "Geral",
      "titulo": "Título curto e claro",
      "descricao": "Descrição do problema baseada nos feedbacks",
      "sugestao": "Uma sugestão prática de ação para a equipe",
      "feedbacks_relacionados": 2
    }
  ]
}

Feedbacks a analisar:
${JSON.stringify(feedbacks.map((f: any) => ({ texto: f.texto_original, sentimento: f.sentimento, categoria: f.categoria })))}`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://feedbackinteligente.app',
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    console.error(`OpenRouter API Error (restaurante ${restauranteId}): ${await response.text()}`)
    return { insights_gerados: 0, feedbacks_analisados: totalFeedbacks, status: 'erro_ia' }
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? '[]'

  let insightsGerados: any[] = []
  try {
    const parsed = JSON.parse(content)
    insightsGerados = Array.isArray(parsed) ? parsed : parsed.insights || []
  } catch (parseErr) {
    console.error('Falha ao parsear resposta da IA:', content, parseErr)
  }

  if (insightsGerados.length > 0) {
    // Aplica os limites definidos nas configurações
    const urgentes = insightsGerados.filter((i) => i.prioridade === 'URGENTE')
    const importantes = insightsGerados
      .filter((i) => i.prioridade === 'IMPORTANTE')
      .slice(0, max_importantes)
    const observacoes = insightsGerados
      .filter((i) => i.prioridade === 'OBSERVACAO' || i.prioridade === 'OBSERVAÇÃO')
      .slice(0, max_observacoes)

    const finalInsights = [...urgentes, ...importantes, ...observacoes].map((i) => ({
      restaurante_id: restauranteId,
      prioridade: i.prioridade === 'OBSERVAÇÃO' ? 'OBSERVACAO' : i.prioridade,
      categoria: i.categoria || 'Geral',
      titulo: i.titulo || 'Insight detectado',
      descricao: i.descricao || '',
      sugestao: i.sugestao || '',
      feedbacks_relacionados: i.feedbacks_relacionados || 1,
      gerado_por: 'ia',
      ativo: true,
    }))

    // Desativa os insights da análise anterior
    if (ultimaAnalise) {
      await supabaseAdmin
        .from('insights')
        .update({ ativo: false })
        .eq('restaurante_id', restauranteId)
        .lt('created_at', ultimaAnalise.toISOString())
    }

    // Insere os novos
    const { error: insertErr } = await supabaseAdmin.from('insights').insert(finalInsights)
    if (insertErr) {
      console.error(`Falha ao inserir insights (restaurante ${restauranteId}):`, insertErr)
      return { insights_gerados: 0, feedbacks_analisados: totalFeedbacks, status: 'erro_insert' }
    }

    // Atualiza o marcador de última análise
    await supabaseAdmin
      .from('config_restaurantes')
      .update({ ultima_analise_insights: new Date().toISOString() })
      .eq('id', restauranteId)

    // Dispara a geração de ações sugeridas na sequência
    try {
      await supabaseAdmin.functions.invoke('sugerir-acoes', {
        body: { restaurante_id: restauranteId },
      })
    } catch (e) {
      console.error('Falha ao disparar sugerir-acoes após geração de insights:', e)
    }
  }

  return {
    insights_gerados: insightsGerados.length,
    feedbacks_analisados: totalFeedbacks,
    status: insightsGerados.length > 0 ? 'sucesso' : 'sem_novidades',
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const force = body?.force ?? false

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não está configurada nos secrets do Supabase.')
    }

    // ─── MODO CRON ───────────────────────────────────────────────────────────
    // Acionado pelo agendador via header x-cron-secret. Processa TODOS os
    // restaurantes sem exigir um usuário logado. O segredo fica nos secrets do
    // Supabase (nunca no código), impedindo que terceiros disparem o loop.
    const cronSecret = Deno.env.get('CRON_SECRET')
    const providedSecret = req.headers.get('x-cron-secret')

    if (providedSecret) {
      if (!cronSecret || providedSecret !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Segredo de cron inválido.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: restaurantes, error: restErr } = await supabaseAdmin
        .from('config_restaurantes')
        .select('id')

      if (restErr) throw restErr

      let insightsTotal = 0
      let processados = 0
      for (const r of restaurantes ?? []) {
        // Cron sempre usa force=false: respeita os thresholds de cada restaurante
        const res = await processarRestaurante(supabaseAdmin, r.id, false, apiKey, modelo)
        insightsTotal += res.insights_gerados
        processados += 1
      }

      return new Response(
        JSON.stringify({
          modo: 'cron',
          restaurantes_processados: processados,
          insights_gerados: insightsTotal,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ─── MODO MANUAL (usuário logado) ────────────────────────────────────────
    // Deriva restaurante_id do JWT do usuário autenticado — nunca confia no body.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
      error: authErr,
    } = await supabaseUser.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: usuarioData } = await supabaseAdmin
      .from('usuarios')
      .select('restaurante_id')
      .eq('id', user.id)
      .single()

    const targetRestauranteId = usuarioData?.restaurante_id
    if (!targetRestauranteId) {
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado para este usuário.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const result = await processarRestaurante(
      supabaseAdmin,
      targetRestauranteId,
      force,
      apiKey,
      modelo,
    )

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
