import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, ArrowLeft, Send, Paperclip, Plus, Pencil, Trash2,
  X, Video, FileText, FileSpreadsheet, Check, Play, MessageSquare, Tag, Users, ChevronDown,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePlatformAdmin } from '@/hooks/use-platform-admin'
import {
  buscarTodasSugestoes, responderSugestao, uploadArquivosResposta,
  editarRespostaAdmin, excluirRespostaAdmin, excluirArquivosAdmin,
  marcarAdminLeu,
  buscarDivisoes, criarDivisao, atualizarDivisao, excluirDivisao,
  buscarAfiliados, criarAfiliado, atualizarAfiliado, excluirAfiliado,
  buscarCupons, criarCupon, atualizarCupon, excluirCupon,
  type SugestaoAdmin, type DivisaoReceita, type Afiliado, type Cupon,
} from '@/lib/queries/admin'
import { getSignedUrls } from '@/lib/queries/sugestoes'
import { supabase } from '@/lib/supabase/client'
import { DoubleCheck } from '@/components/DoubleCheck'

// ── Palette ───────────────────────────────────────────────────────────────────
const WA_TEAL = '#128C7E'
const WA_SENT = '#DCF8C6'
const WA_BG = '#ECE5DD'
const WA_GREEN = '#25D366'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  aberta:     { label: 'Aberta',     cls: 'bg-gray-100 text-gray-600' },
  respondida: { label: 'Respondida', cls: 'bg-blue-100 text-blue-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-emerald-100 text-emerald-700' },
}

const AVATAR_COLORS = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500',
  'bg-rose-500','bg-indigo-500','bg-pink-500','bg-teal-500',
]

