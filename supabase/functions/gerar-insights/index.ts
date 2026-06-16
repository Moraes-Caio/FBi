import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurante_id, force = false } = await req.json()

    // Configura o client admin para bypassar RLS em jobs de background
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // Resolve restaurante alvo
    let targetRestauranteId = restaurante_id
    if (!targetRestauranteId) {
      const { data: firstRest } = await supabaseAdmin
        .from('config_restaurantes')
        .select('id')
        .eq('ativo', true)
        .limit(1)
        .single()

      if (firstRest) {
        targetRestauranteId = firstRest.id
      } else {
        throw new Error('Nenhum restaurante ativo encontrado.')
      }
    }

    // Busca configurações e thresholds
    const { data: config, error: configErr } = await supabaseAdmin
      .from('config_restaurantes')
      .select('*')
      .eq('id', targetRestauranteId)
      .single()

    if (configErr || !config) {
      throw new Error('Configuração do restaurante não encontrada.')
    }

    const config_insights = (config.config_insights as any) || {}
    const feedbacks_por_analise = config_insights.feedbacks_por_analise || 10
    const horas_entre_analises = config_insights.horas_entre_analises || 24
    const max_importantes = config_insights.max_importantes || 5
    const max_observacoes = config_insights.max_observacoes || 3

    const ultimaAnalise = config.ultima_analise_insights
      ? new Date(config.ultima_analise_insights)
      : null

    // Conta feedbacks desde a última análise
    let feedbacksQuery = supabaseAdmin.from('feedbacks_restaurante').select('*', { count: 'exact' })

    if (ultimaAnalise) {
      feedbacksQuery = feedbacksQuery.gte('created_at', ultimaAnalise.toISOString())
    }

    const {
      data: feedbacks,
      count,
      error: countErr,
    } = await feedbacksQuery.order('created_at', { ascending: false }).limit(100)

    if (countErr) throw countErr

    const horasPassadas = ultimaAnalise
      ? (new Date().getTime() - ultimaAnalise.getTime()) / (1000 * 60 * 60)
      : Infinity

    // Se não for uma chamada forçada, valida os thresholds
    if (!force) {
      if ((count || 0) < feedbacks_por_analise && horasPassadas < horas_entre_analises) {
        return new Response(
          JSON.stringify({
            message: 'Critérios não atingidos para nova análise automática.',
            insights_gerados: 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    if (!feedbacks || feedbacks.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum feedback novo disponível para análise.',
          insights_gerados: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não está configurada nos secrets do Supabase.')
    }

    const prompt = `Você é o "Chef Pepê", um assistente de inteligência artificial analisando feedbacks de clientes para um restaurante.
Sua missão é gerar insights operacionais estruturados em JSON baseados apenas nestes feedbacks recentes.

Regras rígidas de classificação:
1. "URGENTE": Qualquer risco sanitário (ex: cabelo, inseto), risco à segurança do cliente ou violação grave. Classifique assim INDEPENDENTE do volume.
2. "IMPORTANTE": Padrões relevantes, reclamações recorrentes consistentes ou pontos de melhoria fortes.
3. "OBSERVACAO": Assuntos notáveis, tendências menores e elogios sem necessidade de ação imediata.

Formato OBRIGATÓRIO (retorne SOMENTE um array JSON):
[
  {
    "prioridade": "URGENTE" | "IMPORTANTE" | "OBSERVACAO",
    "categoria": "Serviço" | "Comida" | "Ambiente" | "Geral",
    "titulo": "Título curto e claro",
    "descricao": "Descrição do problema baseada nos feedbacks",
    "sugestao": "Uma sugestão prática de ação para a equipe",
    "feedbacks_relacionados": 2
  }
]

Feedbacks a analisar:
${JSON.stringify(feedbacks.map((f) => ({ texto: f.texto_original, sentimento: f.sentimento, categoria: f.categoria })))}`

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
      throw new Error(`OpenRouter API Error: ${await response.text()}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '[]'

    let insightsGerados: any[] = []
    try {
      const parsed = JSON.parse(content)
      insightsGerados = Array.isArray(parsed) ? parsed : parsed.insights || []
    } catch {
      // Falha silenciosa de parsing
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
        restaurante_id: targetRestauranteId,
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
          .eq('restaurante_id', targetRestauranteId)
          .lt('created_at', ultimaAnalise.toISOString())
      }

      // Insere os novos
      const { error: insertErr } = await supabaseAdmin.from('insights').insert(finalInsights)
      if (insertErr) throw insertErr

      // Atualiza o marcador de última análise
      await supabaseAdmin
        .from('config_restaurantes')
        .update({ ultima_analise_insights: new Date().toISOString() })
        .eq('id', targetRestauranteId)

      // Dispara a geração de ações sugeridas na sequência
      try {
        await supabaseAdmin.functions.invoke('sugerir-acoes', {
          body: { restaurante_id: targetRestauranteId },
        })
      } catch (e) {
        console.error('Falha ao disparar sugerir-acoes após geração de insights:', e)
      }
    }

    return new Response(JSON.stringify({ insights_gerados: insightsGerados.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
