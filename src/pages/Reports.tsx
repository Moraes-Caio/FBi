import { useState, useEffect } from 'react'
import { FileText, Download, FileDown, Users, Smile, ThumbsUp, ThumbsDown, AlertTriangle, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buscarKpis, buscarCategorias, getPeriodDates, PeriodInfo } from '@/lib/queries/visao-geral'
import { gerarPdfRelatorio } from '@/lib/pdf/gerar-pdf-relatorio'
import { supabase } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/use-user-profile'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

const PERIOD_LABEL: Record<PeriodInfo, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 3 meses',
}

// Download robusto via Blob (funciona mesmo após await)
function baixar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export default function Reports() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [period, setPeriod] = useState<PeriodInfo>('30d')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>(null)
  const [nomeRestaurante, setNomeRestaurante] = useState('Restaurante')
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const restauranteId = profile?.restaurante_id ?? null

  useEffect(() => {
    if (profileLoading) return // aguarda o perfil carregar antes de buscar
    const fetchKpis = async () => {
      setLoading(true)
      try {
        const data = await buscarKpis(restauranteId, period)
        setKpis(data)
        if (restauranteId) {
          const { data: r } = await supabase
            .from('restaurantes')
            .select('nome_restaurante')
            .eq('id', restauranteId)
            .single()
          if (r?.nome_restaurante) setNomeRestaurante(r.nome_restaurante)
        }
      } catch (e) {
        console.error(e)
        toast.error('Não foi possível carregar os dados do relatório.')
      }
      setLoading(false)
    }
    fetchKpis()
  }, [profileLoading, restauranteId, period])

  const semDados = !!kpis && kpis.totalFeedbacks === 0

  const handleExportCSV = () => {
    if (!kpis) return
    const hoje = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const temaCritico =
      kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum'
        ? `${kpis.criticalTheme} (${kpis.criticalPercent}% negativas)`
        : 'Nenhum'
    // separador ';' e BOM para o Excel (pt-BR) abrir com acentos corretos
    const linhas = [
      ['Relatório', nomeRestaurante],
      ['Período', PERIOD_LABEL[period]],
      ['Gerado em', hoje],
      [],
      ['Métrica', 'Valor', 'vs. período anterior'],
      ['Total de avaliações', String(kpis.totalFeedbacks), kpis.hasPrevData ? kpis.totalTrend : '—'],
      ['Índice de satisfação (0-100)', String(kpis.sentiment), kpis.hasPrevData ? kpis.sentimentTrend : '—'],
      ['Avaliações positivas', `${kpis.positivos} (${kpis.positivePercent}%)`, ''],
      ['Avaliações negativas', `${kpis.negativos} (${kpis.negativePercent}%)`, ''],
      ['Avaliações neutras', String(kpis.neutros), ''],
      ['Tema que mais preocupa', temaCritico, ''],
    ]
    const csv = linhas
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    baixar(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
      `relatorio-${nomeRestaurante.replace(/\s+/g, '-').toLowerCase()}-${period}.csv`,
    )
  }

  const handleExportPdf = async () => {
    if (!kpis) return
    setGerandoPdf(true)
    try {
      const { currentStart } = getPeriodDates(period)
      const [categorias, fbRes, insRes] = await Promise.all([
        buscarCategorias(restauranteId, period),
        restauranteId
          ? supabase
              .from('feedbacks_restaurante')
              .select('categoria, sentimento, texto_original, resumo')
              .eq('restaurante_id', restauranteId)
              .gte('created_at', currentStart.toISOString())
              .order('created_at', { ascending: false })
              .limit(15)
          : Promise.resolve({ data: [] as any[] }),
        restauranteId
          ? supabase
              .from('insights')
              .select('titulo, prioridade')
              .eq('restaurante_id', restauranteId)
              .eq('ativo', true)
              .order('created_at', { ascending: false })
              .limit(8)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const resumo = [
        `No período (${PERIOD_LABEL[period].toLowerCase()}), o restaurante recebeu ${kpis.totalFeedbacks} ${kpis.totalFeedbacks === 1 ? 'avaliação' : 'avaliações'}.`,
        kpis.totalFeedbacks > 0
          ? `O índice de satisfação foi ${kpis.sentiment}/100, com ${kpis.positivos} positivas (${kpis.positivePercent}%) e ${kpis.negativos} negativas (${kpis.negativePercent}%).`
          : '',
        kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum'
          ? `O tema que mais preocupa é "${kpis.criticalTheme}", com ${kpis.criticalPercent}% de avaliações negativas.`
          : '',
      ]
        .filter(Boolean)
        .join(' ')

      const dados = {
        periodo: PERIOD_LABEL[period],
        geradoEm: new Date().toISOString(),
        kpis,
        categorias,
        insights: insRes.data || [],
        feedbacks: fbRes.data || [],
      }

      const blob = await gerarPdfRelatorio(dados, resumo, nomeRestaurante)
      baixar(blob, `relatorio-${nomeRestaurante.replace(/\s+/g, '-').toLowerCase()}-${period}.pdf`)
      toast.success('PDF gerado!')
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao gerar o PDF', { description: e.message })
    } finally {
      setGerandoPdf(false)
    }
  }

  if (loading || !kpis) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  const trendTexto = (t: string, hasPrev: boolean) =>
    hasPrev ? `${t} vs. período anterior` : kpis.totalFeedbacks > 0 ? 'primeiro período com dados' : 'sem dados anteriores'

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios
          </h2>
          <p className="text-muted-foreground mt-1">
            Resumo do que seus clientes acharam — pronto para baixar e compartilhar.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodInfo)}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} disabled={semDados} className="bg-white">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handleExportPdf} disabled={semDados || gerandoPdf} className="shadow-sm">
            {gerandoPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      {semDados ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 border">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Nenhuma avaliação neste período</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Assim que seus clientes começarem a responder, o relatório aparece aqui. Tente um período maior ou compartilhe o QR Code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total de avaliações */}
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de avaliações</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{kpis.totalFeedbacks}</div>
                <p className="text-xs text-muted-foreground mt-1">{trendTexto(kpis.totalTrend, kpis.hasPrevData)}</p>
              </CardContent>
            </Card>

            {/* Índice de satisfação */}
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Índice de satisfação</CardTitle>
                <Smile className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {kpis.sentiment}
                  <span className="text-lg font-medium text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.hasPrevData ? `${kpis.sentimentTrend} · ` : ''}quanto maior, melhor
                </p>
              </CardContent>
            </Card>

            {/* Avaliações positivas */}
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações positivas</CardTitle>
                <ThumbsUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{kpis.positivePercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.positivos} de {kpis.totalFeedbacks} avaliações
                </p>
              </CardContent>
            </Card>

            {/* Avaliações negativas */}
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações negativas</CardTitle>
                <ThumbsDown className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-500">{kpis.negativePercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.negativos} de {kpis.totalFeedbacks} avaliações
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Destaque acionável: tema que mais preocupa */}
          {kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum' ? (
            <Card className="border-amber-200 bg-amber-50 shadow-none">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">Tema que mais precisa de atenção</p>
                  <p className="text-xl font-bold text-amber-900 mt-0.5">{kpis.criticalTheme}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {kpis.criticalPercent}% das avaliações sobre esse tema foram negativas no período.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50 shadow-none">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <PartyPopper className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-800">Nenhum tema concentrando reclamações</p>
                  <p className="text-sm text-emerald-700 mt-0.5">Nenhuma categoria teve reclamações em destaque neste período. Continue assim!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
