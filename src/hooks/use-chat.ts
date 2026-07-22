import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { enviarMensagem, enviarMensagemComFontes, ChatMessage, FonteWeb } from '@/lib/openrouter'
import {
  construirSystemPromptChef, construirSystemPromptAgente, construirSystemPromptMontarCriacao, construirSystemPromptMontarConfig,
  MARCADOR_BUSCA, MARCADOR_LEITURA,
} from '@/lib/prompts-sistema'
import { memorizarDaConversa, FatoMemoria } from '@/lib/queries/memoria-assistente'
import { buscarConhecimento, extrairTextoDeUrl as lerPagina } from '@/lib/queries/conhecimento'
import { CAMPOS_CONFIG } from '@/lib/queries/config-update'
import { AcaoAgente, FormularioIA } from '@/lib/queries/agente-ia'
import { decidirAlteracao, analisarDocumentos, blocoDeAnalises, AnaliseArquivo } from '@/lib/ia/agentes'

export interface AtualizacaoConfig {
  campo: string
  valor: string
  rotulo: string
}

export interface AnexoMensagem {
  nome: string
  tipo: 'imagem' | 'pdf' | 'texto'
  url?: string
  texto?: string
}

export interface MensagemChat {
  id?: string
  /** Identificador local e estável — não muda se a lista for reordenada ou
   *  recarregada. A posição no array (índice) mudaria e apontaria para a
   *  mensagem errada. */
  uid: string
  role: 'user' | 'assistant'
  text: string
  /** Anexos da mensagem (imagens, PDFs e textos) */
  anexos?: AnexoMensagem[]
  fontes?: FonteWeb[]
  /** Alterações aplicadas a partir desta resposta (marca de "feito") */
  registros?: { id: string; descricao: string }[]
  /** Alteração proposta por esta resposta, aguardando o dono confirmar */
  proposta?: AcaoAgente | null
  /** Leitura dos arquivos desta mensagem, feita por um agente sem memória */
  analises?: AnaliseArquivo[]
}

export interface ResultadoEnvio {
  error?: string
  /** Alteração que o agente quer executar (ou já executou, no modo automático) */
  acao?: AcaoAgente | null
  /** Perguntas que a IA quer fazer antes de agir */
  formulario?: (FormularioIA & { acao_pretendida?: string }) | null
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
  // Índice das leituras de arquivo já feitas nesta conversa
  const analisesRef = useRef<AnaliseArquivo[]>([])

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
  const novoUid = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const adicionarMensagemUsuario = useCallback(
    (texto: string, anexos?: AnexoMensagem[]) =>
      aplicar((prev) => [...prev, { uid: novoUid(), role: 'user', text: texto, anexos }]),
    [aplicar],
  )

