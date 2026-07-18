import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { jsPDF } from 'jspdf'
import { QrCode, Download, Loader2, ChevronDown, FileImage, FileText, ExternalLink, ImagePlus, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QR_TEMAS, QR_FILTROS, getTema, getFiltro } from '@/lib/qr-temas'
import { landingUrl, desenharPoster, baixarBlob, canvasToBlob, POSTER_W, POSTER_H } from '@/lib/qr-poster'
import { LandingView } from '@/components/LandingView'
import { ImageCropper } from '@/components/ImageCropper'
import { toast } from 'sonner'

interface QrData {
  id: number
  slug: string
  total_scans: number
  papel_fundo: string
  url_redirect: string
}

const SLUG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function gerarSlug(n = 8) {
  let s = ''
  for (let i = 0; i < n; i++) s += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)]
  return s
}

// Redimensiona a imagem enviada para o formato de celular (retrato 9:16), preenchendo a tela.
export default function QRCodes() {
  const [qrData, setQrData] = useState<QrData | null>(null)
  const [restaurantName, setRestaurantName] = useState('Restaurante')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Config da página que o cliente abre ao escanear
  const [restauranteId, setRestauranteId] = useState<number | null>(null)
  const [cfgModo, setCfgModo] = useState<'estilo' | 'upload'>('estilo')
  const [cfgEstilo, setCfgEstilo] = useState('classico')
  const [cfgFiltro, setCfgFiltro] = useState('nenhum')
  const [cfgImagem, setCfgImagem] = useState<string | null>(null)
  const [cfgMensagem, setCfgMensagem] = useState('')
  const [savingCfg, setSavingCfg] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)

  // Métricas
  const [metricas, setMetricas] = useState<{ dia7: number; dia30: number; barras: { label: string; n: number }[] }>({ dia7: 0, dia30: 0, barras: [] })
  const [aba, setAba] = useState('config')
  const [previewAba, setPreviewAba] = useState<'pagina' | 'qr'>('pagina')
  const [numero, setNumero] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [passo, setPasso] = useState<1 | 2>(1)
  const cfgSalvoRef = useRef({ modo: 'estilo', estilo: 'classico', filtro: 'nenhum', imagem: null as string | null, mensagem: '' })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (qrData) {
      drawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrData, restaurantName, cfgEstilo, cfgMensagem, cfgFiltro])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      let restauranteId: number | null = null
      if (userData?.user) {
        const { data: config } = await supabase
          .from('restaurantes')
          .select('id, nome_restaurante, numero_whatsapp, qr_bg_modo, qr_estilo, qr_filtro, qr_bg_imagem, qr_mensagem')
          .eq('auth_user_id', userData.user.id)
          .single()

        restauranteId = config?.id ?? null
        setRestauranteId(config?.id ?? null)
        if (config?.nome_restaurante) setRestaurantName(config.nome_restaurante)
        setNumero(config?.numero_whatsapp ?? null)
        const modo = config?.qr_bg_modo === 'upload' ? 'upload' : 'estilo'
        setCfgModo(modo)
        setCfgEstilo(config?.qr_estilo ?? 'classico')
        setCfgFiltro(config?.qr_filtro ?? 'nenhum')
        setCfgImagem(config?.qr_bg_imagem ?? null)
        setCfgMensagem(config?.qr_mensagem ?? '')
        cfgSalvoRef.current = {
          modo, estilo: config?.qr_estilo ?? 'classico', filtro: config?.qr_filtro ?? 'nenhum',
          imagem: config?.qr_bg_imagem ?? null, mensagem: config?.qr_mensagem ?? '',
        }
        // Nunca configurou → já abre no modo edição (passo 1)
        const jaConfigurou = !!(config?.qr_bg_modo || config?.qr_estilo || config?.qr_mensagem || config?.qr_bg_imagem)
        setEditando(!jaConfigurou)
        if (!jaConfigurou) { setPasso(1); setPreviewAba('qr') }
      }

      // Sem restaurante vinculado: não há QR Code a gerar — encerra sem erro
      if (!restauranteId) {
        setLoading(false)
        return
      }

      // Busca o QR do restaurante (garcom_id null). Se não existir, cria (RLS permite o dono).
      const { data: existente } = await supabase
        .from('qr_codes')
        .select('id, slug, total_scans, papel_fundo')
        .eq('restaurante_id', restauranteId)
        .is('garcom_id', null)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let qr = existente
      if (!qr) {
        const { data: novo, error } = await supabase
          .from('qr_codes')
          .insert({ restaurante_id: restauranteId, slug: gerarSlug(), papel_fundo: 'padrao', ativo: true, total_scans: 0 })
          .select('id, slug, total_scans, papel_fundo')
          .single()
        if (error) throw error
        qr = novo
      }
      setQrData({ id: qr.id, slug: qr.slug, total_scans: qr.total_scans ?? 0, papel_fundo: qr.papel_fundo ?? 'padrao', url_redirect: '' })
      loadMetrics(qr.id)
    } catch (err: any) {
      toast.error('Erro ao carregar', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async (qrId: number) => {
    const desde30 = new Date(Date.now() - 30 * 86400000)
    const { data } = await supabase
      .from('qr_scans')
      .select('scanned_at')
      .eq('qr_code_id', qrId)
      .gte('scanned_at', desde30.toISOString())
    const scans = (data ?? []).map((s: any) => new Date(s.scanned_at).getTime())
    const agora = Date.now()
    const dia7 = scans.filter((t) => t >= agora - 7 * 86400000).length
    const dia30 = scans.length
    // Barras dos últimos 7 dias
    const barras: { label: string; n: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - i)
      const fim = ini.getTime() + 86400000
      const n = scans.filter((t) => t >= ini.getTime() && t < fim).length
      barras.push({ label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][ini.getDay()], n })
    }
    setMetricas({ dia7, dia30, barras })
  }

  const handleUpdateBackground = async (papel: string) => {
    if (!qrData || qrData.papel_fundo === papel) return
    try {
      setSaving(true)
      const { error } = await supabase.from('qr_codes').update({ papel_fundo: papel }).eq('id', qrData.id)
      if (error) throw error
      setQrData({ ...qrData, papel_fundo: papel })
      toast.success('Estilo atualizado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao atualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!restauranteId) return
    try {
      setSaving(true)
      // Desativa o QR atual e cria um novo (invalida o antigo)
      if (qrData) await supabase.from('qr_codes').update({ ativo: false }).eq('id', qrData.id)
      const { data: novo, error } = await supabase
        .from('qr_codes')
        .insert({ restaurante_id: restauranteId, slug: gerarSlug(), papel_fundo: qrData?.papel_fundo || 'padrao', ativo: true, total_scans: 0 })
        .select('id, slug, total_scans, papel_fundo')
        .single()
      if (error) throw error
      setQrData({ id: novo.id, slug: novo.slug, total_scans: 0, papel_fundo: novo.papel_fundo ?? 'padrao', url_redirect: '' })
      toast.success('Novo QR Code gerado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao gerar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const salvarCfg = async () => {
    if (!restauranteId) return
    setSavingCfg(true)
    try {
      const { error } = await supabase
        .from('restaurantes')
        .update({
          qr_bg_modo: cfgModo,
          qr_estilo: cfgEstilo,
          qr_filtro: cfgFiltro,
          qr_bg_imagem: cfgImagem,
          qr_mensagem: cfgMensagem.trim() || null,
        })
        .eq('id', restauranteId)
      if (error) throw error
      cfgSalvoRef.current = { modo: cfgModo, estilo: cfgEstilo, filtro: cfgFiltro, imagem: cfgImagem, mensagem: cfgMensagem }
      setEditando(false)
      toast.success('QR Code e página salvos!')
    } catch (err: any) {
      toast.error('Erro ao salvar', { description: err.message })
    } finally {
      setSavingCfg(false)
    }
  }

  const cancelarEdicao = () => {
    const s = cfgSalvoRef.current
    setCfgModo(s.modo as 'estilo' | 'upload')
    setCfgEstilo(s.estilo)
    setCfgFiltro(s.filtro)
    setCfgImagem(s.imagem)
    setCfgMensagem(s.mensagem)
    setEditando(false)
  }

  // Recebe o blob já recortado no formato do celular (1080×1920) pelo ImageCropper
  const enviarImagem = async (blob: Blob) => {
    if (!restauranteId) return
    setUploading(true)
    try {
      const path = `${restauranteId}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('qr-fundos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('qr-fundos').getPublicUrl(path)
      setCfgImagem(data.publicUrl)
      setCfgModo('upload')
      await supabase
        .from('restaurantes')
        .update({ qr_bg_imagem: data.publicUrl, qr_bg_modo: 'upload' })
        .eq('id', restauranteId)
      setCropFile(null)
      toast.success('Imagem de fundo enviada!')
    } catch (err: any) {
      toast.error('Erro no upload', { description: err.message })
    } finally {
      setUploading(false)
    }
  }

  const drawCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas || !qrData) return
    await desenharPoster(canvas, {
      url: landingUrl(qrData.slug),
      nome: restaurantName,
      tagline: cfgMensagem,
      temaId: cfgEstilo,
      filtroId: cfgFiltro,
    })
  }

  const downloadPNG = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await canvasToBlob(canvas)
      baixarBlob(blob, `qrcode-${restaurantName.replace(/\s+/g, '-').toLowerCase()}.png`)
    } catch {
      toast.error('Erro ao baixar PNG')
    }
  }

  const downloadPDF = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const w = 170
      const h = w * (POSTER_H / POSTER_W)
      const x = (pw - w) / 2
      const y = (ph - h) / 2
      pdf.addImage(canvas, 'PNG', x, y, w, h)
      baixarBlob(pdf.output('blob'), `qrcode-${restaurantName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
      toast.success('PDF baixado com sucesso!')
    } catch (err) {
      toast.error('Erro ao gerar PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!qrData) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-xl border border-dashed border-border/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 mb-5">
            <QrCode className="h-8 w-8 text-[#1D4ED8]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">QR Code ainda não disponível</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Conclua a configuração do seu restaurante para gerar o QR Code de coleta de feedbacks.
          </p>
        </div>
      </div>
    )
  }

  const maxBar = Math.max(1, ...metricas.barras.map((b) => b.n))
  // Qual preview mostrar: no wizard segue o passo; no modo pronto segue o seletor
  const mostraQr = editando ? passo === 1 : previewAba === 'qr'

  return (
    <div className="flex-1">
      <Tabs value={aba} onValueChange={setAba} className="w-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>
          {aba === 'config' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Download className="h-4 w-4" /> Baixar <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={downloadPNG} className="gap-2 cursor-pointer">
                  <FileImage className="h-4 w-4" /> PNG (imagem)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" /> PDF (impressão)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── INFORMAÇÕES ── */}
        <TabsContent value="info" className="mt-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Aberturas totais', valor: qrData.total_scans },
              { label: 'Últimos 7 dias', valor: metricas.dia7 },
              { label: 'Últimos 30 dias', valor: metricas.dia30 },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <QrCode className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{m.valor}</p>
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aberturas nos últimos 7 dias</CardTitle>
              <CardDescription>Cada abertura ≈ um cliente indo dar feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3 h-40">
                {metricas.barras.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                    <span className="text-xs font-semibold text-muted-foreground">{b.n || ''}</span>
                    <div
                      className="w-full rounded-t-md bg-blue-500/80 transition-all"
                      style={{ height: `${(b.n / maxBar) * 100}%`, minHeight: b.n > 0 ? 6 : 2 }}
                    />
                    <span className="text-[11px] text-muted-foreground">{b.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONFIGURAÇÕES ── */}
        <TabsContent value="config" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {editando ? (
            <Card>
              <CardHeader>
                <CardTitle>{passo === 1 ? 'Passo 1 de 2 · QR impresso' : 'Passo 2 de 2 · Página do cliente'}</CardTitle>
                <CardDescription>
                  {passo === 1 ? 'Escolha a arte do QR que vai ser impresso' : 'Como fica a página que abre ao escanear'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {passo === 1 ? (
                  /* ── PASSO 1: QR impresso ── */
                  <>
                    <div>
                      <p className="text-[13px] font-medium mb-2">Modelo</p>
                      <div className="grid grid-cols-3 gap-2">
                        {QR_TEMAS.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setCfgEstilo(t.id)}
                            className={cn('h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all overflow-hidden',
                              cfgEstilo === t.id ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}
                            style={{ background: t.bg, color: t.texto }}
                          >
                            <span className="text-lg leading-none">{t.emojis[0]}</span>
                            {t.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium mb-2">Filtro</p>
                      <div className="flex flex-wrap gap-2">
                        {QR_FILTROS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setCfgFiltro(f.id)}
                            className={cn('rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all',
                              cfgFiltro === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:bg-muted')}
                          >
                            {f.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button variant="ghost" onClick={cancelarEdicao} className="text-muted-foreground">Cancelar</Button>
                      <Button onClick={() => { setPasso(2); setPreviewAba('pagina') }} size="lg" className="gap-1.5 px-7 rounded-full shadow-md">
                        Próximo <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ── PASSO 2: Página do cliente ── */
                  <>
                    <div>
                      <p className="text-[13px] font-medium mb-2">Como a página vai aparecer?</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => { setCfgModo('estilo'); setPreviewAba('pagina') }}
                          className={cn('rounded-lg border-2 p-3 text-left transition-all',
                            cfgModo === 'estilo' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-muted')}
                        >
                          <p className="text-[13px] font-semibold">Usar o modelo do QR</p>
                          <p className="text-[11px] text-muted-foreground">A página fica com o mesmo estilo que você escolheu no QR.</p>
                        </button>
                        <button
                          onClick={() => { setCfgModo('upload'); setPreviewAba('pagina') }}
                          className={cn('rounded-lg border-2 p-3 text-left transition-all',
                            cfgModo === 'upload' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-muted')}
                        >
                          <p className="text-[13px] font-semibold">Configurar diferente (minha imagem)</p>
                          <p className="text-[11px] text-muted-foreground">Suba a sua própria arte de fundo para a página.</p>
                        </button>
                      </div>
                    </div>

                    {cfgModo === 'upload' ? (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">
                          Ao enviar, você <b>ajusta o recorte</b> arrastando e dando zoom dentro do formato do celular (9:16). A gente só adiciona o botão do WhatsApp por cima.
                        </div>
                        {cfgImagem && (
                          <img src={cfgImagem} alt="Fundo" className="w-full max-h-64 object-contain rounded-lg border bg-slate-50" />
                        )}
                        <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer rounded-lg border px-3 py-2 hover:bg-muted">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                          {uploading ? 'Enviando…' : (cfgImagem ? 'Trocar imagem' : 'Enviar imagem')}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }} />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[13px] font-medium mb-1">Mensagem exibida</p>
                        <textarea
                          value={cfgMensagem}
                          onChange={(e) => setCfgMensagem(e.target.value)}
                          rows={2}
                          placeholder="Ex: É rapidinho! Conte como foi sua experiência."
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button variant="ghost" onClick={() => { setPasso(1); setPreviewAba('qr') }} className="gap-1.5 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button onClick={salvarCfg} disabled={savingCfg} size="lg" className="px-7 rounded-full shadow-md">
                        {savingCfg ? 'Salvando…' : 'Salvar'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            ) : (
            <Card>
              <CardHeader>
                <CardTitle>Seu QR Code está pronto</CardTitle>
                <CardDescription>Baixe pelo botão "Baixar" acima e imprima</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[13px] text-emerald-800 flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  QR e página configurados. Cada garçom tem o seu próprio QR na aba <b>Garçons</b>.
                </div>
                <dl className="text-sm divide-y divide-border rounded-lg border">
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Modelo</dt>
                    <dd className="font-medium">{getTema(cfgEstilo).nome}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Filtro</dt>
                    <dd className="font-medium">{getFiltro(cfgFiltro).nome}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Fundo da página</dt>
                    <dd className="font-medium">{cfgModo === 'upload' ? 'Imagem própria' : 'Modelo do QR'}</dd>
                  </div>
                </dl>
                <Button onClick={() => { setEditando(true); setPasso(1); setPreviewAba('qr') }} variant="outline" className="w-full">
                  Personalizar
                </Button>
              </CardContent>
            </Card>
            )}

            {/* Preview: Página (celular) ou QR impresso */}
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-slate-50/50 p-6">
              {/* No modo pronto, o dono alterna a prévia; no wizard ela segue o passo */}
              {!editando && (
                <div className="inline-flex rounded-lg bg-white border p-1 text-sm">
                  <button
                    onClick={() => setPreviewAba('pagina')}
                    className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', previewAba === 'pagina' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    Página
                  </button>
                  <button
                    onClick={() => setPreviewAba('qr')}
                    className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', previewAba === 'qr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    QR impresso
                  </button>
                </div>
              )}
              {editando && (
                <p className="text-xs font-medium text-muted-foreground">
                  {mostraQr ? 'Prévia do QR impresso' : 'Prévia da página do cliente'}
                </p>
              )}

              {/* Página (celular) */}
              <div className={cn('flex flex-col items-center gap-3', !mostraQr ? '' : 'hidden')}>
                <div className="w-[260px] h-[520px] rounded-[2.2rem] border-[10px] border-slate-800 bg-black overflow-hidden shadow-xl">
                  <LandingView
                    preview
                    restauranteNome={restaurantName}
                    modo={cfgModo}
                    imagem={cfgImagem}
                    estilo={cfgEstilo}
                    filtro={cfgFiltro}
                    mensagem={cfgMensagem}
                    whatsapp={numero}
                  />
                </div>
                <button
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  onClick={() => window.open(landingUrl(qrData.slug), '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir página real
                </button>
              </div>

              {/* QR impresso (canvas sempre montado para desenho/download) */}
              <div className={cn('flex flex-col items-center gap-3', mostraQr ? '' : 'hidden')}>
                <div className="w-full max-w-[280px] overflow-hidden rounded-xl border shadow-lg bg-white">
                  <canvas ref={canvasRef} width={POSTER_W} height={POSTER_H} className="h-auto w-full object-contain" />
                </div>
                <p className="text-sm text-muted-foreground">Arte do QR (impressão)</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          salvando={uploading}
          onConfirm={enviarImagem}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  )
}
