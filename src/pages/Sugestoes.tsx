import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Upload,
  X,
  Video,
  Loader2,
  MessageCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Inbox,
  ImageIcon,
  Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  buscarSugestoes,
  criarSugestao,
  excluirSugestao,
  getSignedUrls,
  uploadArquivosSugestao,
  type Sugestao,
} from '@/lib/queries/sugestoes'

// ── Status badge ──────────────────────────────────────────────────────────────

const statusConfig = {
  aberta: {
    label: 'Aberta',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
    icon: Clock,
  },
  respondida: {
    label: 'Respondida',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    icon: MessageCircle,
  },
  finalizada: {
    label: 'Finalizada',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: CheckCircle2,
  },
} as const

// ── Arquivo preview ────────────────────────────────────────────────────────────

interface ArquivoLocal {
  file: File
  previewUrl: string | null
  tipo: 'image' | 'video'
}

function isImage(path: string) {
  return /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(path)
}

// ── Card de sugestão ──────────────────────────────────────────────────────────

function SugestaoCard({
  sugestao,
  onExcluir,
}: {
  sugestao: Sugestao
  onExcluir: (id: string) => Promise<void>
}) {
  const [aberto, setAberto] = useState(sugestao.status === 'respondida')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [excluindo, setExcluindo] = useState(false)
  const [urlsCarregadas, setUrlsCarregadas] = useState(false)
  const cfg = statusConfig[sugestao.status] ?? statusConfig.aberta
  const StatusIcon = cfg.icon

  const carregarUrls = useCallback(async () => {
    if (urlsCarregadas || sugestao.arquivos.length === 0) return
    const urls = await getSignedUrls(sugestao.arquivos)
    setSignedUrls(urls)
    setUrlsCarregadas(true)
  }, [sugestao.arquivos, urlsCarregadas])

  const handleToggle = () => {
    if (!aberto) carregarUrls()
    setAberto((v) => !v)
  }

  const handleExcluir = async () => {
    setExcluindo(true)
    try {
      await onExcluir(sugestao.id)
    } finally {
      setExcluindo(false)
    }
  }

  const dataFormatada = format(new Date(sugestao.created_at), "d 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  })
  const dataRelativa = formatDistanceToNow(new Date(sugestao.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div
      className={cn(
        'bg-white rounded-xl border transition-shadow',
        sugestao.status === 'respondida'
          ? 'border-blue-200 shadow-sm'
          : 'border-gray-200 shadow-subtle',
      )}
    >
      {/* Header sempre visível */}
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                cfg.className,
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
            {sugestao.arquivos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Paperclip className="h-3 w-3" />
                {sugestao.arquivos.length} arquivo{sugestao.arquivos.length !== 1 ? 's' : ''}
              </span>
            )}
            {sugestao.respostas.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                <MessageCircle className="h-3 w-3" />
                {sugestao.respostas.length} resposta{sugestao.respostas.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className={cn('text-sm text-gray-700 leading-relaxed', !aberto && 'line-clamp-2')}>
            {sugestao.texto}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
          <span className="text-[11px] text-gray-400 whitespace-nowrap" title={dataFormatada}>
            {dataRelativa}
          </span>
          {aberto ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {aberto && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-gray-100 pt-4">
          {/* Arquivos */}
          {sugestao.arquivos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Arquivos anexados
              </p>
              <div className="flex flex-wrap gap-2">
                {sugestao.arquivos.map((path, i) => {
                  const url = signedUrls[path]
                  const img = isImage(path)
                  const filename = path.split('/').pop() ?? path
                  return img ? (
                    url ? (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`anexo ${i + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div
                        key={i}
                        className="h-20 w-20 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                      >
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )
                  ) : (
                    <a
                      key={i}
                      href={url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-20 w-24 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-1 px-2 text-center transition-colors"
                    >
                      <Video className="h-6 w-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                        {filename}
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Respostas do suporte */}
          {sugestao.respostas.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Resposta do suporte
              </p>
              {sugestao.respostas.map((r) => (
                <div
                  key={r.id}
                  className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-700">{r.autor}</span>
                    <span className="text-[11px] text-blue-400">
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                    {r.texto}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Finalizar = excluir */}
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcluir}
              disabled={excluindo}
              className="gap-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {excluindo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Finalizar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Sugestoes() {
  const { user, usuario } = useAuth()
  const { toast } = useToast()

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetAberto, setSheetAberto] = useState(false)

  // Form
  const [texto, setTexto] = useState('')
  const [arquivos, setArquivos] = useState<ArquivoLocal[]>([])
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Carregar ──

  const carregar = useCallback(async () => {
    try {
      const data = await buscarSugestoes()
      setSugestoes(data)
    } catch {
      toast({ title: 'Erro ao carregar sugestões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  // ── Upload de arquivos ──

  const processarArquivos = (fileList: FileList | null) => {
    if (!fileList) return
    const novos: ArquivoLocal[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      if (file.size > 100 * 1024 * 1024) {
        toast({ title: `"${file.name}" excede 100 MB`, variant: 'destructive' })
        continue
      }
      novos.push({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        tipo: file.type.startsWith('image/') ? 'image' : 'video',
      })
    }
    setArquivos((prev) => [...prev, ...novos])
  }

  const removerArquivo = (i: number) => {
    setArquivos((prev) => {
      const next = [...prev]
      if (next[i].previewUrl) URL.revokeObjectURL(next[i].previewUrl!)
      next.splice(i, 1)
      return next
    })
  }

  const resetForm = () => {
    setTexto('')
    arquivos.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
    setArquivos([])
    setArrastando(false)
  }

  // ── Enviar ──

  const handleEnviar = async () => {
    if (!texto.trim() && arquivos.length === 0) return
    if (!user) return
    setEnviando(true)
    try {
      const paths = await uploadArquivosSugestao(user.id, arquivos.map((a) => a.file))
      await criarSugestao(texto.trim(), paths, usuario?.restaurante_id ?? null)
      toast({ title: 'Enviado!', description: 'Nossa equipe responderá em breve.' })
      resetForm()
      setSheetAberto(false)
      await carregar()
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  // ── Finalizar (= excluir) ──

  const handleExcluir = async (id: string) => {
    try {
      await excluirSugestao(id)
      setSugestoes((prev) => prev.filter((s) => s.id !== id))
      toast({ title: 'Finalizado e removido.' })
    } catch {
      toast({ title: 'Erro ao finalizar', variant: 'destructive' })
    }
  }

  // ── Render ──

  return (
    <div className="mx-auto max-w-[780px] pb-12 animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sugestões e Dúvidas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Envie sua dúvida ou sugestão e acompanhe as respostas aqui.
          </p>
        </div>
        <Button onClick={() => setSheetAberto(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nova mensagem
        </Button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <Skeleton className="h-4 w-24 mb-3 rounded-full" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : sugestoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-base font-medium text-gray-700">Nenhuma mensagem ainda</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Envie sua primeira dúvida ou sugestão para nossa equipe.
          </p>
          <Button onClick={() => setSheetAberto(true)} variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Enviar mensagem
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sugestoes.map((s) => (
            <SugestaoCard key={s.id} sugestao={s} onExcluir={handleExcluir} />
          ))}
        </div>
      )}

      {/* Sheet de nova mensagem */}
      <Sheet
        open={sheetAberto}
        onOpenChange={(v) => {
          if (!v) resetForm()
          setSheetAberto(v)
        }}
      >
        <SheetContent className="sm:max-w-[460px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Nova mensagem</SheetTitle>
            <SheetDescription>
              Descreva sua dúvida ou sugestão e anexe imagens ou vídeos se quiser.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4">
            {/* Drop zone */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => processarArquivos(e.target.files)}
              />

              {arquivos.length === 0 ? (
                <div
                  onDrop={(e) => {
                    e.preventDefault()
                    setArrastando(false)
                    processarArquivos(e.dataTransfer.files)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setArrastando(true)
                  }}
                  onDragLeave={() => setArrastando(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                    arrastando
                      ? 'border-[#1D4ED8] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Upload className="h-6 w-6 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600 text-center">
                    Arraste ou clique para anexar
                  </p>
                  <p className="text-xs text-gray-400">Imagens e vídeos · Máx 100 MB cada</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {arquivos.map((arq, i) => (
                      <div key={i} className="relative group">
                        {arq.tipo === 'image' ? (
                          <img
                            src={arq.previewUrl!}
                            alt={arq.file.name}
                            className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-lg border border-gray-200 bg-gray-100 flex flex-col items-center justify-center gap-1 px-1">
                            <Video className="h-6 w-6 text-gray-400" />
                            <span className="text-[10px] text-gray-500 text-center line-clamp-2 leading-tight">
                              {arq.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removerArquivo(i)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {arquivos.length} arquivo{arquivos.length !== 1 ? 's' : ''} selecionado
                    {arquivos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            <Textarea
              placeholder="Descreva sua dúvida ou sugestão..."
              className="min-h-[140px] resize-none text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enviando}
            />
          </div>

          <SheetFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setSheetAberto(false)
              }}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={(!texto.trim() && arquivos.length === 0) || enviando}
              className="gap-2"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
