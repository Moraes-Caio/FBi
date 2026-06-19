import { supabase } from '@/lib/supabase/client'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface EnviarMensagemOptions {
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  model?: string
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
