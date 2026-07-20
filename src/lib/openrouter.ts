import { supabase } from '@/lib/supabase/client'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface EnviarMensagemOptions {
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  model?: string
  /** Liga a busca na web (tem custo por requisição — usar só quando necessário) */
  web?: boolean
  web_max_results?: number
}

export interface FonteWeb {
  url: string
  titulo: string
}

// Mude para true para testar o visual sem gastar créditos da IA
const MOCK_IA = false

export async function enviarMensagem(
  messages: ChatMessage[],
  options: EnviarMensagemOptions = {},
): Promise<string | Record<string, unknown>> {
  if (MOCK_IA) {
    if (options.response_format?.type === 'json_object') {
      return { tipo: null, dadosSugeridos: null }
    }
    return 'Resposta simulada (MOCK_IA ativo).'
  }

  const { data, error } = await supabase.functions.invoke('chamar-ia', {
    body: { messages, options },
  })

  if (error) throw new Error(`Erro ao chamar Edge Function: ${error.message}`)
  if (data?.error) throw new Error(data.error)

  return data?.result ?? ''
}

/** Igual a enviarMensagem, mas devolve também as fontes citadas pela busca web. */
export async function enviarMensagemComFontes(
  messages: ChatMessage[],
  options: EnviarMensagemOptions = {},
): Promise<{ texto: string; fontes: FonteWeb[] }> {
  if (MOCK_IA) return { texto: 'Resposta simulada (MOCK_IA ativo).', fontes: [] }

  const { data, error } = await supabase.functions.invoke('chamar-ia', {
    body: { messages, options },
  })

  if (error) throw new Error(`Erro ao chamar Edge Function: ${error.message}`)
  if (data?.error) throw new Error(data.error)

  const bruto = data?.result ?? ''
  return {
    texto: typeof bruto === 'string' ? bruto : JSON.stringify(bruto),
    fontes: Array.isArray(data?.fontes) ? data.fontes : [],
  }
}
