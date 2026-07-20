import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { enviarMensagem, enviarMensagemComFontes, ChatMessage, FonteWeb } from '@/lib/openrouter'
import { construirSystemPromptChef, MARCADOR_BUSCA, MARCADOR_LEITURA } from '@/lib/prompts-sistema'
import { memorizarDaConversa, FatoMemoria } from '@/lib/queries/memoria-assistente'
import { buscarConhecimento, extrairTextoDeUrl as lerPagina } from '@/lib/queries/conhecimento'
import { CAMPOS_CONFIG, campoValido } from '@/lib/queries/config-update'

export interface AtualizacaoConfig {
  campo: string
  valor: string
  rotulo: string
}

export interface MensagemChat {
  id?: string
  role: 'user' | 'assistant'
  text: string
  imageUrl?: string
  intent?: 'criar_acao' | 'criar_insight' | null
  suggestedData?: any
  fontes?: FonteWeb[]
}

export interface ResultadoEnvio {
  error?: string
  intent?: 'criar_acao' | 'criar_insight' | null
  suggestedData?: any
  atualizacaoConfig?: AtualizacaoConfig | null
}

export function useChat(contextoPagina: string, contextoDadosIniciais: any = {}) {
  const [messages, setMessages] = useState<MensagemChat[]>([])
  const [loading, setLoading] = useState(false)
  const [buscandoWeb, setBuscandoWeb] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Espelha o state para o envio não depender de um render acontecer antes
  const messagesRef = useRef<MensagemChat[]>([])
  // Trava recargas de histórico enquanto há um envio em andamento
  const enviandoRef = useRef(false)

  const aplicar = useCallback((fn: (prev: MensagemChat[]) => MensagemChat[]) => {
    const novo = fn(messagesRef.current)
    messagesRef.current = novo
    setMessages(novo)
    return novo
  }, [])

  const [sessaoId, setSessaoId] = useState(() => {
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

  /**
   * Coloca a mensagem do usuário na tela IMEDIATAMENTE, antes de qualquer
   * chamada de rede. Devolve o histórico já com ela para o envio usar.
   */
  const adicionarMensagemUsuario = useCallback(
    (texto: string, imageUrl?: string) => aplicar((prev) => [...prev, { role: 'user', text: texto, imageUrl }]),
    [aplicar],
  )

  /**
   * Detecta se o usuário quer atualizar um dado da configuração — seja informando
   * um valor novo, seja confirmando um que a IA acabou de propor.
   */
  const detectarAtualizacaoConfig = async (
    textoUsuario: string,
    ultimaResposta: string,
    configAtual: Record<string, unknown>,
  ): Promise<AtualizacaoConfig | null> => {
    try {
      const res = await enviarMensagem(
        [
          {
            role: 'system',
            content: `Você decide se o usuário quer ATUALIZAR um dado da configuração do restaurante.

Campos possíveis (use exatamente estas chaves): ${Object.keys(CAMPOS_CONFIG).join(', ')}.

Configuração atual: ${JSON.stringify(configAtual)}
Última fala do assistente: "${ultimaResposta}"

Responda { "campo": <chave ou null>, "valor": <novo valor como texto> } apenas quando:
- o usuário AFIRMA um dado que substitui o atual (ex: "meu nome é Breno", "agora são 30 mesas"), ou
- o usuário CONFIRMA uma atualização que o assistente propôs (ex: "sim", "pode atualizar", "isso", "vc atualiza").
Se o usuário só faz uma pergunta, ou não há valor novo claro, responda { "campo": null, "valor": "" }.`,
          },
          { role: 'user', content: textoUsuario },
        ],
        { response_format: { type: 'json_object' } },
      )
      const obj = res as any
      if (obj?.campo && campoValido(obj.campo) && String(obj.valor || '').trim()) {
        return { campo: obj.campo, valor: String(obj.valor).trim(), rotulo: CAMPOS_CONFIG[obj.campo] }
      }
      return null
    } catch {
      return null
    }
  }

  const detectarIntencao = async (textoUsuario: string) => {
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
    } catch {
      return { tipo: null, dadosSugeridos: null }
    }
  }

  /**
   * IMPORTANTE: precisa ser estável (useCallback). Sem isso, um efeito que a
   * tenha como dependência dispara a cada render e recarrega o histórico do
   * banco por cima das mensagens locais — apagando a mensagem recém-enviada
   * e a resposta da IA antes delas terem sido gravadas.
   */
  const carregarHistorico = useCallback(
    async (id: string) => {
      // Não sobrescreve o que está na tela durante um envio em andamento
      if (enviandoRef.current) return

      const { data } = await supabase
        .from('mensagens_chat')
        .select('*')
        .eq('sessao_id', id)
        .order('created_at', { ascending: true })

      if (data && !enviandoRef.current) {
        aplicar(() =>
          data.map((m) => ({
            id: m.id,
            role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
            text: m.mensagem,
            // a imagem fica em contexto_dados (o schema de mensagens_chat não é alterado)
            imageUrl: (m.contexto_dados as any)?.imagem || undefined,
          })),
        )
      }
    },
    [aplicar],
  )

  const enviar = async (
    texto: string,
    contextoDadosAdicionais: any = {},
    systemMessageOverride?: string,
    imageUrl?: string,
    opcoes: { jaExibida?: boolean; memoria?: FatoMemoria[]; buscaWeb?: boolean } = {},
  ): Promise<ResultadoEnvio> => {
    enviandoRef.current = true
    setLoading(true)
    setError(null)

    // Se a UI já exibiu a mensagem (caminho normal), não duplica
    let currentMessages = messagesRef.current
    if (!opcoes.jaExibida && (texto || imageUrl)) {
      currentMessages = adicionarMensagemUsuario(texto, imageUrl)
    }

    try {
      const contextoFinal = { ...contextoDadosIniciais, ...contextoDadosAdicionais }

      // RAG: busca vetorial nos documentos de treinamento antes de montar o prompt
      if (texto && !systemMessageOverride) {
        contextoFinal.conhecimento = await buscarConhecimento(texto, 5)
      }

      const podeBuscar = opcoes.buscaWeb !== false && !systemMessageOverride
      const sysPrompt =
        systemMessageOverride ||
        construirSystemPromptChef(contextoFinal.mascote_config, contextoFinal, {
          podeBuscarWeb: podeBuscar,
        })

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: sysPrompt },
        ...currentMessages.map((m): ChatMessage => {
          if (m.imageUrl) {
            return {
              role: m.role,
              content: [
                { type: 'image_url', image_url: { url: m.imageUrl, detail: 'low' } },
                ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
              ],
            }
          }
          return { role: m.role, content: m.text }
        }),
      ]

      let { texto: respostaTexto, fontes } = await enviarMensagemComFontes(apiMessages)

      // A IA sinalizou que precisa de informação externa. Só gastamos uma
      // consulta quando ela própria diz que precisa.
      const bruto = respostaTexto.trim()
      const pedeBusca = bruto.toUpperCase().startsWith(MARCADOR_BUSCA)
      const pedeLeitura = bruto.toUpperCase().startsWith(MARCADOR_LEITURA)

      if (podeBuscar && (pedeBusca || pedeLeitura)) {
        setBuscandoWeb(true)
        try {
          const promptComBusca = construirSystemPromptChef(
            contextoFinal.mascote_config,
            contextoFinal,
            { jaBuscou: true },
          )
          const historico = apiMessages.slice(1)

          let termosBusca = pedeBusca
            ? bruto.slice(MARCADOR_BUSCA.length).replace(/^[:\s]+/, '').trim()
            : ''
          let leituraOk = false

          if (pedeLeitura) {
            const url = bruto.slice(MARCADOR_LEITURA.length).replace(/^[:\s]+/, '').trim()
            const pagina = await lerPagina(url)

            if (pagina.ok) {
              respostaTexto = (
                await enviarMensagemComFontes([
                  { role: 'system', content: promptComBusca },
                  ...historico,
                  {
                    role: 'system',
                    content: `Conteúdo da página ${url} (${pagina.titulo}):\n\n${pagina.texto!.slice(0, 12000)}`,
                  },
                ])
              ).texto
              fontes = [{ url, titulo: pagina.titulo || url }]
              leituraOk = true
            } else {
              // Página bloqueada ou feita em JS: em vez de falhar, pesquisa na web
              termosBusca = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
            }
          }

          if (!leituraOk) {
            const comWeb = await enviarMensagemComFontes(
              [
                { role: 'system', content: promptComBusca },
                ...historico,
                ...(termosBusca
                  ? [{ role: 'system' as const, content: `Pesquise por: ${termosBusca}` }]
                  : []),
              ],
              { web: true },
            )
            respostaTexto = comWeb.texto
            fontes = comWeb.fontes
          }
        } catch (err: any) {
          // Consulta externa falhou: em vez de mostrar erro técnico, responde
          // com o que sabe, avisando que não conseguiu acessar a internet.
          console.warn('Consulta externa falhou:', err)
          try {
            respostaTexto = (
              await enviarMensagemComFontes([
                { role: 'system', content: sysPrompt },
                ...apiMessages.slice(1),
                {
                  role: 'system',
                  content:
                    'A consulta à internet falhou. Responda com o que você já sabe, avisando numa frase curta que não conseguiu acessar a internet agora e que a informação pode estar desatualizada. Não mencione erros técnicos.',
                },
              ])
            ).texto
          } catch {
            respostaTexto =
              'Não consegui acessar a internet agora para confirmar isso. Tente de novo em instantes.'
          }
          fontes = []
        } finally {
          setBuscandoWeb(false)
        }
      }

      // Mostra a resposta assim que chega e JÁ desliga o "digitando":
      // o que vem depois (gravar histórico, memória, intenção) é trabalho de
      // bastidor e não deve deixar o indicador aceso.
      aplicar((prev) => [...prev, { role: 'assistant', text: respostaTexto, fontes }])
      setLoading(false) // enviandoRef segue travado até gravar, para nada sobrescrever

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (texto || imageUrl) {
          await supabase.from('mensagens_chat').insert({
            usuario_id: user.id,
            sessao_id: sessaoId,
            mensagem: texto,
            papel: 'usuario',
            contexto_pagina: contextoPagina,
            contexto_dados: { imagem: imageUrl || null },
          })
        }
        await supabase.from('mensagens_chat').insert({
          usuario_id: user.id,
          sessao_id: sessaoId,
          mensagem: respostaTexto,
          papel: 'assistente',
          contexto_pagina: contextoPagina,
          contexto_dados: { imagem: null },
        })
      }

      // Memória de longo prazo — em segundo plano, nunca bloqueia a resposta
      if (texto) {
        void memorizarDaConversa(
          contextoFinal.restaurante_id ?? null,
          texto,
          respostaTexto,
          opcoes.memoria ?? contextoFinal.memoria ?? [],
        )
      }

      let intent: ResultadoEnvio['intent'] = null
      let suggestedData: any = null
      let atualizacaoConfig: AtualizacaoConfig | null = null
      if (texto) {
        // As duas detecções rodam em paralelo, em bastidor
        const [deteccao, atual] = await Promise.all([
          detectarIntencao(texto),
          contextoFinal.configAtual
            ? detectarAtualizacaoConfig(texto, respostaTexto, contextoFinal.configAtual)
            : Promise.resolve(null),
        ])
        intent = deteccao.tipo
        suggestedData = deteccao.dadosSugeridos
        atualizacaoConfig = atual
        if (intent) {
          aplicar((prev) => {
            const copia = [...prev]
            const ultimo = copia[copia.length - 1]
            if (ultimo?.role === 'assistant') copia[copia.length - 1] = { ...ultimo, intent, suggestedData }
            return copia
          })
        }
      }

      return { intent, suggestedData, atualizacaoConfig }
    } catch (err: any) {
      const msg = err.message || 'Erro ao comunicar com a IA'
      setError(msg)
      return { error: msg }
    } finally {
      enviandoRef.current = false
      setLoading(false)
    }
  }

  const novaConversa = () => {
    const newId = crypto.randomUUID()
    localStorage.setItem('chat_sessao_id', newId)
    localStorage.setItem('chat_sessao_time', Date.now().toString())
    setSessaoId(newId)
    aplicar(() => [])
  }

  const mudarSessao = async (id: string) => {
    setSessaoId(id)
    aplicar(() => [])
    await carregarHistorico(id)
  }

  const removerUltimaMensagem = useCallback(() => aplicar((prev) => prev.slice(0, -1)), [aplicar])

  return {
    messages,
    loading,
    buscandoWeb,
    error,
    enviar,
    adicionarMensagemUsuario,
    removerUltimaMensagem,
    carregarHistorico,
    detectarIntencao,
    setMessages: (m: MensagemChat[]) => aplicar(() => m),
    setError,
    sessaoId,
    novaConversa,
    mudarSessao,
  }
}
