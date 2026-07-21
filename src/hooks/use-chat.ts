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
import { AcaoAgente, FormularioIA, validarAcao } from '@/lib/queries/agente-ia'

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
   * Detector único do agente: decide se a conversa pede uma alteração no
   * sistema, ou se falta informação e é melhor perguntar antes (formulário).
   * Substitui os dois detectores antigos (intenção + atualização de config).
   */
  const detectarAcaoAgente = async (
    textoUsuario: string,
    respostaAssistente: string,
    ctx: any,
  ): Promise<{ acao: AcaoAgente | null; formulario: (FormularioIA & { acao_pretendida?: string }) | null }> => {
    const vazio = { acao: null, formulario: null }
    try {
      const res = await enviarMensagem(
        [
          {
            role: 'system',
            content: construirSystemPromptAgente({
              mensagemUsuario: textoUsuario,
              respostaAssistente,
              configAtual: ctx.configAtual || {},
              acoesAbertas: ctx.acoes || [],
              insightsAtivos: ctx.insights || [],
              camposConfig: Object.entries(CAMPOS_CONFIG).map(([k, v]) => `- ${k} = ${v}`),
            }),
          },
          { role: 'user', content: 'Analise e responda no formato JSON pedido.' },
        ],
        // temperatura 0: a detecção precisa ser consistente, não criativa
        // max_tokens folgado: JSON cortado pela metade quebra o parse
        { response_format: { type: 'json_object' }, temperature: 0, max_tokens: 900 },
      )

      const obj = typeof res === 'string' ? JSON.parse(res) : (res as any)
      const acao: AcaoAgente | null =
        obj?.acao?.tipo && obj?.acao?.dados
          ? {
              tipo: obj.acao.tipo,
              dados: obj.acao.dados,
              descricao: String(obj.acao.descricao || 'Alteração no sistema'),
            }
          : null

      // Descarta ação inválida em vez de deixar quebrar na execução
      if (acao && validarAcao(acao)) return { acao: null, formulario: obj?.formulario ?? null }

      const formulario =
        obj?.formulario?.campos?.length
          ? {
              titulo: String(obj.formulario.titulo || 'Preciso de mais alguns dados'),
              campos: obj.formulario.campos.slice(0, 3),
              acao_pretendida: obj.formulario.acao_pretendida,
            }
          : null

      // Rede de segurança: o detector geral às vezes desiste de criar mesmo com
      // pedido claro. Se a mensagem é um comando de criação, montamos os campos
      // com uma chamada curta e de propósito único, bem mais confiável.
      if (!acao && !formulario) {
        const alvo = detectarPedidoDeCriacao(textoUsuario)
        if (alvo) {
          const montada = await montarCriacao(alvo, textoUsuario)
          if (montada) return { acao: montada, formulario: null }
        }
        if (mencionaCampoDeConfig(textoUsuario)) {
          const cfg = await montarConfig(textoUsuario, ctx.configAtual || {})
          if (cfg) return { acao: cfg, formulario: null }
        }
      }

      return { acao, formulario }
    } catch {
      return vazio
    }
  }

  /** Reconhece "cria/crie/criar uma ação|insight" sem depender do modelo. */
  const detectarPedidoDeCriacao = (texto: string): 'acao' | 'insight' | null => {
    const t = texto.toLowerCase()
    if (!/(cri[ae]r?|adicion[ae]r?|abr[ae]r?|faz|faça|fazer)/.test(t)) return null
    if (/insight/.test(t)) return 'insight'
    if (/a[çc][ãa]o|tarefa/.test(t)) return 'acao'
    return null
  }

  /** Palavras que indicam um dado do perfil, para só então chamar a IA. */
  const mencionaCampoDeConfig = (texto: string): boolean =>
    /(mesa|mesas|lugar|lugares|capacidade|funcion|equipe|hor[áa]rio|abre|fecha|nome|chamo|chama|cozinha|culin[áa]ria|ticket|pre[çc]o m[ée]dio|p[úu]blico|prato|pratos|carro-chefe|diferencial|diferenciais|desafio|endere[çc]o|bairro|fica em|estilo|abri em|desde)/i.test(
      texto,
    )

  const montarConfig = async (
    textoUsuario: string,
    configAtual: Record<string, unknown>,
  ): Promise<AcaoAgente | null> => {
    try {
      const res = await enviarMensagem(
        [
          {
            role: 'system',
            content: construirSystemPromptMontarConfig(
              textoUsuario,
              configAtual,
              Object.entries(CAMPOS_CONFIG).map(([k, v]) => `- ${k} = ${v}`),
            ),
          },
          { role: 'user', content: 'Responda no formato JSON pedido.' },
        ],
        { response_format: { type: 'json_object' }, temperature: 0, max_tokens: 200 },
      )
      const d = typeof res === 'string' ? JSON.parse(res) : (res as any)
      if (!d?.campo || !String(d.valor ?? '').trim()) return null
      const acaoCfg: AcaoAgente = {
        tipo: 'atualizar_config',
        dados: { campo: d.campo, valor: String(d.valor).trim() },
        descricao: `Atualizar ${CAMPOS_CONFIG[d.campo] || d.campo} para "${String(d.valor).trim()}"`,
      }
      return validarAcao(acaoCfg) ? null : acaoCfg
    } catch {
      return null
    }
  }

  const montarCriacao = async (
    tipo: 'acao' | 'insight',
    textoUsuario: string,
  ): Promise<AcaoAgente | null> => {
    try {
      const res = await enviarMensagem(
        [
          { role: 'system', content: construirSystemPromptMontarCriacao(tipo, textoUsuario) },
          { role: 'user', content: 'Monte os campos no formato JSON pedido.' },
        ],
        { response_format: { type: 'json_object' }, temperature: 0, max_tokens: 500 },
      )
      const d = typeof res === 'string' ? JSON.parse(res) : (res as any)
      if (tipo === 'acao' && d?.titulo_acao) {
        return {
          tipo: 'criar_acao',
          dados: d,
          descricao: `Criar a ação "${d.titulo_acao}"`,
        }
      }
      if (tipo === 'insight' && d?.titulo) {
        return {
          tipo: 'criar_insight',
          dados: d,
          descricao: `Criar o insight "${d.titulo}"`,
        }
      }
      return null
    } catch {
      return null
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
    await carregarHistorico(id)
  }

  const removerUltimaMensagem = useCallback(() => aplicar((prev) => prev.slice(0, -1)), [aplicar])

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
