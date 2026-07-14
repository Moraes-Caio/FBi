import { useState, useEffect, useLayoutEffect, useRef, useCallback, Fragment } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Send, Paperclip, X, Video, FileText, FileSpreadsheet,
  ChevronDown, Pencil, Trash2, Check, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  buscarSugestoes,
  criarSugestao,
  responderSugestao,
  editarSugestao,
  editarResposta,
  excluirResposta,
  excluirSugestao,
  excluirArquivosStorage,
  getSignedUrls,
  uploadArquivosSugestao,
  marcarClienteLeu,
  type Sugestao,
} from '@/lib/queries/sugestoes'
import { supabase } from '@/lib/supabase/client'
import { DoubleCheck } from '@/components/DoubleCheck'

// ── Palette ───────────────────────────────────────────────────────────────────
const WA_TEAL = '#128C7E'
const WA_BG = '#ECE5DD'
const WA_SENT = '#DCF8C6'

// ── Types ─────────────────────────────────────────────────────────────────────
type FileKind = 'image' | 'video' | 'pdf' | 'doc' | 'other'

interface ThreadMsg {
  id: string
  texto: string
  role: 'eu' | 'suporte'
  arquivos: string[]
  time: string
  tipo: 'sugestao' | 'resposta'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function msgTime(date: string) {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm', { locale: ptBR })
  if (isYesterday(d)) return `ontem ${format(d, 'HH:mm')}`
  return format(d, "dd/MM 'às' HH:mm")
}

function getFileKind(path: string): FileKind {
  const p = path.toLowerCase()
  if (/\.(jpe?g|png|gif|webp|heic|avif)$/.test(p)) return 'image'
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(p)) return 'video'
  if (/\.pdf$/.test(p)) return 'pdf'
  if (/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv|odt|ods)$/.test(p)) return 'doc'
  return 'other'
}

function fileName(path: string) {
  const base = path.split('/').pop() ?? path
  // Novo formato: {timestamp}-{random}-{nome_original}
  const m = base.match(/^\d+-[a-z0-9]+-(.+)$/)
  return m ? m[1] : base
}

function openInSystem(url: string, path: string) {
  const name = fileName(path)
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    })
    .catch(console.error)
}

function getClientLastRead(id: string): number {
  return parseInt(localStorage.getItem(`fib_client_${id}`) ?? '0', 10)
}
function setClientLastRead(id: string): void {
  localStorage.setItem(`fib_client_${id}`, String(Date.now()))
}

