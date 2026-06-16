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
    const { acao_id } = await req.json()
    if (!acao_id) {
      throw new Error('acao_id é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { data: acao, error: acaoErr } = await supabaseAdmin
      .from('acoes_operacionais')
      .select('titulo_acao, plano_detalhado, categoria')
      .eq('id', acao_id)
      .single()

    if (acaoErr || !acao) {
      throw new Error('Ação não encontrada')
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.5-flash-lite'

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada')
    }

    const prompt = `Com base nesta ação que está sendo implementada no restaurante, gere 2 a 3 perguntas curtas e naturais para fazer aos clientes, que captem se a solução está funcionando. As perguntas devem ser levemente direcionadas mas não enviesadas. Retorne APENAS um objeto JSON com a chave "perguntas" contendo um array de strings.
Ação: "${acao.titulo_acao}"
Plano: "${acao.plano_detalhado}"
Categoria: "${acao.categoria}"`

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

    let perguntas: string[] = []
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        perguntas = parsed
      } else if (parsed.perguntas && Array.isArray(parsed.perguntas)) {
        perguntas = parsed.perguntas
      } else {
        perguntas = Object.values(parsed).filter((v) => typeof v === 'string') as string[]
      }
    } catch {
      // Falha silenciosa
    }

    if (perguntas.length > 0) {
      const inserts = perguntas.slice(0, 3).map((p) => ({
        acao_id,
        pergunta: p,
        ativa: true,
      }))
      const { error: insertErr } = await supabaseAdmin
        .from('perguntas_direcionadas')
        .insert(inserts)
      if (insertErr) throw insertErr
    }

    return new Response(JSON.stringify({ sucesso: true, perguntas_geradas: perguntas.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
