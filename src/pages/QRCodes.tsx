import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { jsPDF } from 'jspdf'
import { QrCode, Download, RefreshCw, Loader2, Check } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { iamaiLogo } from '@/assets/brand'
import { toast } from 'sonner'

import padraoBg from '@/assets/qr-backgrounds/padrao'
import rusticoBg from '@/assets/qr-backgrounds/rustico'
import modernoBg from '@/assets/qr-backgrounds/moderno'

interface QrData {
  id: number
  slug: string
  total_scans: number
  papel_fundo: string
  url_redirect: string
}

export default function QRCodes() {
  const [qrData, setQrData] = useState<QrData | null>(null)
  const [restaurantName, setRestaurantName] = useState('Restaurante')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (qrData) {
      drawCanvas()
    }
  }, [qrData, restaurantName])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      let restauranteId: number | null = null
      if (userData?.user) {
        const { data: config } = await supabase
          .from('restaurantes')
          .select('id, nome_restaurante')
          .eq('auth_user_id', userData.user.id)
          .single()

        restauranteId = config?.id ?? null
        if (config?.nome_restaurante) setRestaurantName(config.nome_restaurante)
      }

      // Sem restaurante vinculado: não há QR Code a gerar — encerra sem erro
      if (!restauranteId) {
        setLoading(false)
        return
      }

      const res = await supabase.functions.invoke('gerenciar-qr-code', {
        method: 'GET',
      })

      if (res.error || (res.data && res.data.error)) {
        const createRes = await supabase.functions.invoke('gerenciar-qr-code', {
          method: 'POST',
          body: { papel_fundo: 'padrao' },
        })
        if (createRes.error) throw createRes.error
        setQrData(createRes.data)
      } else {
        setQrData(res.data)
      }
    } catch (err: any) {
      toast.error('Erro ao carregar', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBackground = async (papel: string) => {
    if (!qrData || qrData.papel_fundo === papel) return
    try {
      setSaving(true)
      const res = await supabase.functions.invoke('gerenciar-qr-code', {
        method: 'PATCH',
        body: { papel_fundo: papel },
      })
      if (res.error) throw res.error
      setQrData(res.data)
      toast.success('Estilo atualizado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao atualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    try {
      setSaving(true)
      const res = await supabase.functions.invoke('gerenciar-qr-code', {
        method: 'POST',
        body: { papel_fundo: qrData?.papel_fundo || 'padrao' },
      })
      if (res.error) throw res.error
      setQrData(res.data)
      toast.success('Novo QR Code gerado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao gerar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const drawCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas || !qrData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 800, 800)

    let bgUrl = padraoBg
    if (qrData.papel_fundo === 'rustico') bgUrl = rusticoBg
    if (qrData.papel_fundo === 'moderno') bgUrl = modernoBg

    const bgImg = new Image()
    bgImg.crossOrigin = 'anonymous'
    bgImg.src = bgUrl
    await new Promise((resolve) => {
      bgImg.onload = resolve
      bgImg.onerror = resolve
    })
    ctx.drawImage(bgImg, 0, 0, 800, 800)

    ctx.fillStyle = qrData.papel_fundo === 'moderno' ? '#ffffff' : '#1e293b'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(restaurantName, 400, 120)

    ctx.font = '24px sans-serif'
    ctx.fillText('Avalie nosso atendimento', 400, 160)

    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.1)'
    ctx.shadowBlur = 20
    ctx.fillRect(180, 200, 440, 440)
    ctx.shadowBlur = 0

    const qrImg = new Image()
    qrImg.crossOrigin = 'anonymous'
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData.url_redirect)}&margin=0`
    await new Promise((resolve) => {
      qrImg.onload = resolve
      qrImg.onerror = resolve
    })
    ctx.drawImage(qrImg, 200, 220, 400, 400)

    if (iamaiLogo) {
      const logoImg = new Image()
      logoImg.src = iamaiLogo
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      const logoWidth = 120
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth
      ctx.globalAlpha = 0.5
      ctx.drawImage(logoImg, 800 - logoWidth - 30, 800 - logoHeight - 30, logoWidth, logoHeight)
      ctx.globalAlpha = 1.0
    }
  }

  const downloadPDF = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const size = 150
      const x = (pdfWidth - size) / 2
      const y = (pdfHeight - size) / 2

      pdf.addImage(imgData, 'JPEG', x, y, size, size)
      pdf.save(`qrcode-${restaurantName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
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
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">QR Code e Materiais</h2>
          <p className="text-muted-foreground">
            Personalize o visual do seu QR Code e baixe os materiais para impressão.
          </p>
        </div>
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

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">QR Code e Materiais</h2>
        <p className="text-muted-foreground">
          Personalize o visual do seu QR Code e baixe os materiais para impressão.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Acesso</CardTitle>
              <CardDescription>Acompanhe o engajamento do seu QR Code atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <QrCode className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{qrData?.total_scans || 0}</p>
                  <p className="text-sm text-muted-foreground">Scans totais registrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estilo do QR Code</CardTitle>
              <CardDescription>
                Escolha o fundo que mais combina com seu restaurante
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {[
                { id: 'padrao', label: 'Padrão' },
                { id: 'rustico', label: 'Rústico' },
                { id: 'moderno', label: 'Moderno' },
              ].map((style) => {
                const isSelected = qrData?.papel_fundo === style.id
                return (
                  <button
                    key={style.id}
                    disabled={saving}
                    onClick={() => handleUpdateBackground(style.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-muted/50',
                      isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-muted',
                      saving && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <span className="text-sm font-medium">{style.label}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>Baixe ou renove seu QR Code</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row">
              <Button onClick={downloadPDF} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-2" disabled={saving}>
                    <RefreshCw className="h-4 w-4" />
                    Gerar novo QR Code
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar novo QR Code?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso invalidará o QR Code atual. Todos os materiais impressos precisarão ser
                      refeitos. Confirmar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border bg-slate-50/50 p-8">
          <div className="w-full max-w-[400px] overflow-hidden rounded-xl border shadow-lg bg-white">
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="h-auto w-full object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground">Pré-visualização em tempo real</p>
        </div>
      </div>
    </div>
  )
}