function avatarColor(str: string | null) {
  if (!str) return AVATAR_COLORS[0]
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function initials(nome: string | null, email: string | null) {
  const src = nome ?? email ?? '?'
  const parts = src.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src[0].toUpperCase()
}

function msgTime(date: string) {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'ontem'
  return format(d, 'dd/MM')
}

function getFileKind(path: string) {
  const p = path.toLowerCase()
  if (/\.(jpe?g|png|gif|webp|heic|avif)$/.test(p)) return 'image'
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(p)) return 'video'
  if (/\.pdf$/.test(p)) return 'pdf'
  if (/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv|odt|ods)$/.test(p)) return 'doc'
  return 'other'
}
function fileName(path: string) {
  const base = path.split('/').pop() ?? path
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

interface ThreadMsg { id: string; texto: string; role: 'usuario' | 'suporte'; arquivos: string[]; time: string }

function buildThread(s: SugestaoAdmin): ThreadMsg[] {
  return [
    { id: s.id + '-m', texto: s.texto, role: 'usuario', arquivos: s.arquivos, time: s.created_at },
    ...s.respostas.map((r) => ({
      id: r.id, texto: r.texto,
      role: (r.autor === 'usuario' ? 'usuario' : 'suporte') as 'usuario' | 'suporte',
      arquivos: r.arquivos, time: r.created_at,
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

function lastActivity(s: SugestaoAdmin): { preview: string; time: string; isAdmin: boolean; read: boolean } {
  if (s.respostas.length > 0) {
    const last = s.respostas[s.respostas.length - 1]
    const isAdminMsg = last.autor !== 'usuario'
    const read = isAdminMsg
      ? !!(s.cliente_leu_em && new Date(s.cliente_leu_em) >= new Date(last.created_at))
      : false
    return { preview: last.texto || '📎 Arquivo', time: last.created_at, isAdmin: isAdminMsg, read }
  }
  return { preview: s.texto || '📎 Arquivo', time: s.created_at, isAdmin: false, read: false }
}

function getAdminLastRead(id: string): number {
  return parseInt(localStorage.getItem(`fib_adm_${id}`) ?? '0', 10)
}
function setAdminLastRead(id: string): void {
  localStorage.setItem(`fib_adm_${id}`, String(Date.now()))
}
// Threshold do divisor no thread — atualizado quando o ConversaView desmonta
function getAdminDivTime(id: string): number {
  return parseInt(localStorage.getItem(`fib_adm_div_${id}`) ?? '0', 10)
}
function setAdminDivTime(id: string, t: number): void {
  localStorage.setItem(`fib_adm_div_${id}`, String(t))
}

function unreadCount(s: SugestaoAdmin): number {
  const lastRead = getAdminLastRead(s.id)
  if (lastRead > 0) {
    // Conta mensagens do usuário chegadas após a última vez que a conversa foi aberta
    let count = new Date(s.created_at).getTime() > lastRead ? 1 : 0
    count += s.respostas.filter(
      (r) => r.autor === 'usuario' && new Date(r.created_at).getTime() > lastRead,
    ).length
    return count
  }
  // Nunca aberta: heurística — mensagens do usuário após a última resposta do admin
  let lastAdminIdx = -1
  for (let i = s.respostas.length - 1; i >= 0; i--) {
    if (s.respostas[i].autor !== 'usuario') { lastAdminIdx = i; break }
  }
  if (lastAdminIdx === -1) {
    return 1 + s.respostas.filter((r) => r.autor === 'usuario').length
  }
  return s.respostas.slice(lastAdminIdx + 1).filter((r) => r.autor === 'usuario').length
}

function fmtDesconto(c: Cupon) {
  return c.tipo_desconto === 'porcentagem'
    ? `${c.valor_desconto}%`
    : `R$ ${Number(c.valor_desconto).toFixed(2)}`
}

// ── ConvItem ──────────────────────────────────────────────────────────────────
function ConvItem({ s, selected, onClick }: { s: SugestaoAdmin; selected: boolean; onClick: () => void }) {
  const { preview, time, isAdmin, read } = lastActivity(s)
  const count = unreadCount(s)
  const name = s.usuario_nome ?? s.usuario_email ?? s.usuario_id.slice(0, 8)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 last:border-0',
        selected ? 'bg-[#EFF6FF]' : 'hover:bg-gray-50',
      )}
    >
      <div className={cn('h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold', avatarColor(name))}>
        {initials(s.usuario_nome, s.usuario_email)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm font-semibold truncate', selected ? 'text-[#1D4ED8]' : 'text-gray-800')}>
            {name}
          </span>
          <span className="text-[11px] text-gray-400 shrink-0">{msgTime(time)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {isAdmin && <DoubleCheck read={read} size={18} />}
            <p className="text-[12px] text-gray-500 truncate">{preview}</p>
          </div>
          {count > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
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

// ── FilePreview ───────────────────────────────────────────────────────────────
function FilePreview({ path, url, isMe }: { path: string; url: string; isMe: boolean }) {
  const [open, setOpen] = useState(false)
  if (!url) return null
  const kind = getFileKind(path)
  const name = fileName(path)
  const Icon = kind === 'video' ? Video : kind === 'pdf' ? FileText : kind === 'doc' ? FileSpreadsheet : Paperclip

  if (kind === 'image') return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block mt-1.5 cursor-zoom-in">
        <img src={url} alt="" className="max-h-52 max-w-[220px] rounded-xl object-cover hover:opacity-90 transition-opacity" />
      </button>
      {open && <MediaModal url={url} kind="image" name={name} onClose={() => setOpen(false)} />}
    </>
  )

  if (kind === 'video') return (
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

  return (
    <button type="button" onClick={() => openInSystem(url, path)}
      className={cn('mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium hover:opacity-80 transition-opacity',
        isMe ? 'bg-[#b7e8a8] text-gray-700' : 'bg-gray-100 text-gray-600')}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[160px]">{name}</span>
    </button>
  )
}

// ── Miniaturas no modo edição ─────────────────────────────────────────────────
function ThumbExistente({ path, url, onRemove }: { path: string; url: string; onRemove: () => void }) {
  const kind = getFileKind(path)
  return (
    <div className="relative">
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
      <button onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
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
      <button onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── AdminEditBubble ───────────────────────────────────────────────────────────
function AdminEditBubble({ msg, signedUrls, onSave, onCancel }: {
  msg: ThreadMsg; signedUrls: Record<string, string>
  onSave: (texto: string, existentes: string[], novos: File[], removidos: string[]) => Promise<void>
  onCancel: () => void
}) {
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
    try { await onSave(texto.trim(), existentes, novos, removidos) } finally { setSaving(false) }
  }

  return (
    <div className="flex justify-end">
      <div className="w-[80%] max-w-[80%] rounded-2xl rounded-tr-none px-3.5 py-2.5 shadow-md space-y-2.5"
        style={{ background: WA_SENT }}>
        <textarea ref={taRef} value={texto} onChange={(e) => setTexto(e.target.value)}
          className="w-full bg-white/60 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#128C7E]/30"
          rows={2} autoFocus />
        {(existentes.length > 0 || novos.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {existentes.map((path) => (
              <ThumbExistente key={path} path={path} url={signedUrls[path] ?? ''} onRemove={() => removerExistente(path)} />
            ))}
            {novos.map((file, idx) => (
              <ThumbNovo key={idx} file={file} onRemove={() => removerNovo(idx)} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button type="button"
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-800 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" /> Adicionar arquivo
          </button>
          <input key={inputKey} ref={fileRef} type="file" multiple className="hidden"
            onChange={(e) => { setNovos((p) => [...p, ...Array.from(e.target.files ?? [])]) }} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 text-[12px] font-semibold transition-colors"
              style={{ color: WA_TEAL }}>
              <><Check className="h-3.5 w-3.5" /> Salvar</>

            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AdminBubble ───────────────────────────────────────────────────────────────
function AdminBubble({ msg, signedUrls, onEdit, onDelete, confirmingDelete, onConfirmDelete, onCancelDelete, clienteLeuEm }: {
  msg: ThreadMsg; signedUrls: Record<string, string>
  onEdit: () => void; onDelete: () => void
  confirmingDelete: boolean; onConfirmDelete: () => void; onCancelDelete: () => void
  clienteLeuEm: string | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isMe = msg.role === 'suporte'
  const msgRead = isMe
    ? !!(clienteLeuEm && new Date(clienteLeuEm) >= new Date(msg.time))
    : false
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div className={cn('flex group', isMe ? 'justify-end' : 'justify-start')}>
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
              <button onClick={() => { onEdit(); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50 transition-colors">
                <Pencil className="h-3.5 w-3.5 text-gray-500" /> Editar
              </button>
              <button onClick={() => { onDelete(); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          )}
        </div>
      )}
      <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm', isMe ? 'rounded-tr-none' : 'rounded-tl-none bg-white')}
        style={isMe ? { background: WA_SENT } : undefined}>
        {confirmingDelete ? (
          <div className="space-y-1.5">
            <p className="text-[12px] text-gray-600">Excluir esta mensagem?</p>
            <div className="flex gap-3">
              <button onClick={onCancelDelete} className="text-[12px] text-gray-500 hover:text-gray-700">Não</button>
              <button onClick={onConfirmDelete} className="text-[12px] font-semibold text-red-600 hover:text-red-700">Excluir</button>
            </div>
          </div>
        ) : (
          <>
            {msg.texto && <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.texto}</p>}
            {msg.arquivos.map((path) => (
              <FilePreview key={path} path={path} url={signedUrls[path] ?? ''} isMe={isMe} />
            ))}
            <p className="text-[10px] text-gray-400 text-right mt-0.5 select-none">
              {msgTime(msg.time)}{isMe && <DoubleCheck read={msgRead} size={15} className="ml-1" />}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── ConversaView ──────────────────────────────────────────────────────────────
function ConversaView({
  s, signedUrls, replyText, replyFiles, sending,
  onReplyTextChange, onReplyFilesChange, onRemoveFile, onSend, onRefresh, onRead,
}: {
  s: SugestaoAdmin; signedUrls: Record<string, string>
  replyText: string; replyFiles: File[]; sending: boolean
  onReplyTextChange: (v: string) => void; onReplyFilesChange: (f: File[]) => void
  onRemoveFile: (i: number) => void; onSend: () => void; onRefresh: () => void; onRead: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const newDividerRef = useRef<HTMLDivElement>(null)
  // Captura limiar UMA VEZ ao montar — nunca muda mesmo após envio de mensagens
  const [dividerThreshold] = useState<number>(() => {
    const stored = getAdminDivTime(s.id)
    if (stored > 0) return stored
    // Primeira visita: threshold = timestamp da última resposta do suporte
    const initialThread = buildThread(s)
    for (let i = initialThread.length - 1; i >= 0; i--) {
      if (initialThread[i].role === 'suporte') {
        return new Date(initialThread[i].time).getTime()
      }
    }
    return 0 // sem resposta do suporte: todas as msgs do usuário são não lidas
  })
  const thread = buildThread(s)
  const name = s.usuario_nome ?? s.usuario_email ?? s.usuario_id.slice(0, 8)
  // dividerThreshold fixo → posição do divisor estável mesmo após enviar mensagem
  const newDividerIdx = (() => {
    for (let i = 0; i < thread.length; i++) {
      if (thread[i].role === 'usuario' && new Date(thread[i].time).getTime() > dividerThreshold) {
        return i
      }
    }
    return -1
  })()
  const newCount = newDividerIdx >= 0
    ? thread.slice(newDividerIdx).filter((m) => m.role === 'usuario').length
    : 0

  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)

  // Ao desmontar: grava o tempo atual como novo threshold → próxima visita sem divisor
  useEffect(() => {
    return () => { setAdminDivTime(s.id, getAdminLastRead(s.id) || Date.now()) }
  }, [s.id])

  // Marca como lido somente quando o admin chega ao fim da conversa
  const onReadRef = useRef(onRead)
  useEffect(() => { onReadRef.current = onRead })
  useEffect(() => {
    const bottom = bottomRef.current
    const container = scrollContainerRef.current
    if (!bottom || !container) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAdminLastRead(s.id)
          marcarAdminLeu(s.id).catch(console.error)
          onReadRef.current()
        }
      },
      { root: container, threshold: 0.1 },
    )
    obs.observe(bottom)
    return () => obs.disconnect()
  }, [s.id])

  // Realtime: atualiza checks quando o cliente lê (cliente_leu_em muda)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh })
  useEffect(() => {
    const ch = supabase
      .channel(`leitura-${s.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sugestoes_plataforma', filter: `id=eq.${s.id}` },
        () => { onRefreshRef.current() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [s.id])

  // Scroll: ao montar vai à última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  // Scroll suave ao enviar/receber mensagem nova
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onReplyTextChange(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
  }

  async function handleSaveEdit(msg: ThreadMsg, texto: string, existentes: string[], novos: File[], removidos: string[]) {
    if (removidos.length > 0) await excluirArquivosAdmin(removidos)
    const novosPaths = novos.length > 0 ? await uploadArquivosResposta(s.id, novos) : []
    await editarRespostaAdmin(msg.id, texto, [...existentes, ...novosPaths])
    setEditingId(null)
    onRefresh()
  }

  async function handleDelete(msg: ThreadMsg) {
    try {
      if (msg.arquivos.length > 0) await excluirArquivosAdmin(msg.arquivos)
      await excluirRespostaAdmin(msg.id)
      setConfirmDelId(null)
      onRefresh()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ background: WA_TEAL }}>
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0', avatarColor(name))}>
          {initials(s.usuario_nome, s.usuario_email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{name}</p>
          {s.usuario_email && <p className="text-[12px] text-white/70 truncate">{s.usuario_email}</p>}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5" style={{ background: WA_BG }}>
        {thread.map((msg, i) => (
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
              <AdminEditBubble
                msg={msg}
                signedUrls={signedUrls}
                onSave={(texto, existentes, novos, removidos) => handleSaveEdit(msg, texto, existentes, novos, removidos)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <AdminBubble
                msg={msg}
                signedUrls={signedUrls}
                clienteLeuEm={s.cliente_leu_em}
                onEdit={() => { setEditingId(msg.id); setConfirmDelId(null) }}
                onDelete={() => { setConfirmDelId(msg.id); setEditingId(null) }}
                confirmingDelete={confirmDelId === msg.id}
                onConfirmDelete={() => handleDelete(msg)}
                onCancelDelete={() => setConfirmDelId(null)}
              />
            )}
          </Fragment>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-3 py-3" style={{ background: '#F0F2F5' }}>
        {replyFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {replyFiles.map((file, idx) => (
              <div key={idx} className="relative">
                <div className="h-12 w-12 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                  {file.type.startsWith('image/') ? (
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
                <button onClick={() => onRemoveFile(idx)}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-500 text-white flex items-center justify-center">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-gray-700 shadow-sm transition-colors"
            title="Anexar arquivo">
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => { onReplyFilesChange([...replyFiles, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
          <textarea ref={textareaRef} value={replyText} onChange={autoResize}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Digite uma mensagem"
            rows={1}
            className="flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none shadow-sm"
            style={{ minHeight: '40px', maxHeight: '128px' }} />
          <button onClick={onSend} disabled={(!replyText.trim() && replyFiles.length === 0) || sending}
            className={cn(
              'shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-all shadow-sm',
              (replyText.trim() || replyFiles.length > 0) && !sending ? 'text-white hover:scale-105' : 'bg-gray-300 text-gray-400 cursor-not-allowed',
            )}
            style={(replyText.trim() || replyFiles.length > 0) && !sending ? { background: WA_GREEN } : undefined}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CRUD Table genérica ───────────────────────────────────────────────────────
function CrudTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>
}
function BadgeBool({ v }: { v: boolean }) {
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', v ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
      {v ? 'Sim' : 'Não'}
    </span>
  )
}
function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} disabled={deleting}
        className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Admin ─────────────────────────────────────────────────────────────────────
type Tab = 'suporte' | 'pagamentos' | 'cupons' | 'afiliados'

const TAB_LABELS: Record<Tab, string> = {
  suporte: 'Suporte', pagamentos: 'Pagamentos', cupons: 'Cupons', afiliados: 'Afiliados',
}

// Form defaults
const EMPTY_DIVISAO = { nome: '', chave_pix: '', tipo: 'porcentagem' as const, valor: '', ativo: true }
const EMPTY_AFILIADO = { nome: '', email: '', codigo: '', comissao_tipo: 'porcentagem' as const, comissao_valor: '', ativo: true }
const EMPTY_CUPON = {
  codigo: '', descricao: '', tipo_desconto: 'porcentagem' as const,
  valor_desconto: '', validade: '', usos_maximos: '', ativo: true, afiliado_id: '',
}

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin, loading: loadingAdmin } = usePlatformAdmin()
  const [activeTab, setActiveTab] = useState<Tab>('suporte')

  // ── Suporte ──
  const [sugestoes, setSugestoes] = useState<SugestaoAdmin[]>([])
  const [loadingSugestoes, setLoadingSugestoes] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [replyFilesMap, setReplyFilesMap] = useState<Record<string, File[]>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)

  // ── Pagamentos ──
  const [divisoes, setDivisoes] = useState<DivisaoReceita[]>([])
  const [loadingDiv, setLoadingDiv] = useState(false)
  const [showDivDialog, setShowDivDialog] = useState(false)
  const [editingDivId, setEditingDivId] = useState<string | null>(null)
  const [divForm, setDivForm] = useState(EMPTY_DIVISAO)
  const [savingDiv, setSavingDiv] = useState(false)
  const [deletingDivId, setDeletingDivId] = useState<string | null>(null)

  // ── Afiliados ──
  const [afiliados, setAfiliados] = useState<Afiliado[]>([])
  const [loadingAfil, setLoadingAfil] = useState(false)
  const [showAfilDialog, setShowAfilDialog] = useState(false)
  const [editingAfilId, setEditingAfilId] = useState<string | null>(null)
  const [afilForm, setAfilForm] = useState(EMPTY_AFILIADO)
  const [savingAfil, setSavingAfil] = useState(false)
  const [deletingAfilId, setDeletingAfilId] = useState<string | null>(null)

  // ── Cupons ──
  const [cupons, setCupons] = useState<Cupon[]>([])
  const [loadingCupons, setLoadingCupons] = useState(false)
  const [showCuponDialog, setShowCuponDialog] = useState(false)
  const [editingCuponId, setEditingCuponId] = useState<string | null>(null)
  const [cuponForm, setCuponForm] = useState(EMPTY_CUPON)
  const [savingCupon, setSavingCupon] = useState(false)
  const [deletingCuponId, setDeletingCuponId] = useState<string | null>(null)

  useEffect(() => { if (!loadingAdmin && !isAdmin) navigate('/') }, [isAdmin, loadingAdmin, navigate])

  // Suporte: carrega uma vez
  useEffect(() => {
    if (!isAdmin) return
    buscarTodasSugestoes()
      .then((data) => { setSugestoes(data) })
      .catch(console.error)
      .finally(() => setLoadingSugestoes(false))
  }, [isAdmin])

  // Signed URLs
  useEffect(() => {
    if (!selectedId) return
    const s = sugestoes.find((x) => x.id === selectedId)
    if (!s) return
    const paths = [...s.arquivos, ...s.respostas.flatMap((r) => r.arquivos)]
    if (paths.length === 0) return
    getSignedUrls(paths).then((urls) => setSignedUrls((p) => ({ ...p, ...urls }))).catch(console.error)
  }, [selectedId, sugestoes])

  // Pagamentos: carrega ao entrar na aba
  const loadDivisoes = useCallback(async () => {
    setLoadingDiv(true)
    try { setDivisoes(await buscarDivisoes()) } finally { setLoadingDiv(false) }
  }, [])
  useEffect(() => { if (isAdmin && activeTab === 'pagamentos') loadDivisoes() }, [isAdmin, activeTab, loadDivisoes])

  // Afiliados: carrega ao entrar na aba (e ao entrar em Cupons — precisamos dos nomes)
  const loadAfiliados = useCallback(async () => {
    setLoadingAfil(true)
    try { setAfiliados(await buscarAfiliados()) } finally { setLoadingAfil(false) }
  }, [])
  useEffect(() => {
    if (isAdmin && (activeTab === 'afiliados' || activeTab === 'cupons')) loadAfiliados()
  }, [isAdmin, activeTab, loadAfiliados])

  // Cupons
  const loadCupons = useCallback(async () => {
    setLoadingCupons(true)
    try { setCupons(await buscarCupons()) } finally { setLoadingCupons(false) }
  }, [])
  useEffect(() => { if (isAdmin && activeTab === 'cupons') loadCupons() }, [isAdmin, activeTab, loadCupons])

  // ── Suporte handlers ──
  const [badgeVersion, setBadgeVersion] = useState(0)
  const refreshBadges = useCallback(() => setBadgeVersion((v) => v + 1), [])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleSend = async (sugestaoId: string) => {
    const texto = (replyTexts[sugestaoId] ?? '').trim()
    const files = replyFilesMap[sugestaoId] ?? []
    if (!texto && files.length === 0) return
    setSendingId(sugestaoId)
    try {
      const paths = files.length > 0 ? await uploadArquivosResposta(sugestaoId, files) : []
      await responderSugestao(sugestaoId, texto, paths)
      setAdminLastRead(sugestaoId)
      refreshBadges()
      setReplyTexts((p) => ({ ...p, [sugestaoId]: '' }))
      setReplyFilesMap((p) => ({ ...p, [sugestaoId]: [] }))
      setSugestoes(await buscarTodasSugestoes())
    } catch (err) { console.error(err) }
    finally { setSendingId(null) }
  }

  // Presença: fica "online" para clientes somente quando admin está na aba suporte
  useEffect(() => {
    if (!isAdmin || activeTab !== 'suporte') return
    const ch = supabase.channel('fib-admin-presence')
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ online: true })
    })
    return () => { ch.untrack().finally(() => supabase.removeChannel(ch)) }
  }, [isAdmin, activeTab])

  // Total não lidas → localStorage + evento para badge no TopHeader
  useEffect(() => {
    void badgeVersion // força reexecução quando reads são marcados
    const total = sugestoes.reduce((sum, s) => sum + unreadCount(s), 0)
    localStorage.setItem('fib_adm_total', String(total))
    window.dispatchEvent(new CustomEvent('fib-unread-update', { detail: { count: total } }))
  }, [sugestoes, badgeVersion])

  // ── Divisão handlers ──
  const openAddDiv = () => { setEditingDivId(null); setDivForm(EMPTY_DIVISAO); setShowDivDialog(true) }
  const openEditDiv = (d: DivisaoReceita) => {
    setEditingDivId(d.id)
    setDivForm({ nome: d.nome, chave_pix: d.chave_pix ?? '', tipo: d.tipo, valor: String(d.valor), ativo: d.ativo })
    setShowDivDialog(true)
  }
  const saveDiv = async () => {
    if (!divForm.nome || !divForm.valor) return
    setSavingDiv(true)
    try {
      const p = { nome: divForm.nome, chave_pix: divForm.chave_pix || null, tipo: divForm.tipo, valor: Number(divForm.valor), ativo: divForm.ativo }
      if (editingDivId) await atualizarDivisao(editingDivId, p); else await criarDivisao(p)
      setDivisoes(await buscarDivisoes()); setShowDivDialog(false)
    } catch (err) { console.error(err) } finally { setSavingDiv(false) }
  }
  const deleteDiv = async (id: string) => {
    setDeletingDivId(id)
    try { await excluirDivisao(id); setDivisoes((p) => p.filter((d) => d.id !== id)) }
    catch (err) { console.error(err) } finally { setDeletingDivId(null) }
  }

  // ── Afiliado handlers ──
  const openAddAfil = () => { setEditingAfilId(null); setAfilForm(EMPTY_AFILIADO); setShowAfilDialog(true) }
  const openEditAfil = (a: Afiliado) => {
    setEditingAfilId(a.id)
    setAfilForm({ nome: a.nome, email: a.email ?? '', codigo: a.codigo, comissao_tipo: a.comissao_tipo, comissao_valor: String(a.comissao_valor), ativo: a.ativo })
    setShowAfilDialog(true)
  }
  const saveAfil = async () => {
    if (!afilForm.nome || !afilForm.codigo) return
    setSavingAfil(true)
    try {
      const p = { nome: afilForm.nome, email: afilForm.email || null, codigo: afilForm.codigo.toUpperCase(), comissao_tipo: afilForm.comissao_tipo, comissao_valor: Number(afilForm.comissao_valor) || 0, ativo: afilForm.ativo }
      if (editingAfilId) await atualizarAfiliado(editingAfilId, p); else await criarAfiliado(p)
      setAfiliados(await buscarAfiliados()); setShowAfilDialog(false)
    } catch (err) { console.error(err) } finally { setSavingAfil(false) }
  }
  const deleteAfil = async (id: string) => {
    setDeletingAfilId(id)
    try { await excluirAfiliado(id); setAfiliados((p) => p.filter((a) => a.id !== id)) }
    catch (err) { console.error(err) } finally { setDeletingAfilId(null) }
  }

  // ── Cupon handlers ──
  const openAddCupon = () => { setEditingCuponId(null); setCuponForm(EMPTY_CUPON); setShowCuponDialog(true) }
  const openEditCupon = (c: Cupon) => {
    setEditingCuponId(c.id)
    setCuponForm({
      codigo: c.codigo, descricao: c.descricao ?? '', tipo_desconto: c.tipo_desconto,
      valor_desconto: String(c.valor_desconto), validade: c.validade ?? '',
      usos_maximos: c.usos_maximos != null ? String(c.usos_maximos) : '',
      ativo: c.ativo, afiliado_id: c.afiliado_id ?? '',
    })
    setShowCuponDialog(true)
  }
  const saveCupon = async () => {
    if (!cuponForm.codigo || !cuponForm.valor_desconto) return
    setSavingCupon(true)
    try {
      const p = {
        codigo: cuponForm.codigo.toUpperCase(),
        descricao: cuponForm.descricao || null,
        tipo_desconto: cuponForm.tipo_desconto,
        valor_desconto: Number(cuponForm.valor_desconto),
        validade: cuponForm.validade || null,
        usos_maximos: cuponForm.usos_maximos ? Number(cuponForm.usos_maximos) : null,
        ativo: cuponForm.ativo,
        afiliado_id: cuponForm.afiliado_id || null,
      }
      if (editingCuponId) await atualizarCupon(editingCuponId, p); else await criarCupon(p)
      setCupons(await buscarCupons()); setShowCuponDialog(false)
    } catch (err) { console.error(err) } finally { setSavingCupon(false) }
  }
  const deleteCupon = async (id: string) => {
    setDeletingCuponId(id)
    try { await excluirCupon(id); setCupons((p) => p.filter((c) => c.id !== id)) }
    catch (err) { console.error(err) } finally { setDeletingCuponId(null) }
  }

  const totalPct = divisoes.filter((d) => d.ativo && d.tipo === 'porcentagem').reduce((a, d) => a + d.valor, 0)
  const selectedConv = sugestoes.find((s) => s.id === selectedId) ?? null

  if (loadingAdmin || !isAdmin) return null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-gray-800 text-[15px]">Painel Admin</span>
          </div>
        </div>
        <div className="flex px-4 overflow-x-auto">
          {(['suporte', 'pagamentos', 'cupons', 'afiliados'] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── SUPORTE ── */}
        {activeTab === 'suporte' && (
          <>
            <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-3" style={{ background: WA_TEAL }}>
                <p className="text-[15px] font-semibold text-white">Suporte</p>
              </div>
              {loadingSugestoes ? (
                <p className="text-center py-8 text-sm text-gray-400">Carregando…</p>
              ) : sugestoes.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">Nenhuma mensagem.</p>
              ) : (
                <div className="overflow-y-auto flex-1">
                  {sugestoes.map((s) => (
                    <ConvItem key={s.id} s={s} selected={selectedId === s.id} onClick={() => handleSelect(s.id)} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedConv ? (
                <ConversaView
                  key={selectedId}
                  s={selectedConv} signedUrls={signedUrls}
                  replyText={replyTexts[selectedId!] ?? ''} replyFiles={replyFilesMap[selectedId!] ?? []}
                  sending={sendingId === selectedId}
                  onReplyTextChange={(v) => setReplyTexts((p) => ({ ...p, [selectedId!]: v }))}
                  onReplyFilesChange={(files) => setReplyFilesMap((p) => ({ ...p, [selectedId!]: files }))}
                  onRemoveFile={(idx) => setReplyFilesMap((p) => ({ ...p, [selectedId!]: (p[selectedId!] ?? []).filter((_, i) => i !== idx) }))}
                  onSend={() => handleSend(selectedId!)}
                  onRefresh={() => buscarTodasSugestoes().then(setSugestoes).catch(console.error)}
                  onRead={refreshBadges}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: WA_BG }}>
                  <MessageSquare className="h-10 w-10 opacity-20" style={{ color: WA_TEAL }} />
                  <p className="text-[13px] text-gray-500 opacity-60">Selecione uma conversa para começar</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── PAGAMENTOS ── */}
        {activeTab === 'pagamentos' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Divisão de Receita</h2>
                  {divisoes.some((d) => d.ativo && d.tipo === 'porcentagem') && (
                    <p className={cn('text-[12px] mt-0.5', Math.abs(totalPct - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-600')}>
                      Total %: {totalPct}%{Math.abs(totalPct - 100) >= 0.01 && ' — deve somar 100%'}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={openAddDiv}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
              {loadingDiv ? (
                <p className="text-center py-12 text-sm text-gray-400">Carregando…</p>
              ) : divisoes.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">Nenhuma configuração.</p>
              ) : (
                <CrudTable>
                  <thead><tr>{['Nome','Chave PIX','Tipo','Valor','Ativo',''].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                  <tbody>
                    {divisoes.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <Td className="font-medium text-gray-800">{d.nome}</Td>
                        <Td className="text-gray-500 text-[13px]">{d.chave_pix ?? '—'}</Td>
                        <Td className="text-gray-500 text-[13px]">{d.tipo === 'porcentagem' ? 'Porcentagem' : 'Valor fixo'}</Td>
                        <Td className="font-semibold text-gray-700">{d.tipo === 'porcentagem' ? `${d.valor}%` : `R$ ${d.valor.toFixed(2)}`}</Td>
                        <Td><BadgeBool v={d.ativo} /></Td>
                        <Td><RowActions onEdit={() => openEditDiv(d)} onDelete={() => deleteDiv(d.id)} deleting={deletingDivId === d.id} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </CrudTable>
              )}
            </div>
          </div>
        )}

        {/* ── CUPONS ── */}
        {activeTab === 'cupons' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-800">Cupons de Desconto</h2>
                </div>
                <Button size="sm" onClick={openAddCupon}><Plus className="h-4 w-4 mr-1" /> Novo cupom</Button>
              </div>
              {loadingCupons ? (
                <p className="text-center py-12 text-sm text-gray-400">Carregando…</p>
              ) : cupons.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum cupom criado ainda.</p>
                </div>
              ) : (
                <CrudTable>
                  <thead>
                    <tr>{['Código','Desconto','Validade','Usos','Afiliado','Ativo',''].map((h) => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {cupons.map((c) => {
                      const vencido = c.validade && new Date(c.validade) < new Date()
                      return (
                        <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <Td>
                            <span className="font-mono font-semibold text-[13px] bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                              {c.codigo}
                            </span>
                          </Td>
                          <Td className="font-semibold text-emerald-700">{fmtDesconto(c)}</Td>
                          <Td>
                            {c.validade ? (
                              <span className={cn('text-[13px]', vencido ? 'text-red-500' : 'text-gray-600')}>
                                {format(new Date(c.validade + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                {vencido && ' (vencido)'}
                              </span>
                            ) : <span className="text-gray-400 text-[13px]">Sem limite</span>}
                          </Td>
                          <Td className="text-[13px] text-gray-600">
                            {c.usos_atuais}{c.usos_maximos != null ? `/${c.usos_maximos}` : ''}
                          </Td>
                          <Td className="text-[13px] text-gray-500">{c.afiliado_nome ?? '—'}</Td>
                          <Td><BadgeBool v={c.ativo} /></Td>
                          <Td><RowActions onEdit={() => openEditCupon(c)} onDelete={() => deleteCupon(c.id)} deleting={deletingCuponId === c.id} /></Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </CrudTable>
              )}
            </div>
          </div>
        )}

        {/* ── AFILIADOS ── */}
        {activeTab === 'afiliados' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-800">Afiliados</h2>
                </div>
                <Button size="sm" onClick={openAddAfil}><Plus className="h-4 w-4 mr-1" /> Novo afiliado</Button>
              </div>
              {loadingAfil ? (
                <p className="text-center py-12 text-sm text-gray-400">Carregando…</p>
              ) : afiliados.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum afiliado cadastrado.</p>
                </div>
              ) : (
                <CrudTable>
                  <thead>
                    <tr>{['Nome','Email','Código','Comissão','Ativo',''].map((h) => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {afiliados.map((a) => (
                      <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <Td className="font-medium text-gray-800">{a.nome}</Td>
                        <Td className="text-gray-500 text-[13px]">{a.email ?? '—'}</Td>
                        <Td>
                          <span className="font-mono text-[13px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-semibold">
                            {a.codigo}
                          </span>
                        </Td>
                        <Td className="font-semibold text-gray-700">
                          {a.comissao_tipo === 'porcentagem' ? `${a.comissao_valor}%` : `R$ ${Number(a.comissao_valor).toFixed(2)}`}
                        </Td>
                        <Td><BadgeBool v={a.ativo} /></Td>
                        <Td><RowActions onEdit={() => openEditAfil(a)} onDelete={() => deleteAfil(a.id)} deleting={deletingAfilId === a.id} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </CrudTable>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog: Divisão ── */}
      <Dialog open={showDivDialog} onOpenChange={setShowDivDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-xl">
          <DialogHeader><DialogTitle>{editingDivId ? 'Editar entrada' : 'Adicionar entrada'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label className="text-[13px]">Nome</Label>
              <Input value={divForm.nome} onChange={(e) => setDivForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Raver" className="mt-1" />
            </div>
            <div>
              <Label className="text-[13px]">Chave PIX</Label>
              <Input value={divForm.chave_pix} onChange={(e) => setDivForm((p) => ({ ...p, chave_pix: e.target.value }))} placeholder="CPF, e-mail, telefone…" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Tipo</Label>
                <Select value={divForm.tipo} onValueChange={(v) => setDivForm((p) => ({ ...p, tipo: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">Valor</Label>
                <Input type="number" value={divForm.valor} onChange={(e) => setDivForm((p) => ({ ...p, valor: e.target.value }))} placeholder={divForm.tipo === 'porcentagem' ? '70' : '200'} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="div-ativo" checked={divForm.ativo} onChange={(e) => setDivForm((p) => ({ ...p, ativo: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
              <Label htmlFor="div-ativo" className="text-[13px] cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDivDialog(false)}>Cancelar</Button>
            <Button onClick={saveDiv} disabled={savingDiv || !divForm.nome || !divForm.valor}>{savingDiv ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Afiliado ── */}
      <Dialog open={showAfilDialog} onOpenChange={setShowAfilDialog}>
        <DialogContent className="sm:max-w-[420px] rounded-xl">
          <DialogHeader><DialogTitle>{editingAfilId ? 'Editar afiliado' : 'Novo afiliado'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Nome *</Label>
                <Input value={afilForm.nome} onChange={(e) => setAfilForm((p) => ({ ...p, nome: e.target.value }))} placeholder="João Silva" className="mt-1" />
              </div>
              <div>
                <Label className="text-[13px]">E-mail</Label>
                <Input type="email" value={afilForm.email} onChange={(e) => setAfilForm((p) => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-[13px]">Código único *</Label>
              <Input value={afilForm.codigo} onChange={(e) => setAfilForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="JOAO10" className="mt-1 font-mono" />
              <p className="text-[11px] text-gray-400 mt-1">Será convertido para maiúsculas automaticamente.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Tipo comissão</Label>
                <Select value={afilForm.comissao_tipo} onValueChange={(v) => setAfilForm((p) => ({ ...p, comissao_tipo: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">Valor comissão</Label>
                <Input type="number" value={afilForm.comissao_valor} onChange={(e) => setAfilForm((p) => ({ ...p, comissao_valor: e.target.value }))} placeholder={afilForm.comissao_tipo === 'porcentagem' ? '10' : '50'} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="afil-ativo" checked={afilForm.ativo} onChange={(e) => setAfilForm((p) => ({ ...p, ativo: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
              <Label htmlFor="afil-ativo" className="text-[13px] cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAfilDialog(false)}>Cancelar</Button>
            <Button onClick={saveAfil} disabled={savingAfil || !afilForm.nome || !afilForm.codigo}>{savingAfil ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Cupom ── */}
      <Dialog open={showCuponDialog} onOpenChange={setShowCuponDialog}>
        <DialogContent className="sm:max-w-[480px] rounded-xl">
          <DialogHeader><DialogTitle>{editingCuponId ? 'Editar cupom' : 'Novo cupom'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Código *</Label>
                <Input value={cuponForm.codigo} onChange={(e) => setCuponForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="DESC20" className="mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-[13px]">Descrição</Label>
                <Input value={cuponForm.descricao} onChange={(e) => setCuponForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="20% de desconto" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Tipo desconto</Label>
                <Select value={cuponForm.tipo_desconto} onValueChange={(v) => setCuponForm((p) => ({ ...p, tipo_desconto: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">Valor *</Label>
                <Input type="number" value={cuponForm.valor_desconto} onChange={(e) => setCuponForm((p) => ({ ...p, valor_desconto: e.target.value }))} placeholder={cuponForm.tipo_desconto === 'porcentagem' ? '20' : '50'} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[13px]">Data de validade</Label>
                <Input type="date" value={cuponForm.validade} onChange={(e) => setCuponForm((p) => ({ ...p, validade: e.target.value }))} className="mt-1" />
                <p className="text-[11px] text-gray-400 mt-1">Vazio = sem expiração</p>
              </div>
              <div>
                <Label className="text-[13px]">Usos máximos</Label>
                <Input type="number" value={cuponForm.usos_maximos} onChange={(e) => setCuponForm((p) => ({ ...p, usos_maximos: e.target.value }))} placeholder="100" className="mt-1" />
                <p className="text-[11px] text-gray-400 mt-1">Vazio = ilimitado</p>
              </div>
            </div>
            <div>
              <Label className="text-[13px]">Afiliado (opcional)</Label>
              <Select value={cuponForm.afiliado_id} onValueChange={(v) => setCuponForm((p) => ({ ...p, afiliado_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {afiliados.filter((a) => a.ativo).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome} ({a.codigo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cupon-ativo" checked={cuponForm.ativo} onChange={(e) => setCuponForm((p) => ({ ...p, ativo: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
              <Label htmlFor="cupon-ativo" className="text-[13px] cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCuponDialog(false)}>Cancelar</Button>
            <Button onClick={saveCupon} disabled={savingCupon || !cuponForm.codigo || !cuponForm.valor_desconto}>{savingCupon ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
