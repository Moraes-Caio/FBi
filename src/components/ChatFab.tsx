import { MessageCircle, Send, PlusCircle, RefreshCw } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { FormattedMessage } from '@/lib/chat-utils'
import { useChat } from '@/hooks/use-chat'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRestauranteConfig } from '@/hooks/use-restaurante-config'
import { getIniciais } from '@/lib/iniciais'
import { useToast } from '@/hooks/use-toast'

const SUGGESTIONS = [
  'Como estão as avaliações do almoço?',
  'Resumo das reclamações',
  'Elogios recentes à equipe',
]

export function ChatFab() {
  const { user } = useAuth()
  const { mascote } = useRestauranteConfig()
  const mascoteNome = mascote.nome
  const { toast } = useToast()
  const { messages, loading, sessaoId, enviar, carregarHistorico, detectarIntencao } =
    useChat('global')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const [hasError, setHasError] = useState(false)
  const [failedMessage, setFailedMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<{
    tipo: 'criar_acao' | 'criar_insight'
    dados: any
  } | null>(null)

  const [isAcaoOpen, setIsAcaoOpen] = useState(false)
  const [acaoForm, setAcaoForm] = useState({
    titulo_acao: '',
    plano_detalhado: '',
    prioridade: 'IMPORTANTE',
  })
  const [isInsightOpen, setIsInsightOpen] = useState(false)
  const [insightForm, setInsightForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'OBSERVACAO',
  })

  useEffect(() => {
    if (open && user) carregarHistorico(sessaoId)
  }, [open, user, sessaoId, carregarHistorico])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, hasError])

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('open-ai-chat', handler)
    return () => document.removeEventListener('open-ai-chat', handler)
  }, [])

  const fetchContexto = async () => {
    if (!user) return {}
    const { data: userData } = await supabase
      .from('usuarios')
      .select('restaurante_id')
      .eq('id', user.id)
      .single()
    const rId = userData?.restaurante_id
    const [feedbacksRes, insightsRes, configRes] = await Promise.all([
      supabase
        .from('feedbacks_restaurante')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      rId
        ? supabase.from('insights').select('*').eq('ativo', true).eq('restaurante_id', rId)
        : Promise.resolve({ data: [] }),
      rId
        ? supabase.from('config_restaurantes').select('mascote_config').eq('id', rId).single()
        : Promise.resolve({ data: null }),
    ])
    return {
      feedbacks: feedbacksRes.data || [],
      insights: insightsRes.data || [],
      mascote_config: configRes.data?.mascote_config,
      restaurante_id: rId,
    }
  }

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return
    const msgTexto = text
    setMessage('')
    setHasError(false)
    setFailedMessage('')
    setPendingAction(null)

    const contexto = await fetchContexto()
    const intencao = await detectarIntencao(msgTexto)
    const result = await enviar(msgTexto, contexto)

    if (result?.error) {
      setHasError(true)
      setFailedMessage(msgTexto)
    } else if (intencao?.tipo) {
      setPendingAction({ tipo: intencao.tipo, dados: intencao.dadosSugeridos })
    }
  }

  const handleCriarAcao = async () => {
    try {
      const { error } = await supabase.from('acoes_operacionais').insert({
        titulo_acao: acaoForm.titulo_acao,
        plano_detalhado: acaoForm.plano_detalhado,
        prioridade: acaoForm.prioridade,
        status: 'PENDENTE',
      })
      if (error) throw error
      toast({ title: 'Ação criada!' })
      setIsAcaoOpen(false)
      setPendingAction(null)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleCriarInsight = async () => {
    try {
      const { data: ud } = await supabase
        .from('usuarios')
        .select('restaurante_id')
        .eq('id', user?.id)
        .single()
      const { error } = await supabase.from('insights').insert({
        restaurante_id: ud?.restaurante_id,
        titulo: insightForm.titulo,
        descricao: insightForm.descricao,
        prioridade: insightForm.prioridade,
        gerado_por: 'manual',
        ativo: true,
      })
      if (error) throw error
      toast({ title: 'Insight criado!' })
      setIsInsightOpen(false)
      setPendingAction(null)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const openActionModal = () => {
    if (pendingAction?.tipo === 'criar_acao') {
      setAcaoForm({
        titulo_acao: pendingAction.dados?.titulo_acao || pendingAction.dados?.titulo || '',
        plano_detalhado:
          pendingAction.dados?.plano_detalhado || pendingAction.dados?.descricao || '',
        prioridade: pendingAction.dados?.prioridade || 'IMPORTANTE',
      })
      setIsAcaoOpen(true)
    } else if (pendingAction) {
      setInsightForm({
        titulo: pendingAction.dados?.titulo || '',
        descricao: pendingAction.dados?.descricao || '',
        prioridade: pendingAction.dados?.prioridade || 'OBSERVACAO',
      })
      setIsInsightOpen(true)
    }
  }

  const messagesToRender =
    messages.length === 0
      ? [
          {
            role: 'assistant',
            content: `Olá! Sou o ${mascoteNome}, seu assistente de inteligência. Como posso ajudar a melhorar seu restaurante hoje?`,
          },
        ]
      : messages.map((m) => ({ role: m.role, content: m.text }))

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
          <SheetHeader className="p-4 border-b bg-white text-foreground">
            <SheetTitle className="flex items-center gap-3 text-lg font-semibold">
              <Avatar className="h-10 w-10 border border-gray-100 shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {getIniciais(mascoteNome, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-bold text-gray-900">{mascoteNome}</span>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                </span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Assistente de Inteligência Artificial
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white">
            {messagesToRender.map((msg, i) => {
              if (msg.role === 'system') return null
              const isLast = i === messagesToRender.length - 1
              return (
                <div key={i} className="flex flex-col gap-2">
                  <div
                    className={cn(
                      'flex w-full',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'px-4 py-3 rounded-2xl text-sm max-w-[85%] shadow-sm whitespace-pre-wrap',
                        msg.role === 'user'
                          ? 'bg-[#1D4ED8] text-white rounded-tr-none'
                          : 'bg-[#F9FAFB] text-[#1F2937] border border-gray-100 rounded-tl-none',
                      )}
                    >
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                    </div>
                  </div>
                  {isLast && msg.role === 'assistant' && pendingAction && !loading && (
                    <div className="flex w-full justify-start pl-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs h-8 rounded-full border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        onClick={openActionModal}
                      >
                        <PlusCircle className="h-3 w-3" />
                        {pendingAction.tipo === 'criar_acao' ? 'Criar Ação' : 'Criar Insight'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="flex w-full justify-start">
                <div className="px-4 py-3 rounded-2xl text-sm bg-[#F9FAFB] border border-gray-100 rounded-tl-none shadow-sm flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}

            {hasError && (
              <div className="flex w-full justify-start">
                <div className="px-4 py-3 rounded-2xl text-sm bg-red-50 text-red-700 border border-red-100 rounded-tl-none shadow-sm flex flex-col gap-2 max-w-[85%]">
                  <span>Desculpe, tive um problema. Tente novamente.</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-fit text-xs bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={() => handleSend(failedMessage)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 border-t bg-white flex flex-col gap-3">
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

            <div className="flex items-end gap-2 relative">
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
                disabled={!message.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isAcaoOpen} onOpenChange={setIsAcaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Ação Operacional</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input
                value={acaoForm.titulo_acao}
                onChange={(e) => setAcaoForm((p) => ({ ...p, titulo_acao: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Plano Detalhado</Label>
              <Textarea
                value={acaoForm.plano_detalhado}
                onChange={(e) => setAcaoForm((p) => ({ ...p, plano_detalhado: e.target.value }))}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAcaoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarAcao}>Salvar Ação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInsightOpen} onOpenChange={setIsInsightOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Insight</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input
                value={insightForm.titulo}
                onChange={(e) => setInsightForm((p) => ({ ...p, titulo: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                value={insightForm.descricao}
                onChange={(e) => setInsightForm((p) => ({ ...p, descricao: e.target.value }))}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInsightOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarInsight}>Salvar Insight</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
