import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { enviarMensagem, ChatMessage } from '@/lib/openrouter'
import { construirSystemPromptChef } from '@/lib/prompts-sistema'

export interface MensagemChat {
  id?: string
  role: 'user' | 'assistant'
  text: string
  intent?: 'criar_acao' | 'criar_insight' | null
  suggestedData?: any
}

export function useChat(contextoPagina: string, contextoDadosIniciais: any = {}) {
  const [messages, setMessages] = useState<MensagemChat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sessaoId] = useState(() => {
    const saved = localStorage.getItem('chat_sessao_id')
    const savedTime = localStorage.getItem('chat_sessao_time')
    if (saved && savedTime && Date.now() - parseInt(savedTime) < 24 * 60 * 60 * 1000) {
      return saved
    }
    const newId = crypto.randomUUID()
    localStorage.setItem('chat_sessao_id', newId)
    localStorage.setItem('chat_sessao_time', Date.now().toString())
    return newId
  })

  const detectarIntencao = async (textoUsuario: string, contexto: any) => {
    try {
      const res = await enviarMensagem(
        [
          {
            role: 'system',
            content:
              'Identifique se o usuário quer criar uma "acao" (plano de ação) ou um "insight". Retorne em formato JSON estrito: { "tipo": "criar_acao" | "criar_insight" | null, "dadosSugeridos": { "titulo": string, "descricao": string, "prioridade": "URGENTE"|"IMPORTANTE"|"OBSERVACAO" } }',
          },
          { role: 'user', content: textoUsuario },
        ],
        { response_format: { type: 'json_object' } },
      )

      return res as { tipo: 'criar_acao' | 'criar_insight' | null; dadosSugeridos: any }
    } catch (e) {
      return { tipo: null, dadosSugeridos: null }
    }
  }

  const carregarHistorico = async (id: string) => {
    const { data } = await supabase
      .from('mensagens_chat')
      .select('*')
      .eq('sessao_id', id)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.papel === 'usuario' ? 'user' : 'assistant',
          text: m.mensagem,
        })),
      )
    }
  }

  const enviar = async (
    texto: string,
    contextoDadosAdicionais: any = {},
    systemMessageOverride?: string,
  ) => {
    setLoading(true)
    setError(null)

    let currentMessages = [...messages]
    if (texto) {
      currentMessages = [...currentMessages, { role: 'user', text: texto }]
      setMessages(currentMessages)
    }

    try {
      const contextoFinal = { ...contextoDadosIniciais, ...contextoDadosAdicionais }
      const sysPrompt =
        systemMessageOverride ||
        construirSystemPromptChef(contextoFinal.mascote_config, contextoFinal)

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: sysPrompt },
        ...currentMessages.map((m) => ({ role: m.role, content: m.text }) as ChatMessage),
      ]

      const resposta = await enviarMensagem(apiMessages)

      let intent = null
      let suggestedData = null

      if (texto) {
        const deteccao = await detectarIntencao(texto, contextoFinal)
        intent = deteccao.tipo
        suggestedData = deteccao.dadosSugeridos
      }

      const msgAssistente: MensagemChat = {
        role: 'assistant',
        text: resposta,
        intent,
        suggestedData,
      }

      setMessages((prev) => [...prev, msgAssistente])

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        if (texto) {
          await supabase.from('mensagens_chat').insert({
            usuario_id: user.id,
            sessao_id: sessaoId,
            mensagem: texto,
            papel: 'usuario',
            contexto_pagina: contextoPagina,
            contexto_dados: contextoFinal,
          })
        }
        await supabase.from('mensagens_chat').insert({
          usuario_id: user.id,
          sessao_id: sessaoId,
          mensagem: resposta,
          papel: 'assistente',
          contexto_pagina: contextoPagina,
          contexto_dados: contextoFinal,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a IA')
    } finally {
      setLoading(false)
    }
  }

  return {
    messages,
    loading,
    error,
    enviar,
    carregarHistorico,
    detectarIntencao,
    setMessages,
    setError,
    sessaoId,
  }
}
