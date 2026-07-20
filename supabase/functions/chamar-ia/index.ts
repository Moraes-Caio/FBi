import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, options = {} } = await req.json()
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    const modelo = Deno.env.get('OPENROUTER_MODELO') || 'google/gemini-2.0-flash-exp:free'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Busca na web (plugin do OpenRouter). Só é ligada quando o cliente pede,
    // porque cada busca tem custo por requisição.
    const web = options.web === true
    const maxResultados = Math.min(Math.max(Number(options.web_max_results) || 4, 1), 8)

    const body = {
      model: options.model || modelo,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      ...(options.response_format ? { response_format: options.response_format } : {}),
      ...(web
        ? {
            plugins: [
              {
                id: 'web',
                max_results: maxResultados,
                search_prompt:
                  'Uma busca na web foi feita hoje. Use os resultados abaixo para responder com informacao atual e cite a fonte (nome do site) quando usar algum deles.',
              },
            ],
          }
        : {}),
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://feedbackinteligente.app',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(
        JSON.stringify({ error: `OpenRouter error: ${response.status}`, detail: err }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message ?? {}
    const content = message.content ?? ''

    // Fontes usadas pela busca (annotations do padrão OpenRouter)
    const fontes = Array.isArray(message.annotations)
      ? message.annotations
          .filter((a: any) => a?.type === 'url_citation' && a?.url_citation?.url)
          .map((a: any) => ({ url: a.url_citation.url, titulo: a.url_citation.title ?? '' }))
      : []

    let result = content
    if (options.response_format?.type === 'json_object') {
      try {
        result = JSON.parse(content)
      } catch {
        result = content
      }
    }

    return new Response(JSON.stringify({ result, fontes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
