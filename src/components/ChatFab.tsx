import {
  MessageCircle,
  Send,
  Plus,
  RefreshCw,
  History,
  ArrowLeft,
  PlusCircle,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  ImageIcon,
  X,
  Globe,
  ChevronDown,
  Check,
  FileText,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { FormattedMessage, parseInline, LINK_ESCURO } from '@/lib/chat-utils'
import { useChat, AnexoMensagem } from '@/hooks/use-chat'
import {
  AcaoAgente, FormularioIA as TipoFormulario, RegistroAcao,
  ACOES_DESTRUTIVAS, executarAcao, reverterAcao,
} from '@/lib/queries/agente-ia'
import { ConfirmacaoAcao } from '@/components/chat/ConfirmacaoAcao'
import { FormularioIA } from '@/components/chat/FormularioIA'
import { VisualizadorAnexo, AnexoVisivel } from '@/components/chat/VisualizadorAnexo'
import { extrairTextoDePdf } from '@/lib/queries/conhecimento'
import { buscarMemoria, FatoMemoria } from '@/lib/queries/memoria-assistente'
import { buscarKpis } from '@/lib/queries/visao-geral'
import { buscarEstatisticasRelatorio } from '@/lib/queries/relatorios'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRestauranteConfig } from '@/hooks/use-restaurante-config'
import { getIniciais } from '@/lib/iniciais'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SUGGESTIONS = [
  'Como estão as avaliações do almoço?',
  'Resumo das reclamações',
  'Elogios recentes à equipe',
]

// ── localStorage helpers ─────────────────────────────────────────────────────

const LS = {
  nomes: 'chat_sessao_nomes',
  fixadas: 'chat_sessao_fixadas',
}

