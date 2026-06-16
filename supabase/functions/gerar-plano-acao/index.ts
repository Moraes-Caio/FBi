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
    const acao_id = body.acao_id

    if (!acao_id) {
      throw new Error('acao_id é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // Buscar dados da ação
    const { data: acao, error: acaoErr } = await supabaseAdmin
      .from('acoes_operacionais')
      .select('*')
      .eq('id', acao_id)
      .single()

    if (acaoErr) throw acaoErr
    if (!acao) {
      throw new Error('Ação não encontrada')
    }

    // Buscar insights relacionados para contexto
    const { data: insights, error: insightsErr } = await supabaseAdmin
      .from('insights')
      .select('*')
      .eq('restaurante_id', acao.restaurante_id)
      .eq('ativo', true)
      .limit(5)

    if (insightsErr) throw insightsErr

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada')
    }

    const contextoPrincipal = `
Ação: ${acao.titulo_acao}
Categoria: ${acao.categoria}
Prioridade: ${acao.prioridade}
Status: ${acao.status}
`

    const contextoInsights =
      insights && insights.length > 0
        ? `Insights relacionados:\n${insights.map((i) => `- ${i.titulo}: ${i.descricao}`).join('\n')}`
        : ''

    const prompt = `Você é um especialista em gestão de restaurantes e operações.
Baseado na ação descrita abaixo, gere um plano detalhado de ação.

O plano deve:
1. Explicar COMO resolver o problema
2. Ser orientador e prático, sem ser rígido demais
3. Fornecer direcionamentos claros para a equipe
4. Ser realista e aplicável no contexto de um restaurante

Contexto:
${contextoPrincipal}

${contextoInsights}

Retorne SOMENTE um JSON neste formato, sem markdown:
{
  "plano_detalhado": "Seu plano aqui com múltiplas linhas se necessário"
}`

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
    const content = data.choices?.[0]?.message?.content ?? '{}'

    let planoGerado = ''
    try {
      const parsed = JSON.parse(content)
      planoGerado = parsed.plano_detalhado || ''
    } catch (e) {
      planoGerado = content
    }

    if (!planoGerado) {
      throw new Error('Não foi possível gerar o plano')
    }

    // Atualizar a ação com o novo plano
    const { data: acaoAtualizada, error: updateErr } = await supabaseAdmin
      .from('acoes_operacionais')
      .update({ plano_detalhado: planoGerado })
      .eq('id', acao_id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        status: 'sucesso',
        plano_detalhado: planoGerado,
        acao_id: acao_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err: any) {
    const errMsg =
      err?.message || err?.details || err?.hint || JSON.stringify(err) || 'unknown error'
    return new Response(JSON.stringify({ error: errMsg, code: err?.code, raw: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