  /**
   * Time de agentes: um roteador decide o assunto e o especialista daquele
   * assunto monta a alteração. Substituiu o detector único, que errava por
   * tentar decidir tudo num prompt só.
   */
  const detectarAcaoAgente = async (
    textoUsuario: string,
    respostaAssistente: string,
    ctx: any,
  ): Promise<{ acao: AcaoAgente | null; formulario: (FormularioIA & { acao_pretendida?: string }) | null }> => {
    try {
      const acao = await decidirAlteracao(textoUsuario, respostaAssistente, {
        configAtual: ctx.configAtual || {},
        acoes: ctx.acoes || [],
        insights: ctx.insights || [],
      })
      return { acao, formulario: null }
    } catch {
      return { acao: null, formulario: null }
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
            uid: m.id,
            role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
            text: m.mensagem,
            // anexos ficam em contexto_dados (o schema de mensagens_chat não muda);
            // o formato antigo guardava só { imagem }
            anexos:
              (m.contexto_dados as any)?.anexos ||
              ((m.contexto_dados as any)?.imagem
                ? [{ nome: 'imagem', tipo: 'imagem', url: (m.contexto_dados as any).imagem }]
                : undefined),
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
    anexos?: AnexoMensagem[],
    opcoes: { jaExibida?: boolean; memoria?: FatoMemoria[]; buscaWeb?: boolean } = {},
  ): Promise<ResultadoEnvio> => {
    enviandoRef.current = true
    setLoading(true)
    setError(null)

    // Se a UI já exibiu a mensagem (caminho normal), não duplica
    let currentMessages = messagesRef.current
    if (!opcoes.jaExibida && (texto || anexos?.length)) {
      currentMessages = adicionarMensagemUsuario(texto, anexos)
    }

    try {
      const contextoFinal = { ...contextoDadosIniciais, ...contextoDadosAdicionais }

      // Agente de documentos (sem memória): lê os arquivos desta mensagem
      // isoladamente. É o que evita ele confundir com arquivos antigos.
      if (contextoFinal.arquivos?.length) {
        const analises = await analisarDocumentos(contextoFinal.arquivos)
        analisesRef.current = [...analisesRef.current, ...analises]
        contextoFinal.analiseArquivos = blocoDeAnalises(
          analises,
          analisesRef.current.slice(0, -analises.length),
        )
      } else if (analisesRef.current.length) {
        // Sem anexo agora: só o índice do que já foi lido na conversa
        contextoFinal.analiseArquivos = blocoDeAnalises([], analisesRef.current)
      }

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
          // Só imagens viram parte visual; PDF/texto vão como contexto textual
          const imagens = (m.anexos || []).filter((a) => a.tipo === 'imagem' && a.url)
          if (imagens.length) {
            return {
              role: m.role,
              content: [
                ...imagens.map((a) => ({
                  type: 'image_url' as const,
                  image_url: { url: a.url!, detail: 'low' as const },
                })),
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
      aplicar((prev) => [...prev, { uid: novoUid(), role: 'assistant', text: respostaTexto, fontes }])
      setLoading(false) // enviandoRef segue travado até gravar, para nada sobrescrever

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (texto || anexos?.length) {
          await supabase.from('mensagens_chat').insert({
            usuario_id: user.id,
            sessao_id: sessaoId,
            mensagem: texto,
            papel: 'usuario',
            contexto_pagina: contextoPagina,
            // guarda só o necessário para reexibir (texto extraído fica de fora)
            contexto_dados: {
              anexos: (anexos || []).map((a) => ({ nome: a.nome, tipo: a.tipo, url: a.url ?? null })),
            },
          })
        }
        await supabase.from('mensagens_chat').insert({
          usuario_id: user.id,
          sessao_id: sessaoId,
          mensagem: respostaTexto,
          papel: 'assistente',
          contexto_pagina: contextoPagina,
          contexto_dados: {},
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

      // Detecção do agente — roda em bastidor, depois da resposta
      let acao: AcaoAgente | null = null
      let formulario: (FormularioIA & { acao_pretendida?: string }) | null = null
      if (texto) {
        const r = await detectarAcaoAgente(texto, respostaTexto, contextoFinal)
        acao = r.acao
        formulario = r.formulario
      }

      return { acao, formulario }
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
    analisesRef.current = []
    await carregarHistorico(id)
  }

  const removerUltimaMensagem = useCallback(() => aplicar((prev) => prev.slice(0, -1)), [aplicar])

  /** Apaga uma mensagem do usuário e a resposta da IA que veio logo depois. */
  const excluirMensagem = useCallback(
    async (uid: string) => {
      let idBanco: string | undefined
      aplicar((prev) => {
        const idx = prev.findIndex((m) => m.uid === uid)
        if (idx === -1) return prev
        idBanco = prev[idx].id
        const fim = prev[idx + 1]?.role === 'assistant' ? idx + 2 : idx + 1
        return [...prev.slice(0, idx), ...prev.slice(fim)]
      })
      // Remove do banco a mensagem e a resposta seguinte da mesma sessão
      if (idBanco) {
        const { data: user } = await supabase.auth.getUser()
        if (user?.user) {
          const { data: linhas } = await supabase
            .from('mensagens_chat')
            .select('id, created_at')
            .eq('sessao_id', sessaoId)
            .order('created_at', { ascending: true })
          const i = (linhas || []).findIndex((l) => l.id === idBanco)
          if (i !== -1) {
            const alvos = [linhas![i].id]
            if (linhas![i + 1]) alvos.push(linhas![i + 1].id)
            await supabase.from('mensagens_chat').delete().in('id', alvos)
          }
        }
      }
    },
    [aplicar, sessaoId],
  )

  /** Troca o texto de uma mensagem do usuário na tela e no banco. */
  const editarMensagem = useCallback(
    async (uid: string, novoTexto: string) => {
      let idBanco: string | undefined
      aplicar((prev) =>
        prev.map((m) => {
          if (m.uid === uid) {
            idBanco = m.id
            return { ...m, text: novoTexto }
          }
          return m
        }),
      )
      if (idBanco) {
        await supabase.from('mensagens_chat').update({ mensagem: novoTexto }).eq('id', idBanco)
      }
    },
    [aplicar],
  )

  /** Prende a proposta à última resposta da IA (o botão vive com a mensagem). */
  const anexarProposta = useCallback(
    (proposta: AcaoAgente | null): string | null => {
      let alvo: string | null = null
      aplicar((prev) => {
        const copia = [...prev]
        for (let i = copia.length - 1; i >= 0; i--) {
          if (copia[i].role === 'assistant') {
            alvo = copia[i].uid
            copia[i] = { ...copia[i], proposta }
            break
          }
        }
        return copia
      })
      return alvo
    },
    [aplicar],
  )

  /** Tira a proposta de uma mensagem (já aplicada ou descartada). */
  const limparProposta = useCallback(
    (uid: string) => aplicar((prev) => prev.map((m) => (m.uid === uid ? { ...m, proposta: null } : m))),
    [aplicar],
  )

  /** Prende a marca de "feito" à última resposta da IA. */
  const anexarRegistro = useCallback(
    (registro: { id: string; descricao: string }) =>
      aplicar((prev) => {
        const copia = [...prev]
        for (let i = copia.length - 1; i >= 0; i--) {
          if (copia[i].role === 'assistant') {
            copia[i] = { ...copia[i], registros: [...(copia[i].registros || []), registro] }
            break
          }
        }
        return copia
      }),
    [aplicar],
  )

  /** Tira a marca da tela (a alteração continua valendo no sistema). */
  const removerRegistro = useCallback(
    (id: string) =>
      aplicar((prev) => prev.map((m) => (m.registros ? { ...m, registros: m.registros.filter((r) => r.id !== id) } : m))),
    [aplicar],
  )

  return {
    messages,
    loading,
    buscandoWeb,
    error,
    enviar,
    adicionarMensagemUsuario,
    removerUltimaMensagem,
    excluirMensagem,
    editarMensagem,
    anexarProposta,
    limparProposta,
    anexarRegistro,
    removerRegistro,
    carregarHistorico,
    setMessages: (m: MensagemChat[]) => aplicar(() => m),
    setError,
    sessaoId,
    novaConversa,
    mudarSessao,
  }
}
