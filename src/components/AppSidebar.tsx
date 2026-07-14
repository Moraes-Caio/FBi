import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  Zap,
  FileBarChart,
  QrCode,
  HelpCircle,
  Upload,
  X,
  Video,
  Loader2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRestauranteConfig } from '@/hooks/use-restaurante-config'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getIniciais } from '@/lib/iniciais'
import { usePermissoes } from '@/hooks/use-permissoes'
import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Visão Geral', href: '/', icon: LayoutDashboard, modulo: 'visao_geral' },
  { name: 'Feedbacks', href: '/feedbacks', icon: MessageSquare, modulo: 'feedbacks' },
  { name: 'Insights', href: '/insights', icon: Lightbulb, modulo: 'insights' },
  { name: 'Ações', href: '/acoes', icon: Zap, modulo: 'acoes' },
  { name: 'Relatórios', href: '/relatorios', icon: FileBarChart, modulo: 'relatorios' },
  { name: 'QR Code', href: '/qrcode', icon: QrCode, modulo: 'qrcodes' },
]

interface ArquivoPreview {
  file: File
  previewUrl: string | null
  tipo: 'image' | 'video'
}

export function AppSidebar() {
  const location = useLocation()
  const { nomeRestaurante, logoUrl } = useRestauranteConfig()
  const { podeVer } = usePermissoes()
  const { user, usuario } = useAuth()
  const { toast } = useToast()

  const [dialogAberto, setDialogAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [arquivos, setArquivos] = useState<ArquivoPreview[]>([])
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const novos: ArquivoPreview[] = []
    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) continue
      if (file.size > 100 * 1024 * 1024) {
        toast({ title: `"${file.name}" excede 100 MB`, variant: 'destructive' })
        continue
      }
      const previewUrl = isImage ? URL.createObjectURL(file) : null
      novos.push({ file, previewUrl, tipo: isImage ? 'image' : 'video' })
    }
    setArquivos((prev) => [...prev, ...novos])
  }, [toast])

  const removerArquivo = (index: number) => {
    setArquivos((prev) => {
      const next = [...prev]
      if (next[index].previewUrl) URL.revokeObjectURL(next[index].previewUrl!)
      next.splice(index, 1)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    processarArquivos(e.dataTransfer.files)
  }

  const handleEnviar = async () => {
    if (!texto.trim() && arquivos.length === 0) return
    setEnviando(true)
    try {
      const paths: string[] = []
      for (const arq of arquivos) {
        const ext = arq.file.name.split('.').pop()
        const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage
          .from('sugestoes-plataforma')
          .upload(path, arq.file, { upsert: false })
        if (error) throw error
        paths.push(path)
      }

      const { error: dbError } = await supabase.from('sugestoes_plataforma').insert({
        usuario_id: user?.id,
        restaurante_id: usuario?.restaurante_id ?? null,
        texto: texto.trim(),
        arquivos: paths,
      })
      if (dbError) throw dbError

      toast({ title: 'Enviado com sucesso!', description: 'Obrigado pelo seu feedback.' })
      setTexto('')
      arquivos.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
      setArquivos([])
      setDialogAberto(false)
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sidebar className="border-r border-border bg-white text-sidebar-foreground">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={nomeRestaurante} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold">{getIniciais(nomeRestaurante, 2)}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {nomeRestaurante}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Feedback Intelligence
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navigation
            .filter((item) => podeVer(item.modulo))
            .map((item) => {
              const isActive = location.pathname === item.href
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={
                      isActive
                        ? 'h-10 text-[15px] font-medium transition-colors bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]'
                        : 'h-10 text-[15px] font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  >
                    <Link to={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        <button
          onClick={() => setDialogAberto(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Sugestões e Dúvidas</span>
        </button>
      </SidebarFooter>

      {/* ── Dialog de sugestões ── */}
      <Dialog open={dialogAberto} onOpenChange={(v) => {
        if (!v) {
          arquivos.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
          setArquivos([])
          setTexto('')
        }
        setDialogAberto(v)
      }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Sugestões e Dúvidas</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Nos conte o que você está pensando — melhorias, problemas ou dúvidas. Nossa equipe responderá em breve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {/* Área de upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => processarArquivos(e.target.files)}
              />

              {/* Drop zone (só aparece quando não tem arquivos) */}
              {arquivos.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
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
                  <p className="text-sm font-medium text-gray-600">Arraste ou clique para anexar</p>
                  <p className="text-xs text-gray-400">Imagens e vídeos · Máx 100 MB cada</p>
                </div>
              )}

              {/* Grid de previews */}
              {arquivos.length > 0 && (
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
                            <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2 w-full px-1">
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

                    {/* Botão + para adicionar mais */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{arquivos.length} arquivo{arquivos.length !== 1 ? 's' : ''} selecionado{arquivos.length !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>

            {/* Campo de texto */}
            <Textarea
              placeholder="Descreva sua sugestão, dúvida ou problema..."
              className="min-h-[110px] resize-none text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enviando}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={enviando}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
