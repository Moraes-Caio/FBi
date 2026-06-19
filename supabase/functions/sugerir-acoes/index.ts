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
    const body = await req.json().catch(() => ({}))
    const restaurante_id = body.restaurante_id

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

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
      }
    }

    // Verifica se já existem sugestões aguardando aprovação
    // Try filtered by restaurante_id first; fallback to global if column doesn't exist yet
    let countBase = supabaseAdmin
      .from('acoes_operacionais')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUGERIDA')

    let { count, error: countErr } = targetRestauranteId
      ? await countBase.eq('restaurante_id', targetRestauranteId)
      : await countBase

    if (countErr) {
      if (countErr.code === '42703') {
        // Column doesn't exist yet — fall back to global count
        const fallback = await supabaseAdmin
          .from('acoes_operacionais')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'SUGERIDA')
        count = fallback.count
        if (fallback.error) throw fallback.error
      } else {
        throw countErr
      }
    }

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ status: 'aguardando_aprovacao', sugestoes_criadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let maxSugestoes = 3
    if (targetRestauranteId) {
      const { data: config } = await supabaseAdmin
        .from('config_restaurantes')
        .select('config_insights')
        .eq('id', targetRestauranteId)
        .single()

      if (config?.config_insights) {
        const ci = config.config_insights as any
        if (ci.max_sugestoes_acoes_por_ciclo) {
          maxSugestoes = ci.max_sugestoes_acoes_por_ciclo
        }
      }
    }

    // Busca insights ativos para analise
    let insightsQuery = supabaseAdmin.from('insights').select('*').eq('ativo', true)

    if (targetRestauranteId) {
      insightsQuery = insightsQuery.eq('restaurante_id', targetRestauranteId)
    }

    const { data: insights, error: insightsErr } = await insightsQuery

    if (insightsErr) throw insightsErr

    if (!insights || insights.length === 0) {
      return new Response(JSON.stringify({ status: 'sem_insights', sugestoes_criadas: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ordena prioridade: URGENTE > IMPORTANTE > OBSERVACAO
    const prioridadePeso: Record<string, number> = {
      URGENTE: 3,
      IMPORTANTE: 2,
      OBSERVACAO: 1,
      OBSERVAÇÃO: 1,
    }

    const insightsOrdenados = insights.sort((a, b) => {
      const pA = prioridadePeso[a.prioridade?.toUpperCase()] || 0
      const pB = prioridadePeso[b.prioridade?.toUpperCase()] || 0
      if (pA !== pB) return pB - pA
      return (b.feedbacks_relacionados || 0) - (a.feedbacks_relacionados || 0)
    })

    // Filtra para garantir relevância: feedbacks_relacionados >= 2 (exceto URGENTE)
    const insightsValidos = insightsOrdenados
      .filter((i) => {
        if (i.prioridade?.toUpperCase() === 'URGENTE') return true
        return (i.feedbacks_relacionados || 0) >= 2
      })
      .slice(0, 10)

    if (insightsValidos.length === 0) {
      return new Response(
        JSON.stringify({ status: 'sem_insights_relevantes', sugestoes_criadas: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada')
    }

    const prompt = `Você é um assistente especialista em gestão de restaurantes.
Baseado na lista de insights abaixo, gere ATÉ ${maxSugestoes} sugestões de ações operacionais.
Foque nos problemas mais valiosos (maior impacto e urgência).

Regras OBRIGATÓRIAS para cada ação:
1. "titulo_acao": Título curto e claro
2. "plano_detalhado": Um norteador genérico de como resolver o problema, orientando a equipe sem prescrever regras rígidas demais.
3. "prioridade": Herde do insight principal que motivou a ação (URGENTE, IMPORTANTE ou OBSERVACAO).
4. "categoria": Herde ou defina a categoria (Ex: Serviço, Comida, Ambiente, Geral).

Retorne SOMENTE um JSON Array neste formato:
[
  {
    "titulo_acao": "...",
    "plano_detalhado": "...",
    "prioridade": "...",
    "categoria": "..."
  }
]

Insights disponíveis:
${JSON.stringify(
  insightsValidos.map((i) => ({
    id: i.id,
    prioridade: i.prioridade,
    categoria: i.categoria,
    titulo: i.titulo,
    descricao: i.descricao,
  })),
)}`

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

    let acoesGeradas: any[] = []
    try {
      const parsed = JSON.parse(content)
      acoesGeradas = Array.isArray(parsed) ? parsed : parsed.acoes || parsed.sugestoes || []
    } catch {
      // silent fail
    }

    let criadas = 0
    if (acoesGeradas.length > 0) {
      const finalAcoes = acoesGeradas.slice(0, maxSugestoes).map((a) => ({
        titulo_acao: a.titulo_acao || 'Ação sugerida',
        plano_detalhado: a.plano_detalhado || '',
        prioridade: a.prioridade || 'IMPORTANTE',
        categoria: a.categoria || 'Geral',
        status: 'SUGERIDA',
        restaurante_id: targetRestauranteId || null,
        texto: 'Gerado automaticamente via IA baseando-se em Insights ativos.',
      }))

      let { error: insertErr } = await supabaseAdmin.from('acoes_operacionais').insert(finalAcoes)
      if (insertErr?.code === '42703') {
        // restaurante_id column doesn't exist yet — retry without it
        const acoesNoRest = finalAcoes.map(({ restaurante_id: _r, ...rest }) => rest)
        const retry = await supabaseAdmin.from('acoes_operacionais').insert(acoesNoRest)
        insertErr = retry.error
      }
      if (insertErr) throw insertErr
      criadas = finalAcoes.length
    }

    return new Response(JSON.stringify({ status: 'sucesso', sugestoes_criadas: criadas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    const errMsg =
      err?.message || err?.details || err?.hint || JSON.stringify(err) || 'unknown error'
    return new Response(JSON.stringify({ error: errMsg, code: err?.code, raw: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