function buildThread(s: Sugestao): ThreadMsg[] {
  const msgs: ThreadMsg[] = [
    { id: s.id, texto: s.texto, role: 'eu', arquivos: s.arquivos, time: s.created_at, tipo: 'sugestao' },
    ...s.respostas.map((r) => ({
      id: r.id,
      texto: r.texto,
      role: (r.autor === 'usuario' ? 'eu' : 'suporte') as 'eu' | 'suporte',
      arquivos: r.arquivos,
      time: r.created_at,
      tipo: 'resposta' as const,
    })),
  ]
  return msgs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

// ── Modal de mídia (lightbox) ─────────────────────────────────────────────────
function MediaModal({ url, kind, name, onClose }: {
  url: string; kind: 'image' | 'video'; name: string; onClose: () => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        <X className="h-5 w-5" />
      </button>
      {kind === 'image' ? (
        <img
          src={url}
          alt={name}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

// ── FileCard: exibe um arquivo no bubble ──────────────────────────────────────
function FileCard({ path, url, isMe }: { path: string; url: string; isMe: boolean }) {
  const [open, setOpen] = useState(false)
  if (!url) return null
  const kind = getFileKind(path)
  const name = fileName(path)
  const Icon = kind === 'video' ? Video : kind === 'pdf' ? FileText : kind === 'doc' ? FileSpreadsheet : Paperclip

  if (kind === 'image') {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="block mt-1.5 cursor-zoom-in">
          <img src={url} alt="" className="max-h-52 max-w-[220px] rounded-xl object-cover hover:opacity-90 transition-opacity" />
        </button>
        {open && <MediaModal url={url} kind="image" name={name} onClose={() => setOpen(false)} />}
      </>
    )
  }

  if (kind === 'video') {
    return (
      <>
        <div
          className="relative mt-1.5 cursor-pointer rounded-xl overflow-hidden"
          style={{ maxWidth: '220px' }}
          onClick={() => setOpen(true)}
        >
          <video
            src={url}
            className="w-full block max-h-52 object-cover"
            preload="metadata"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="h-11 w-11 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </div>
        </div>
        {open && <MediaModal url={url} kind="video" name={name} onClose={() => setOpen(false)} />}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => openInSystem(url, path)}
      className={cn(
        'mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium hover:opacity-80 transition-opacity',
        isMe ? 'bg-[#b7e8a8] text-gray-700' : 'bg-gray-100 text-gray-600',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[160px]">{name}</span>
    </button>
  )
}

// ── Miniatura para o modo de edição ──────────────────────────────────────────
function ThumbExistente({
  path, url, onRemove,
}: { path: string; url: string; onRemove: () => void }) {
  const kind = getFileKind(path)
  return (
    <div className="relative group/thumb">
      <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/60 bg-white/40 flex items-center justify-center">
        {kind === 'image' && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-0.5 px-1">
            {kind === 'video' ? <Video className="h-5 w-5 text-gray-500" /> :
             kind === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> :
             kind === 'doc' ? <FileSpreadsheet className="h-5 w-5 text-blue-500" /> :
             <Paperclip className="h-5 w-5 text-gray-500" />}
            <span className="text-[8px] text-gray-500 text-center leading-tight line-clamp-2">
              {fileName(path).split('.').pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
        title="Remover arquivo"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function ThumbNovo({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/')
  const isVid = file.type.startsWith('video/')
  return (
    <div className="relative">
      <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/60 bg-white/40 flex items-center justify-center">
        {isImg ? (
          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
        ) : isVid ? (
          <Video className="h-5 w-5 text-gray-500" />
        ) : (
          <div className="flex flex-col items-center gap-0.5 px-1">
            <Paperclip className="h-5 w-5 text-gray-500" />
            <span className="text-[8px] text-gray-500 text-center leading-tight line-clamp-2">
              {file.name.split('.').pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── Bubble editável ───────────────────────────────────────────────────────────
interface EditBubbleProps {
  msg: ThreadMsg
  signedUrls: Record<string, string>
  onSave: (texto: string, existentes: string[], novos: File[], removidos: string[]) => Promise<void>
  onCancel: () => void
}

function EditBubble({ msg, signedUrls, onSave, onCancel }: EditBubbleProps) {
  const [texto, setTexto] = useState(msg.texto)
  const [existentes, setExistentes] = useState<string[]>(msg.arquivos)
  const [removidos, setRemovidos] = useState<string[]>([])
  const [novos, setNovos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = `${taRef.current.scrollHeight}px`
    }
  }, [texto])

  const removerExistente = (path: string) => {
    setExistentes((p) => p.filter((x) => x !== path))
    setRemovidos((p) => [...p, path])
    setInputKey((k) => k + 1)
  }

  const removerNovo = (idx: number) => {
    setNovos((p) => p.filter((_, i) => i !== idx))
    setInputKey((k) => k + 1)
  }

  const handleSave = async () => {
    if (!texto.trim() && existentes.length === 0 && novos.length === 0) return
    setSaving(true)
    try {
      await onSave(texto.trim(), existentes, novos, removidos)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex justify-end">
      <div
        className="w-[80%] max-w-[80%] rounded-2xl rounded-tr-none px-3.5 py-2.5 shadow-md space-y-2.5"
        style={{ background: WA_SENT }}
      >
        <textarea
          ref={taRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full bg-white/60 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#128C7E]/30"
          rows={2}
          autoFocus
        />

        {/* Arquivos existentes + novos */}
        {(existentes.length > 0 || novos.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {existentes.map((path) => (
              <ThumbExistente
                key={path}
                path={path}
                url={signedUrls[path] ?? ''}
                onRemove={() => removerExistente(path)}
              />
            ))}
            {novos.map((file, idx) => (
              <ThumbNovo
                key={idx}
                file={file}
                onRemove={() => removerNovo(idx)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-800 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" />
            Adicionar arquivo
          </button>
          <input
            key={inputKey}
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              setNovos((p) => [...p, ...Array.from(e.target.files ?? [])])
            }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-[12px] font-semibold transition-colors"
              style={{ color: WA_TEAL }}
            >
              <>
                <Check className="h-3.5 w-3.5" />
                Salvar
              </>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bubble normal com menu hover ──────────────────────────────────────────────
interface BubbleProps {
  msg: ThreadMsg
  signedUrls: Record<string, string>
  onEdit: () => void
  onDelete: () => void
  confirmingDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function Bubble({
  msg, signedUrls, onEdit, onDelete, confirmingDelete, onConfirmDelete, onCancelDelete,
}: BubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isMe = msg.role === 'eu'
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div className={cn('flex group', isMe ? 'justify-end' : 'justify-start')}>
      {/* Menu trigger à esquerda do bubble (apenas mensagens do usuário) */}
      {isMe && (
        <div ref={menuRef} className="relative flex items-end mb-1.5 mr-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center transition-all',
              'opacity-0 group-hover:opacity-100',
              menuOpen ? 'opacity-100 bg-black/15' : 'bg-black/10 hover:bg-black/15',
            )}
          >
            <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-8 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-20 min-w-[140px]">
              <button
                onClick={() => { onEdit(); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
                Editar
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm',
          isMe ? 'rounded-tr-none' : 'rounded-tl-none bg-white',
        )}
        style={isMe ? { background: WA_SENT } : undefined}
      >
        {!isMe && (
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: WA_TEAL }}>
            Suporte FIB
          </p>
        )}

        {/* Confirm delete inline */}
        {confirmingDelete ? (
          <div className="space-y-1.5">
            <p className="text-[12px] text-gray-600">Excluir esta mensagem?</p>
            <div className="flex gap-3">
              <button onClick={onCancelDelete} className="text-[12px] text-gray-500 hover:text-gray-700">
                Não
              </button>
              <button onClick={onConfirmDelete} className="text-[12px] font-semibold text-red-600 hover:text-red-700">
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.texto && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {msg.texto}
              </p>
            )}
            {msg.arquivos.map((path) => (
              <FileCard key={path} path={path} url={signedUrls[path] ?? ''} isMe={isMe} />
            ))}
            <p className="text-[10px] text-gray-400 text-right mt-0.5 select-none">
              {msgTime(msg.time)}
              {isMe && (
                <DoubleCheck
                  read={!!(sugestao?.admin_leu_em && new Date(sugestao.admin_leu_em) >= new Date(msg.time))}
                  size={15}
                  className="ml-1"
                />
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Preview de arquivo novo (input area) ─────────────────────────────────────
function LocalFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/')
  return (
    <div className="relative">
      <div className="h-12 w-12 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
        {isImg ? (
          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-0.5 p-1">
            <Paperclip className="h-4 w-4 text-gray-400" />
            <span className="text-[7px] text-gray-400 text-center leading-tight">
              {file.name.split('.').pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-500 text-white flex items-center justify-center"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  )
}

// ── ChatInputBar — ref local garante abertura do seletor de arquivo ───────────
function ChatInputBar({
  text, files, sending, onTextChange, onFilesAdd, onFileRemove, onSend,
}: {
  text: string; files: File[]; sending: boolean
  onTextChange: (v: string) => void
  onFilesAdd: (f: File[]) => void
  onFileRemove: (idx: number) => void
  onSend: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!text && taRef.current) taRef.current.style.height = 'auto'
  }, [text])

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
  }

  return (
    <div className="shrink-0 px-3 py-2" style={{ background: '#F0F2F5' }}>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, idx) => (
            <LocalFilePreview key={idx} file={file} onRemove={() => onFileRemove(idx)} />
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-gray-700 shadow-sm transition-colors"
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            onFilesAdd(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <textarea
          ref={taRef}
          value={text}
          onChange={autoResize}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder="Digite uma mensagem"
          rows={1}
          className="flex-1 rounded-3xl border-0 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none shadow-sm"
          style={{ minHeight: '40px', maxHeight: '128px' }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={(!text.trim() && files.length === 0) || sending}
          className={cn(
            'shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-all shadow-sm',
            (text.trim() || files.length > 0) && !sending
              ? 'text-white hover:scale-105'
              : 'bg-gray-300 text-gray-400 cursor-not-allowed',
          )}
          style={(text.trim() || files.length > 0) && !sending ? { background: '#25D366' } : undefined}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Sugestoes() {
  const { user, usuario } = useAuth()
  const { toast } = useToast()

  const [sugestao, setSugestao] = useState<Sugestao | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [adminOnline, setAdminOnline] = useState(false)

  // Presença: mostra "online" apenas quando algum admin está na aba suporte
  useEffect(() => {
    const ch = supabase.channel('fib-admin-presence')
    ch
      .on('presence', { event: 'sync' }, () => {
        setAdminOnline(Object.keys(ch.presenceState()).length > 0)
      })
      .on('presence', { event: 'join' }, () => setAdminOnline(true))
      .on('presence', { event: 'leave' }, () => {
        setAdminOnline(Object.keys(ch.presenceState()).length > 0)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Send state
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const newDividerRef = useRef<HTMLDivElement>(null)
  // dividerTime = timestamp de ANTES da última visita → posiciona o "N não lidas"
  const [dividerTime, setDividerTime] = useState<number>(0)

  // ── Captura lastRead e marca como lido antes do primeiro paint ──────────────
  useLayoutEffect(() => {
    if (!sugestao) return
    const prev = getClientLastRead(sugestao.id)
    setDividerTime(prev)
    setClientLastRead(sugestao.id)
  }, [sugestao?.id])

  // Marca leitura no Supabase para o admin ver os checks azuis
  useEffect(() => {
    if (!sugestao) return
    marcarClienteLeu(sugestao.id).catch(console.error)
  }, [sugestao?.id])

  // ── Carrega a conversa ──────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    try {
      const lista = await buscarSugestoes()
      setSugestao(lista.length > 0 ? lista[0] : null)
    } catch {
      toast({ title: 'Erro ao carregar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { carregar() }, [carregar])

  // ── Signed URLs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sugestao) return
    const paths = [
      ...sugestao.arquivos,
      ...sugestao.respostas.flatMap((r) => r.arquivos),
    ]
    if (paths.length === 0) return
    getSignedUrls(paths)
      .then((urls) => setSignedUrls((prev) => ({ ...prev, ...urls })))
      .catch(console.error)
  }, [sugestao])

  // ── Scroll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [sugestao?.id, sugestao?.respostas.length])

  // ── Enviar mensagem ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const texto = replyText.trim()
    if (!texto && replyFiles.length === 0) return
    if (!user) return
    setSending(true)
    try {
      const paths = replyFiles.length > 0
        ? await uploadArquivosSugestao(user.id, replyFiles)
        : []

      if (sugestao) {
        await responderSugestao(sugestao.id, texto, paths)
      } else {
        await criarSugestao(texto, paths, usuario?.restaurante_id ?? null)
      }

      setReplyText('')
      setReplyFiles([])
      await carregar()
    } catch {
      toast({ title: 'Erro ao enviar', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  // ── Salvar edição ───────────────────────────────────────────────────────────
  const handleSaveEdit = async (
    msg: ThreadMsg,
    texto: string,
    existentes: string[],
    novos: File[],
    removidos: string[],
  ) => {
    if (!user) return
    try {
      const novosPaths = novos.length > 0
        ? await uploadArquivosSugestao(user.id, novos)
        : []
      const finalArquivos = [...existentes, ...novosPaths]

      if (removidos.length > 0) {
        await excluirArquivosStorage(removidos)
      }

      if (msg.tipo === 'sugestao') {
        await editarSugestao(msg.id, texto, finalArquivos)
      } else {
        await editarResposta(msg.id, texto, finalArquivos)
      }

      setEditingId(null)
      await carregar()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  // ── Excluir mensagem ────────────────────────────────────────────────────────
  const handleConfirmDelete = async (msg: ThreadMsg) => {
    try {
      if (msg.arquivos.length > 0) {
        await excluirArquivosStorage(msg.arquivos)
      }
      if (msg.tipo === 'sugestao') {
        await excluirSugestao(msg.id)
      } else {
        await excluirResposta(msg.id)
      }
      setConfirmDeleteId(null)
      await carregar()
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  // ── Thread ──────────────────────────────────────────────────────────────────
  const thread = sugestao ? buildThread(sugestao) : []
  const newDividerIdx = (() => {
    if (dividerTime > 0) {
      // Mostra divider antes da primeira mensagem do suporte após a última visita
      for (let i = 0; i < thread.length; i++) {
        if (thread[i].role === 'suporte' && new Date(thread[i].time).getTime() > dividerTime) {
          return i
        }
      }
      return -1
    }
    // Primeira visita: divider após a última mensagem do usuário (eu)
    for (let i = thread.length - 1; i >= 0; i--) {
      if (thread[i].role === 'eu') return i + 1
    }
    return -1
  })()
  const newCount = newDividerIdx >= 0
    ? thread.slice(newDividerIdx).filter((m) => m.role === 'suporte').length
    : 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="-m-4 sm:-m-6 lg:-m-8 flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 64px)' }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: WA_TEAL }}
      >
        <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center text-white text-base font-bold shrink-0">
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white leading-tight">Suporte FIB</p>
          <p className="text-[12px] text-white/70 flex items-center gap-1.5">
            {!loading && adminOnline && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
            )}
            {loading ? '…' : adminOnline ? 'online' : 'offline'}
          </p>
        </div>
      </div>

      {/* Mensagens */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
        style={{ background: WA_BG }}
      >
        {/* Boas-vindas fixo */}
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm bg-white">
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: WA_TEAL }}>
              Suporte FIB
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              Olá! 👋 Estamos aqui para ajudar com qualquer dúvida ou sugestão sobre o FIB.
              Escreva sua mensagem abaixo.
            </p>
            <p className="text-[10px] text-gray-400 text-right mt-0.5 select-none">
              Suporte FIB
            </p>
          </div>
        </div>

        {!loading && thread.map((msg, i) => (
          <Fragment key={msg.id}>
            {i === newDividerIdx && newCount > 0 && (
              <div ref={newDividerRef} className="flex items-center gap-3 my-3">
                <div className="flex-1 h-[1.5px] rounded-full" style={{ background: '#128C7E', opacity: 0.5 }} />
                <span
                  className="shrink-0 text-[11px] font-semibold px-4 py-[5px] rounded-full whitespace-nowrap select-none"
                  style={{ background: '#128C7E', color: 'white' }}
                >
                  {newCount} mensagem{newCount !== 1 ? 's' : ''} não lida{newCount !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-[1.5px] rounded-full" style={{ background: '#128C7E', opacity: 0.5 }} />
              </div>
            )}
            {editingId === msg.id ? (
              <EditBubble
                msg={msg}
                signedUrls={signedUrls}
                onSave={(texto, existentes, novos, removidos) =>
                  handleSaveEdit(msg, texto, existentes, novos, removidos)
                }
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Bubble
                msg={msg}
                signedUrls={signedUrls}
                onEdit={() => { setConfirmDeleteId(null); setEditingId(msg.id) }}
                onDelete={() => { setEditingId(null); setConfirmDeleteId(msg.id) }}
                confirmingDelete={confirmDeleteId === msg.id}
                onConfirmDelete={() => handleConfirmDelete(msg)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            )}
          </Fragment>
        ))}

        <div ref={bottomRef} />
      </div>

      <ChatInputBar
        text={replyText}
        files={replyFiles}
        sending={sending}
        onTextChange={setReplyText}
        onFilesAdd={(f) => setReplyFiles((p) => [...p, ...f])}
        onFileRemove={(idx) => setReplyFiles((p) => p.filter((_, i) => i !== idx))}
        onSend={handleSend}
      />
    </div>
  )
}
