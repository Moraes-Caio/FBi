import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore - Supabase.ai existe no runtime das edge functions
const aiSession = new Supabase.ai.Session('gte-small')

function blocoPerfil(r: any): string {
  const p = (r?.perfil_restaurante as any) || {}
  const linhas = [
    r?.nome_restaurante ? `Nome: ${r.nome_restaurante}` : '',
    r?.tipo_culinaria ? `Tipo de cozinha: ${r.tipo_culinaria}` : '',
    p.estilo ? `Estilo: ${p.estilo}` : '',
    r?.numero_mesas ? `Mesas: ${r.numero_mesas}` : '',
    p.num_funcionarios ? `Equipe: ${p.num_funcionarios} funcionarios` : '',
    p.faixa_preco ? `Ticket medio: ${p.faixa_preco}` : '',
    p.publico_alvo ? `Publico: ${p.publico_alvo}` : '',
    p.desafios ? `Desafios relatados pelo dono: ${p.desafios}` : '',
    r?.detalhes ? `Descricao do dono: ${r.detalhes}` : '',
  ].filter(Boolean)
  return linhas.length ? linhas.join('\n') : 'Perfil ainda nao preenchido.'
}

async function buscarConhecimento(db: any, restauranteId: number, consulta: string): Promise<string> {
  try {
    if (!consulta.trim()) return ''
    const emb = await aiSession.run(consulta.slice(0, 4000), { mean_pool: true, normalize: true })
    const { data } = await db.rpc('buscar_conhecimento_para', {
      consulta_embedding: emb,
      p_restaurante_id: restauranteId,
      consulta_texto: consulta.slice(0, 500),
      limite: 6,
    })
    if (!data || !data.length) return ''
    return data.map((t: any, i: number) => `[${i + 1}] (${t.titulo})\n${t.conteudo}`).join('\n\n')
  } catch (e) {
    console.error('Falha na busca de conhecimento:', e)
    return ''
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const restaurante_id = body.restaurante_id

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

    let targetRestauranteId = restaurante_id
    if (!targetRestauranteId) {
      const { data: firstRest } = await db
        .from('restaurantes')
        .select('id')
        .eq('ativo', true)
        .limit(1)
        .single()
      if (firstRest) targetRestauranteId = firstRest.id
    }

    // Nao gera novas sugestoes enquanto ha sugestoes aguardando aprovacao
    let countBase = db
      .from('acoes_operacionais')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUGERIDA')
    const { count } = targetRestauranteId
      ? await countBase.eq('restaurante_id', targetRestauranteId)
      : await countBase

    if (count && count > 0) {
      return new Response(JSON.stringify({ status: 'aguardando_aprovacao', sugestoes_criadas: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Configuracao (mora em restaurantes) + perfil para contexto
    let maxSugestoes = 3
    let restauranteData: any = null
    if (targetRestauranteId) {
      const { data: r } = await db
        .from('restaurantes')
        .select('nome_restaurante, tipo_culinaria, numero_mesas, detalhes, perfil_restaurante, config_insights, mascote_config')
        .eq('id', targetRestauranteId)
        .single()
      restauranteData = r
      const ci = (r?.config_insights as any) || {}
      if (ci.max_sugestoes_acoes_por_ciclo) maxSugestoes = ci.max_sugestoes_acoes_por_ciclo
    }

    // Insights ativos
    let insightsQuery = db.from('insights').select('*').eq('ativo', true)
    if (targetRestauranteId) insightsQuery = insightsQuery.eq('restaurante_id', targetRestauranteId)
    const { data: insights, error: insightsErr } = await insightsQuery
    if (insightsErr) throw insightsErr

    if (!insights || insights.length === 0) {
      return new Response(JSON.stringify({ status: 'sem_insights', sugestoes_criadas: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prioridadePeso: Record<string, number> = { URGENTE: 3, IMPORTANTE: 2, OBSERVACAO: 1 }
    const insightsOrdenados = insights.sort((a, b) => {
      const pA = prioridadePeso[a.prioridade?.toUpperCase()] || 0
      const pB = prioridadePeso[b.prioridade?.toUpperCase()] || 0
      if (pA !== pB) return pB - pA
      return (b.feedbacks_relacionados || 0) - (a.feedbacks_relacionados || 0)
    })

    const insightsValidos = insightsOrdenados
      .filter((i) => i.prioridade?.toUpperCase() === 'URGENTE' || (i.feedbacks_relacionados || 0) >= 2)
      .slice(0, 10)

    if (insightsValidos.length === 0) {
      return new Response(JSON.stringify({ status: 'sem_insights_relevantes', sugestoes_criadas: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'
    if (!apiKey) throw new Error('OPENROUTER_API_KEY nao configurada')

    // Anotacoes da IA
    const { data: memoria } = targetRestauranteId
      ? await db
          .from('memoria_assistente')
          .select('fato')
          .eq('restaurante_id', targetRestauranteId)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] as any[] }

    // Boas praticas relevantes aos temas dos insights
    const consultaConhecimento = insightsValidos
      .map((i) => `${i.categoria || ''}: ${i.titulo}. ${i.descricao || ''}`)
      .join('\n')
      .slice(0, 3500)
    const conhecimento = targetRestauranteId
      ? await buscarConhecimento(db, targetRestauranteId, consultaConhecimento)
      : ''

    const prompt = `Voce e um consultor especialista em gestao de restaurantes. Com base nos insights abaixo, gere ATE ${maxSugestoes} acoes operacionais concretas para o dono resolver os problemas mais valiosos (maior impacto e urgencia).

## Sobre este restaurante
${blocoPerfil(restauranteData)}
${memoria?.length ? `\n## O que se sabe deste restaurante (anotacoes)\n${memoria.map((m: any) => `- ${m.fato}`).join('\n')}` : ''}
${conhecimento ? `\n## Boas praticas de referencia (use para montar o plano)\n${conhecimento}` : ''}

## Regras para cada acao
1. "titulo_acao": titulo curto e claro do que precisa ser feito.
2. "plano_detalhado": um plano pratico em passos, adaptado a ESTE restaurante (tamanho, equipe, tipo de cozinha). Quando uma boa pratica de referencia se aplicar, incorpore-a de forma concreta. Nada de conselho generico como "melhore o atendimento".
3. "prioridade": herde do insight principal (URGENTE, IMPORTANTE ou OBSERVACAO).
4. "categoria": Servico, Comida, Ambiente, Preco, Agilidade ou Geral.
Escreva em portugues do Brasil, direto.

## Formato (retorne SOMENTE este JSON)
{ "acoes": [ { "titulo_acao": "...", "plano_detalhado": "...", "prioridade": "...", "categoria": "..." } ] }

## Insights disponiveis
${JSON.stringify(insightsValidos.map((i) => ({ prioridade: i.prioridade, categoria: i.categoria, titulo: i.titulo, descricao: i.descricao, sugestao: i.sugestao })))}`

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

    if (!response.ok) throw new Error(`OpenRouter API Error: ${await response.text()}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '[]'

    let acoesGeradas: any[] = []
    try {
      const parsed = JSON.parse(content)
      acoesGeradas = Array.isArray(parsed) ? parsed : parsed.acoes || parsed.sugestoes || []
    } catch {
      // silent
    }

    let criadas = 0
    if (acoesGeradas.length > 0) {
      const finalAcoes = acoesGeradas.slice(0, maxSugestoes).map((a) => ({
        titulo_acao: a.titulo_acao || 'Acao sugerida',
        plano_detalhado: a.plano_detalhado || '',
        prioridade: a.prioridade || 'IMPORTANTE',
        categoria: a.categoria || 'Geral',
        status: 'SUGERIDA',
        restaurante_id: targetRestauranteId || null,
        texto: 'Gerado automaticamente via IA baseando-se em insights ativos, no perfil do restaurante e nas boas praticas.',
      }))

      const { error: insertErr } = await db.from('acoes_operacionais').insert(finalAcoes)
      if (insertErr) throw insertErr
      criadas = finalAcoes.length
    }

    return new Response(JSON.stringify({ status: 'sucesso', sugestoes_criadas: criadas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    const errMsg = err?.message || err?.details || err?.hint || JSON.stringify(err) || 'unknown error'
    return new Response(JSON.stringify({ error: errMsg, code: err?.code }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