function getSessaoNomes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS.nomes) || '{}') } catch { return {} }
}
function setSessaoNome(id: string, nome: string) {
  const nomes = getSessaoNomes()
  if (nome.trim()) nomes[id] = nome.trim()
  else delete nomes[id]
  localStorage.setItem(LS.nomes, JSON.stringify(nomes))
}
function getSessaoFixadas(): string[] {
  try { return JSON.parse(localStorage.getItem(LS.fixadas) || '[]') } catch { return [] }
}
function toggleFixada(id: string): boolean {
  const fixadas = getSessaoFixadas()
  const isFixed = fixadas.includes(id)
  localStorage.setItem(
    LS.fixadas,
    JSON.stringify(isFixed ? fixadas.filter((f) => f !== id) : [...fixadas, id]),
  )
  return !isFixed
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AnexoPendente {
  id: string
  nome: string
  tipo: 'imagem' | 'pdf' | 'texto'
  /** URL pública (imagem e PDF) — usada para exibir e para a IA ver a imagem */
  url?: string
  /** Texto extraído (PDF e arquivos de texto) — vai como contexto da conversa */
  texto?: string
  previewLocal?: string
  enviando: boolean
}

interface SessaoItem {
  id: string
  preview: string
  date: Date
  pinned: boolean
  nome?: string
}

/** Botão que revela as fontes usadas na pesquisa. */
function Fontes({ fontes }: { fontes: { url: string; titulo: string }[] }) {
  const [aberto, setAberto] = useState(false)
  const dominio = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u }
  }
  return (
    <div className="mt-2 pt-2 border-t border-gray-200/70">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Globe className="h-3 w-3" />
        {fontes.length} {fontes.length === 1 ? 'fonte' : 'fontes'}
        <ChevronDown className={cn('h-3 w-3 transition-transform', aberto && 'rotate-180')} />
      </button>
      {aberto && (
        <div className="mt-1.5 flex flex-col gap-1">
          {fontes.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline"
              title={f.url}
            >
              <span className="text-gray-400">{dominio(f.url)}</span> · {f.titulo || f.url}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatFab() {
  const { pathname } = useLocation()
  const { user, usuario } = useAuth()
  const { mascote, refetch: refetchConfig } = useRestauranteConfig()
  const mascoteNome = mascote.nome
  // O return condicional fica no fim do componente: sair antes dos hooks
  // muda a quantidade de hooks entre renders e quebra o React.
  const ocultar = pathname === '/sugestoes'
  const { toast } = useToast()
  const {
    messages, loading, buscandoWeb, sessaoId, enviar, adicionarMensagemUsuario,
    removerUltimaMensagem, carregarHistorico, novaConversa, mudarSessao,
  } = useChat('global')

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [sessoes, setSessoes] = useState<SessaoItem[]>([])
  const [loadingSessoes, setLoadingSessoes] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Vários anexos por mensagem, de tipos misturados
  const [anexos, setAnexos] = useState<AnexoPendente[]>([])
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [anexoAberto, setAnexoAberto] = useState<AnexoVisivel | null>(null)
  const memoriaRef = useRef<FatoMemoria[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [hasError, setHasError] = useState(false)
  const [failedMessage, setFailedMessage] = useState('')
  // Fluxo do agente
  const [acaoPendente, setAcaoPendente] = useState<AcaoAgente | null>(null)
  const [formularioPendente, setFormularioPendente] = useState<(TipoFormulario & { acao_pretendida?: string }) | null>(null)
  const [ultimoRegistro, setUltimoRegistro] = useState<RegistroAcao | null>(null)
  const [modoAcao, setModoAcao] = useState<'perguntar' | 'automatico'>('perguntar')
  // ref espelha o modo: handleSend captura o state pelo closure e leria o valor
  // antigo na primeira mensagem depois que o modo é carregado do banco
  const modoAcaoRef = useRef<'perguntar' | 'automatico'>('perguntar')

  useEffect(() => {
    if (open && user) carregarHistorico(sessaoId)
  }, [open, user, sessaoId, carregarHistorico])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, hasError])

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus()
  }, [renamingId])

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('open-ai-chat', handler)
    return () => document.removeEventListener('open-ai-chat', handler)
  }, [])

  // ── History fetch ──────────────────────────────────────────────────────────

  const fetchSessoes = useCallback(async () => {
    if (!user) return
    setLoadingSessoes(true)
    try {
      const { data } = await supabase
        .from('mensagens_chat')
        .select('sessao_id, created_at, mensagem, papel')
        .eq('usuario_id', user.id)
        .eq('papel', 'usuario')
        .order('created_at', { ascending: false })

      if (!data) return

      const previewMap = new Map<string, string>()
      const dateMap = new Map<string, Date>()

      for (const msg of data) {
        if (!dateMap.has(msg.sessao_id)) dateMap.set(msg.sessao_id, new Date(msg.created_at))
        previewMap.set(msg.sessao_id, msg.mensagem)
      }

      const nomes = getSessaoNomes()
      const fixadas = getSessaoFixadas()

      const result = Array.from(dateMap.entries())
        .sort(([, a], [, b]) => b.getTime() - a.getTime())
        .map(([id, date]) => ({
          id,
          preview: previewMap.get(id)?.slice(0, 80) || '',
          date,
          pinned: fixadas.includes(id),
          nome: nomes[id],
        }))

      setSessoes(result)
    } finally {
      setLoadingSessoes(false)
    }
  }, [user])

  // ── Grouped sessions ───────────────────────────────────────────────────────

  const groupedSessoes = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)

    const pinned: SessaoItem[] = []
    const todays: SessaoItem[] = []
    const yesterdays: SessaoItem[] = []
    const thisWeek: SessaoItem[] = []
    const older: SessaoItem[] = []

    for (const s of sessoes) {
      if (s.pinned) { pinned.push(s); continue }
      const d = new Date(s.date); d.setHours(0, 0, 0, 0)
      if (d.getTime() === today.getTime()) todays.push(s)
      else if (d.getTime() === yesterday.getTime()) yesterdays.push(s)
      else if (d >= weekAgo) thisWeek.push(s)
      else older.push(s)
    }

    const groups: { label: string; items: SessaoItem[] }[] = []
    if (pinned.length) groups.push({ label: 'Fixadas', items: pinned })
    if (todays.length) groups.push({ label: 'Hoje', items: todays })
    if (yesterdays.length) groups.push({ label: 'Ontem', items: yesterdays })
    if (thisWeek.length) groups.push({ label: 'Esta semana', items: thisWeek })
    if (older.length) groups.push({ label: 'Mais antigas', items: older })
    return groups
  }, [sessoes])

  // ── History actions ────────────────────────────────────────────────────────

  const handleOpenHistory = () => {
    fetchSessoes()
    setView('history')
    setRenamingId(null)
    setDeleteConfirmId(null)
  }

  const handleSelectSessao = async (id: string) => {
    if (renamingId === id) return
    await mudarSessao(id)
    setView('chat')
    setHasError(false)
    setFailedMessage('')
  }

  const handleNovaConversa = () => {
    novaConversa()
    setView('chat')
    setHasError(false)
    setFailedMessage('')
    setAcaoPendente(null)
    setFormularioPendente(null)
    setUltimoRegistro(null)
    setAnexos([])
  }

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    toggleFixada(id)
    setSessoes((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)))
  }

  const handleStartRename = (e: React.MouseEvent, s: SessaoItem) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
    setRenameValue(s.nome || s.preview)
    setRenamingId(s.id)
  }

  const handleSaveRename = (id: string) => {
    setSessaoNome(id, renameValue)
    setSessoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, nome: renameValue.trim() || undefined } : s)),
    )
    setRenamingId(null)
  }

  const handleDeleteRequest = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setRenamingId(null)
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = async (id: string) => {
    try {
      await supabase
        .from('mensagens_chat')
        .delete()
        .eq('sessao_id', id)
        .eq('usuario_id', user!.id)

      setSessoes((prev) => prev.filter((s) => s.id !== id))
      if (id === sessaoId) handleNovaConversa()
      toast({ title: 'Conversa excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
    setDeleteConfirmId(null)
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  const TEXTO_ACEITO = ['text/plain', 'text/markdown', 'text/csv', 'application/json']
  const ACCEPT = 'image/*,application/pdf,.txt,.md,.csv,.json'

  /** Envia um arquivo ao bucket e devolve a URL pública. */
  const subirArquivo = async (file: File) => {
    const ext = file.name.split('.').pop() || 'bin'
    const caminho = `${user?.id ?? 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage
      .from('chat-imagens')
      .upload(caminho, file, { upsert: true, contentType: file.type || undefined })
    if (error) throw error
    return supabase.storage.from('chat-imagens').getPublicUrl(caminho).data.publicUrl
  }

  /** Aceita vários arquivos de uma vez, de tipos misturados. */
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || [])
    e.target.value = ''
    if (!arquivos.length) return

    setEnviandoImagem(true)
    for (const file of arquivos) {
      const ehImagem = file.type.startsWith('image/')
      const ehPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const ehTexto = TEXTO_ACEITO.includes(file.type) || /\.(txt|md|csv|json)$/i.test(file.name)

      if (!ehImagem && !ehPdf && !ehTexto) {
        toast({
          title: `"${file.name}" não é suportado`,
          description: 'Envie imagem, PDF ou arquivo de texto (.txt, .md, .csv, .json).',
          variant: 'destructive',
        })
        continue
      }

      const limite = ehImagem ? 5 : 15
      if (file.size > limite * 1024 * 1024) {
        toast({ title: `"${file.name}" é muito grande`, description: `Máximo ${limite} MB`, variant: 'destructive' })
        continue
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const tipo: AnexoPendente['tipo'] = ehImagem ? 'imagem' : ehPdf ? 'pdf' : 'texto'
      const previewLocal = ehImagem ? URL.createObjectURL(file) : undefined

      setAnexos((p) => [...p, { id, nome: file.name, tipo, previewLocal, enviando: true }])

      try {
        let url: string | undefined
        let texto: string | undefined

        if (ehImagem) {
          url = await subirArquivo(file)
        } else if (ehPdf) {
          // sobe para poder visualizar no chat e extrai o texto para a IA
          ;[url, texto] = await Promise.all([subirArquivo(file), extrairTextoDePdf(file)])
          if (!texto || texto.trim().length < 20) {
            texto = ''
            toast({
              title: `Não consegui ler o texto de "${file.name}"`,
              description: 'Você ainda pode visualizá-lo, mas se for digitalizado a IA não lê o conteúdo.',
            })
          }
        } else {
          texto = await file.text()
        }

        setAnexos((p) => p.map((a) => (a.id === id ? { ...a, url, texto, enviando: false } : a)))
      } catch (err: any) {
        toast({ title: `Erro em "${file.name}"`, description: err.message, variant: 'destructive' })
        setAnexos((p) => p.filter((a) => a.id !== id))
      }
    }
    setEnviandoImagem(false)
  }

  const removerAnexo = (id: string) =>
    setAnexos((p) => {
      const alvo = p.find((a) => a.id === id)
      if (alvo?.previewLocal) URL.revokeObjectURL(alvo.previewLocal)
      return p.filter((a) => a.id !== id)
    })

  const abrirAnexo = (a: { nome: string; tipo: string; url?: string; texto?: string }) => {
    if (a.tipo === 'texto' && !a.texto) return
    if (a.tipo !== 'texto' && !a.url) return
    setAnexoAberto({ nome: a.nome, tipo: a.tipo as AnexoVisivel['tipo'], url: a.url, texto: a.texto })
  }

  /** Reúne, de forma organizada, tudo que a IA precisa saber para responder. */
  const fetchContexto = async () => {
    if (!user) return {}
    const rId = usuario?.restaurante_id ?? null
    const vazio = Promise.resolve({ data: [] as any[] })

    const [feedbacksRes, insightsRes, acoesRes, garconsRes, configRes, kpis, estatisticas, memoria] =
      await Promise.all([
        rId
          ? supabase
              .from('feedbacks_restaurante')
              .select('created_at, categoria, sentimento, texto_original, resumo')
              .eq('restaurante_id', rId) // antes buscava sem filtrar por restaurante
              .order('created_at', { ascending: false })
              .limit(25)
          : vazio,
        // o id é obrigatório: sem ele o agente não consegue editar nem excluir
        rId
          ? supabase.from('insights').select('id, titulo, descricao, prioridade, categoria')
              .eq('ativo', true).eq('restaurante_id', rId).limit(10)
          : vazio,
        rId
          ? supabase.from('acoes_operacionais')
              .select('id, titulo_acao, status, prioridade, categoria')
              .eq('restaurante_id', rId) // antes buscava de todos os restaurantes
              .neq('status', 'CONCLUIDO').limit(10)
          : vazio,
        rId ? supabase.from('garcons').select('nome_garcon').eq('restaurante_id', rId).eq('ativo', true) : vazio,
        rId
          ? supabase.from('restaurantes')
              .select('nome, nome_restaurante, detalhes, mascote_config, perfil_restaurante, tipo_culinaria, numero_mesas, ia_modo_acao')
              .eq('id', rId).single()
          : Promise.resolve({ data: null as any }),
        buscarKpis(rId, '30d').catch(() => null),
        buscarEstatisticasRelatorio(rId, '30d').catch(() => null),
        buscarMemoria(rId),
      ])

    memoriaRef.current = memoria
    if ((configRes.data as any)?.ia_modo_acao) {
      const m = (configRes.data as any).ia_modo_acao === 'automatico' ? 'automatico' : 'perguntar'
      modoAcaoRef.current = m
      setModoAcao(m)
    }

    const cfg = configRes.data as any
    const perfil = (cfg?.perfil_restaurante as any) || {}

    return {
      restaurante_id: rId,
      restaurante: cfg
        ? {
            nome: cfg.nome,
            nome_restaurante: cfg.nome_restaurante,
            detalhes: cfg.detalhes,
            tipo_culinaria: cfg.tipo_culinaria,
            numero_mesas: cfg.numero_mesas,
            perfil,
          }
        : null,
      // versão achatada, só com o que a IA pode atualizar (para detectar conflito)
      configAtual: cfg
        ? {
            nome: cfg.nome ?? '',
            nome_restaurante: cfg.nome_restaurante ?? '',
            tipo_culinaria: cfg.tipo_culinaria ?? '',
            numero_mesas: cfg.numero_mesas ?? '',
            detalhes: cfg.detalhes ?? '',
            ...perfil,
          }
        : {},
      usuario: { nome: usuario?.nome ?? null },
      mascote_config: configRes.data?.mascote_config,
      memoria,
      kpis,
      categorias: estatisticas?.porCategoria ?? [],
      garcons: garconsRes.data || [],
      insights: insightsRes.data || [],
      acoes: acoesRes.data || [],
      feedbacks: feedbacksRes.data || [],
    }
  }

  const handleSend = async (text: string) => {
    const msgTexto = text.trim()
    if ((!msgTexto && !anexos.length) || loading || enviandoImagem) return

    const anexosMsg: AnexoMensagem[] = anexos.map((a) => ({
      nome: a.nome, tipo: a.tipo, url: a.url, texto: a.texto,
    }))
    // Documentos vão como texto no contexto; imagens vão como imagem
    const documentos = anexosMsg.filter((a) => a.tipo !== 'imagem' && a.texto)

    setMessage('')
    setAnexos([])
    setHasError(false)
    setFailedMessage('')
    setAcaoPendente(null)
    setFormularioPendente(null)
    setUltimoRegistro(null)

    // A mensagem aparece na hora — buscar contexto e chamar a IA vem depois
    adicionarMensagemUsuario(msgTexto, anexosMsg.length ? anexosMsg : undefined)

    const contexto: Record<string, any> = await fetchContexto()
    if (documentos.length) contexto.arquivos = documentos

    const result = await enviar(msgTexto, contexto, undefined, anexosMsg, {
      jaExibida: true,
      memoria: memoriaRef.current,
    })

    if (result?.error) {
      setHasError(true)
      setFailedMessage(msgTexto)
      // Remove a mensagem que falhou: se ela ficar no histórico (ex: com um
      // anexo inválido), toda mensagem seguinte a reenvia e falha também.
      removerUltimaMensagem()
      return
    }

    if (result?.formulario) {
      setFormularioPendente(result.formulario)
    } else if (result?.acao) {
      // Excluir nunca roda sozinho, nem no modo automático
      const destrutiva = ACOES_DESTRUTIVAS.includes(result.acao.tipo)
      if (modoAcaoRef.current === 'automatico' && !destrutiva) {
        await aplicarAcao(result.acao, 'automatico')
      } else {
        setAcaoPendente(result.acao)
      }
    }
  }

  /** Executa a alteração e guarda o registro para permitir desfazer. */
  const aplicarAcao = async (acao: AcaoAgente, modo: 'automatico' | 'confirmado') => {
    if (!usuario?.restaurante_id) return
    try {
      const registro = await executarAcao(usuario.restaurante_id, acao, modo)
      setUltimoRegistro(registro)
      setAcaoPendente(null)
      refetchConfig()
      toast({
        title: modo === 'automatico' ? 'Feito pela IA' : 'Alteração aplicada',
        description: acao.descricao,
      })
    } catch (e: any) {
      toast({ title: 'Não consegui aplicar', description: e.message, variant: 'destructive' })
      setAcaoPendente(null)
    }
  }

  const desfazer = async () => {
    if (!ultimoRegistro) return
    try {
      await reverterAcao(ultimoRegistro)
      setUltimoRegistro(null)
      refetchConfig()
      toast({ title: 'Desfeito', description: 'O valor anterior foi restaurado.' })
    } catch (e: any) {
      toast({ title: 'Não consegui desfazer', description: e.message, variant: 'destructive' })
    }
  }

  /** Respostas do formulário voltam como mensagem, para a IA agir com os dados. */
  const responderFormulario = (respostas: Record<string, string>) => {
    const form = formularioPendente
    setFormularioPendente(null)
    if (!form) return
    const resumo = form.campos
      .map((c) => (respostas[c.nome] ? `${c.label}: ${respostas[c.nome]}` : ''))
      .filter(Boolean)
      .join('; ')
    if (resumo) handleSend(resumo)
  }

  if (ocultar) return null

  const messagesToRender =
    messages.length === 0
      ? [{ role: 'assistant' as const, content: `Olá! Sou o ${mascoteNome}, seu assistente de inteligência. Como posso ajudar a melhorar seu restaurante hoje?`, anexos: undefined, fontes: undefined }]
      : messages.map((m) => ({ role: m.role, content: m.text, anexos: m.anexos, fontes: m.fontes }))

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevation hover:shadow-lg hover:scale-105 transition-all z-40 bg-[#1D4ED8]"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-[380px] p-0 flex flex-col h-full border-l shadow-2xl">

          {/* ── Header ── */}
          <SheetHeader className="p-4 border-b bg-white shrink-0">
            <SheetTitle className="flex items-center gap-3 text-lg font-semibold">
              {view === 'history' ? (
                <>
                  <button onClick={() => setView('chat')} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-bold text-gray-900 flex-1">Conversas</span>
                  <button onClick={handleNovaConversa} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] rounded-full hover:bg-blue-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Nova
                  </button>
                </>
              ) : (
                <>
                  <Avatar className="h-10 w-10 border border-gray-100 shadow-sm shrink-0">
                    {mascote.fotoUrl && <AvatarImage src={mascote.fotoUrl} alt={mascoteNome} className="object-cover" />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {getIniciais(mascoteNome, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-bold text-gray-900">{mascoteNome}</span>
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={handleOpenHistory} title="Histórico" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                      <History className="h-4 w-4" />
                    </button>
                    <button onClick={handleNovaConversa} title="Nova conversa" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {view === 'history' ? 'Histórico de conversas' : 'Assistente de Inteligência'}
            </SheetDescription>
          </SheetHeader>

          {/* ── History view ── */}
          {!anexoAberto && view === 'history' && (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {loadingSessoes ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Carregando...</div>
              ) : groupedSessoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <History className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Nenhuma conversa ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Suas conversas aparecerão aqui</p>
                </div>
              ) : (
                <div className="py-2">
                  {groupedSessoes.map((group) => (
                    <div key={group.label}>
                      <p className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        {group.label === 'Fixadas' && <Pin className="h-3 w-3" />}
                        {group.label}
                      </p>
                      {group.items.map((s) => (
                        <div
                          key={s.id}
                          className={cn(
                            'group relative border-b border-gray-100 last:border-0',
                            s.id === sessaoId && 'border-l-2 border-l-[#1D4ED8] bg-white',
                          )}
                        >
                          {renamingId === s.id ? (
                            // Rename mode
                            <div className="px-4 py-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={renameInputRef}
                                className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(s.id)
                                  if (e.key === 'Escape') setRenamingId(null)
                                }}
                                onBlur={() => handleSaveRename(s.id)}
                              />
                              <button onClick={() => handleSaveRename(s.id)} className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0">OK</button>
                            </div>
                          ) : deleteConfirmId === s.id ? (
                            // Delete confirm
                            <div className="px-4 py-3 flex items-center justify-between gap-2 bg-rose-50" onClick={(e) => e.stopPropagation()}>
                              <p className="text-xs text-rose-700 font-medium">Excluir esta conversa?</p>
                              <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:text-gray-800">Cancelar</button>
                                <button onClick={() => handleDeleteConfirm(s.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-800">Excluir</button>
                              </div>
                            </div>
                          ) : (
                            // Normal item
                            <button
                              onClick={() => handleSelectSessao(s.id)}
                              className={cn(
                                'w-full text-left px-4 py-3 hover:bg-white transition-colors flex flex-col gap-0.5',
                                s.id === sessaoId && 'bg-white',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-800 line-clamp-2 leading-snug flex-1">
                                  {s.nome || s.preview}
                                </p>
                                {/* Hover actions */}
                                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 -mt-0.5">
                                  <button
                                    onClick={(e) => handleTogglePin(e, s.id)}
                                    title={s.pinned ? 'Desafixar' : 'Fixar'}
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-amber-500 transition-colors"
                                  >
                                    {s.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={(e) => handleStartRename(e, s)}
                                    title="Renomear"
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteRequest(e, s.id)}
                                    title="Excluir"
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {formatDistanceToNow(s.date, { addSuffix: true, locale: ptBR })}
                              </p>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Chat view ── */}
          {anexoAberto ? (
            <VisualizadorAnexo anexo={anexoAberto} onVoltar={() => setAnexoAberto(null)} />
          ) : null}

          {!anexoAberto && view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white">
                {messagesToRender.map((msg, i) => {
                  const isLast = i === messagesToRender.length - 1
                  return (
                    <div key={i} className="flex flex-col gap-2">
                      <div className={cn('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'px-4 py-3 rounded-2xl text-sm max-w-[85%] shadow-sm',
                            msg.role === 'user'
                              ? 'bg-[#1D4ED8] text-white rounded-tr-none'
                              : 'bg-[#F9FAFB] text-[#1F2937] border border-gray-100 rounded-tl-none',
                          )}
                        >
                          {!!msg.anexos?.length && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {msg.anexos.map((a, ai) =>
                                a.tipo === 'imagem' ? (
                                  <button key={ai} onClick={() => abrirAnexo(a)} className="block">
                                    <img
                                      src={a.url}
                                      alt={a.nome}
                                      className="max-w-[170px] max-h-[150px] object-cover rounded-lg hover:opacity-90 transition"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    key={ai}
                                    onClick={() => abrirAnexo(a)}
                                    className={cn(
                                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 max-w-[190px] transition',
                                      msg.role === 'user'
                                        ? 'bg-white/15 hover:bg-white/25'
                                        : 'bg-gray-100 hover:bg-gray-200',
                                    )}
                                    title={a.nome}
                                  >
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-[11px] truncate">{a.nome}</span>
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                          {msg.role === 'user' ? (
                            <span className="whitespace-pre-wrap">
                              {parseInline(msg.content as string, LINK_ESCURO)}
                            </span>
                          ) : (
                            <FormattedMessage content={msg.content as string} />
                          )}
                          {!!msg.fontes?.length && <Fontes fontes={msg.fontes} />}
                        </div>
                      </div>
                      {isLast && msg.role === 'assistant' && ultimoRegistro && !loading && (
                        <div className="flex w-full justify-start pl-2 items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                            <Check className="h-3 w-3" /> {ultimoRegistro.descricao}
                          </span>
                          <Button
                            size="sm" variant="ghost"
                            className="text-[11px] h-7 rounded-full text-gray-500 hover:text-gray-800"
                            onClick={desfazer}
                          >
                            <Undo2 className="h-3 w-3 mr-1" /> Desfazer
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {loading && (
                  <div className="flex w-full justify-start">
                    <div className="px-4 py-3 rounded-2xl text-sm bg-[#F9FAFB] border border-gray-100 rounded-tl-none shadow-sm flex items-center gap-2">
                      {buscandoWeb ? (
                        <>
                          <Globe className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                          <span className="text-xs text-gray-500">Pesquisando na internet…</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {hasError && (
                  <div className="flex w-full justify-start">
                    <div className="px-4 py-3 rounded-2xl text-sm bg-red-50 text-red-700 border border-red-100 rounded-tl-none shadow-sm flex flex-col gap-2 max-w-[85%]">
                      <span>Desculpe, tive um problema. Tente novamente.</span>
                      <Button size="sm" variant="ghost" className="h-7 w-fit text-xs bg-white text-red-700 hover:bg-red-100" onClick={() => handleSend(failedMessage)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Tentar Novamente
                      </Button>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              <div className="p-4 border-t bg-white flex flex-col gap-3 shrink-0">
                {/* Sugestões */}
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      disabled={loading}
                      className="whitespace-nowrap px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Preview de imagem */}
                {anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {anexos.map((a) => (
                      <div key={a.id} className="relative group">
                        {a.tipo === 'imagem' ? (
                          <button
                            onClick={() => abrirAnexo(a)}
                            className="block h-16 w-16 rounded-lg border border-gray-200 overflow-hidden"
                          >
                            <img src={a.url || a.previewLocal} alt={a.nome} className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <button
                            onClick={() => abrirAnexo(a)}
                            className="flex items-center gap-2 h-16 max-w-[190px] rounded-lg border border-gray-200 bg-gray-50 px-3 hover:bg-gray-100"
                            title={a.nome}
                          >
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-[11px] text-gray-700 truncate text-left">{a.nome}</span>
                          </button>
                        )}
                        {a.enviando && (
                          <div className="absolute inset-0 bg-black/45 rounded-lg flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-white animate-spin" />
                          </div>
                        )}
                        <button
                          onClick={() => removerAnexo(a.id)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input área */}
                <div className="flex items-end gap-2 relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title="Anexar imagens, PDFs ou textos"
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#1D4ED8] hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-40"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <Textarea
                    placeholder={`Pergunte ao ${mascoteNome}...`}
                    className="min-h-[60px] max-h-[120px] resize-none pr-12 rounded-xl text-sm"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend(message)
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 bg-[#1D4ED8] hover:bg-blue-800 text-white rounded-lg disabled:opacity-50"
                    onClick={() => handleSend(message)}
                    disabled={(!message.trim() && !anexos.length) || loading || enviandoImagem}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmação da alteração proposta pela IA (modo perguntar) */}
      {acaoPendente && (
        <ConfirmacaoAcao
          acao={acaoPendente}
          onConfirmar={() => aplicarAcao(acaoPendente, 'confirmado')}
          onCancelar={() => setAcaoPendente(null)}
        />
      )}

      {/* Perguntas que a IA faz antes de agir */}
      {formularioPendente && (
        <FormularioIA
          formulario={formularioPendente}
          onEnviar={responderFormulario}
          onCancelar={() => setFormularioPendente(null)}
        />
      )}

    </>
  )
}
