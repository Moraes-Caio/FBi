import { useState, useEffect } from 'react'
import {
  FileText, Download, FileDown, Users, Smile, ThumbsUp, ThumbsDown,
  AlertTriangle, Loader2, PartyPopper, UserCheck, Repeat, CalendarDays, Clock,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  buscarKpis, buscarTendencia, getPeriodDates, PeriodInfo,
} from '@/lib/queries/visao-geral'
import { buscarEstatisticasRelatorio, gerarResumoExecutivo, EstatisticasRelatorio } from '@/lib/queries/relatorios'
import { gerarPdfRelatorio } from '@/lib/pdf/gerar-pdf-relatorio'
import { supabase } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/use-user-profile'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

const PERIOD_LABEL: Record<PeriodInfo, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 3 meses',
}

const chartConfig = { sentiment: { label: 'Satisfação', color: 'hsl(var(--chart-1))' } }

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

/** Resumo sem IA — usado como fallback se a chamada à IA falhar. */
function resumoDeterministico(kpis: any, periodo: PeriodInfo, stats: EstatisticasRelatorio) {
  return [
    `No período (${PERIOD_LABEL[periodo].toLowerCase()}), o restaurante recebeu ${kpis.totalFeedbacks} ${kpis.totalFeedbacks === 1 ? 'avaliação' : 'avaliações'} de ${stats.clientesUnicos || kpis.totalFeedbacks} clientes.`,
    kpis.totalFeedbacks > 0
      ? `O índice de satisfação foi ${kpis.sentiment} de 100, com ${kpis.positivos} avaliações positivas (${kpis.positivePercent}%) e ${kpis.negativos} negativas (${kpis.negativePercent}%).`
      : '',
    kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum'
      ? `O tema que mais preocupa é "${kpis.criticalTheme}", com ${kpis.criticalPercent}% de avaliações negativas.`
      : '',
    kpis.totalFeedbacks < 10 ? 'A amostra ainda é pequena, então a leitura é preliminar.' : '',
  ].filter(Boolean).join(' ')
}

function SatisfacaoTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-foreground mb-0.5">{d.date}</p>
      {d.avaliacoes > 0 ? (
        <p className="text-xs text-muted-foreground">
          Satisfação: <span className="font-semibold text-foreground">{d.sentiment}/100</span>
          {' · '}{d.avaliacoes} avaliaç{d.avaliacoes !== 1 ? 'ões' : 'ão'}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem avaliações</p>
      )}
    </div>
  )
}

function StatMini({ icon: Icon, label, valor, detalhe }: {
  icon: any; label: string; valor: string; detalhe?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-white p-4">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight truncate">{valor}</p>
        {detalhe && <p className="text-[11px] text-muted-foreground mt-0.5">{detalhe}</p>}
      </div>
    </div>
  )
}

export default function Reports() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [period, setPeriod] = useState<PeriodInfo>('30d')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>(null)
  const [stats, setStats] = useState<EstatisticasRelatorio | null>(null)
  const [tendencia, setTendencia] = useState<any[]>([])
  const [nomeRestaurante, setNomeRestaurante] = useState('Restaurante')
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [gerandoCsv, setGerandoCsv] = useState(false)

  const restauranteId = profile?.restaurante_id ?? null

  useEffect(() => {
    if (profileLoading) return
    const carregar = async () => {
      setLoading(true)
      try {
        const [k, e, t] = await Promise.all([
          buscarKpis(restauranteId, period),
          buscarEstatisticasRelatorio(restauranteId, period),
          buscarTendencia(restauranteId, period),
        ])
        setKpis(k); setStats(e); setTendencia(t)
        if (restauranteId) {
          const { data: r } = await supabase
            .from('restaurantes').select('nome_restaurante').eq('id', restauranteId).single()
          if (r?.nome_restaurante) setNomeRestaurante(r.nome_restaurante)
        }
      } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os dados do relatório.')
      }
      setLoading(false)
    }
    carregar()
  }, [profileLoading, restauranteId, period])

  const semDados = !!kpis && kpis.totalFeedbacks === 0

  // ── CSV completo (várias seções + lista de avaliações) ─────────────────────
  const handleExportCSV = async () => {
    if (!kpis || !stats) return
    setGerandoCsv(true)
    try {
      const { currentStart } = getPeriodDates(period)
      const { data: brutos } = restauranteId
        ? await supabase
            .from('feedbacks_restaurante')
            .select('created_at, categoria, sentimento, texto_original, resumo')
            .eq('restaurante_id', restauranteId)
            .gte('created_at', currentStart.toISOString())
            .order('created_at', { ascending: false })
        : { data: [] as any[] }

      const temaCritico =
        kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum'
          ? `${kpis.criticalTheme} (${kpis.criticalPercent}% negativas)` : 'Nenhum'

      const linhas: string[][] = [
        ['RELATÓRIO', nomeRestaurante],
        ['Período', PERIOD_LABEL[period]],
        ['Gerado em', format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })],
        [],
        ['RESUMO'],
        ['Métrica', 'Valor', 'vs. período anterior'],
        ['Total de avaliações', String(kpis.totalFeedbacks), kpis.hasPrevData ? kpis.totalTrend : '—'],
        ['Índice de satisfação (0-100)', String(kpis.sentiment), kpis.hasPrevData ? kpis.sentimentTrend : '—'],
        ['Avaliações positivas', `${kpis.positivos} (${kpis.positivePercent}%)`, ''],
        ['Avaliações neutras', String(kpis.neutros), ''],
        ['Avaliações negativas', `${kpis.negativos} (${kpis.negativePercent}%)`, ''],
        ['Tema que mais preocupa', temaCritico, ''],
        ['Clientes únicos', String(stats.clientesUnicos), ''],
        ['Clientes que avaliaram mais de uma vez', String(stats.clientesRecorrentes), ''],
        ['Avaliações por cliente', String(stats.avaliacoesPorCliente), ''],
        [],
        ['POR CATEGORIA'],
        ['Categoria', 'Avaliações', 'Satisfação (0-100)'],
        ...stats.porCategoria.map((c) => [c.nome, String(c.total), String(c.satisfacao)]),
        [],
        ['EVOLUÇÃO NO PERÍODO'],
        ['Data', 'Avaliações', 'Satisfação (0-100)'],
        ...tendencia.map((t) => [t.date, String(t.avaliacoes), t.sentiment == null ? '' : String(t.sentiment)]),
        [],
        ['POR DIA DA SEMANA'],
        ['Dia', 'Avaliações', 'Satisfação (0-100)'],
        ...stats.porDiaSemana.map((d) => [d.nome, String(d.total), d.satisfacao == null ? '' : String(d.satisfacao)]),
        [],
        ['POR FAIXA DE HORÁRIO'],
        ['Faixa', 'Avaliações', 'Satisfação (0-100)'],
        ...stats.porFaixaHorario.map((f) => [f.nome, String(f.total), f.satisfacao == null ? '' : String(f.satisfacao)]),
        [],
        ['TODAS AS AVALIAÇÕES'],
        ['Data', 'Hora', 'Categoria', 'Sentimento', 'Avaliação'],
        ...(brutos || []).map((f: any) => {
          const d = parseISO(f.created_at)
          return [
            format(d, 'dd/MM/yyyy'), format(d, 'HH:mm'),
            f.categoria || 'Geral', f.sentimento || '',
            (f.texto_original || f.resumo || '').replace(/[\r\n]+/g, ' '),
          ]
        }),
      ]

      const csv = linhas
        .map((cols) => cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\r\n')
      baixar(
        new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
        `relatorio-${nomeRestaurante.replace(/\s+/g, '-').toLowerCase()}-${period}.csv`,
      )
      toast.success('CSV baixado!')
    } catch (e: any) {
      toast.error('Erro ao gerar o CSV', { description: e.message })
    } finally {
      setGerandoCsv(false)
    }
  }

  // ── PDF com resumo executivo escrito pela IA (fallback: texto calculado) ───
  const handleExportPdf = async () => {
    if (!kpis || !stats) return
    setGerandoPdf(true)
    try {
      const { currentStart } = getPeriodDates(period)
      const [fbRes, insRes] = await Promise.all([
        restauranteId
          ? supabase.from('feedbacks_restaurante')
              .select('categoria, sentimento, texto_original, resumo')
              .eq('restaurante_id', restauranteId)
              .gte('created_at', currentStart.toISOString())
              .order('created_at', { ascending: false }).limit(15)
          : Promise.resolve({ data: [] as any[] }),
        restauranteId
          ? supabase.from('insights').select('titulo, prioridade')
              .eq('restaurante_id', restauranteId).eq('ativo', true)
              .order('created_at', { ascending: false }).limit(8)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const dados = {
        periodo: PERIOD_LABEL[period],
        geradoEm: new Date().toISOString(),
        kpis,
        estatisticas: stats,
        categorias: stats.porCategoria,
        insights: insRes.data || [],
        feedbacks: fbRes.data || [],
      }

      // Tenta o resumo por IA; se falhar, usa o texto calculado
      let resumo = ''
      try {
        resumo = String(await gerarResumoExecutivo(dados)).trim()
      } catch (err) {
        console.warn('Resumo por IA indisponível, usando fallback:', err)
      }
      if (!resumo) resumo = resumoDeterministico(kpis, period, stats)

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

  if (loading || !kpis || !stats) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" />
          <Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  const trendTexto = (t: string, hasPrev: boolean) =>
    hasPrev ? `${t} vs. período anterior`
      : kpis.totalFeedbacks > 0 ? 'primeiro período com dados' : 'sem dados anteriores'

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
          <Button variant="outline" onClick={handleExportCSV} disabled={semDados || gerandoCsv} className="bg-white">
            {gerandoCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
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
          {/* KPIs principais */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Índice de satisfação</CardTitle>
                <Smile className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {kpis.sentiment}<span className="text-lg font-medium text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.hasPrevData ? `${kpis.sentimentTrend} · ` : ''}quanto maior, melhor
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações positivas</CardTitle>
                <ThumbsUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{kpis.positivePercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">{kpis.positivos} de {kpis.totalFeedbacks} avaliações</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações negativas</CardTitle>
                <ThumbsDown className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-500">{kpis.negativePercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">{kpis.negativos} de {kpis.totalFeedbacks} avaliações</p>
              </CardContent>
            </Card>
          </div>

          {/* Tema crítico */}
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

          {/* Evolução da satisfação */}
          <Card className="bg-white shadow-sm border-border/60">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold">Evolução da satisfação</CardTitle>
              <p className="text-xs text-muted-foreground">
                Índice de 0 a 100 ao longo do período. A linha tracejada é o meio da escala (50).
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig} className="w-full h-[240px]">
                <AreaChart data={tendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSatisfacao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date" axisLine={false} tickLine={false} dy={10}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    interval={tendencia.length > 10 ? Math.max(1, Math.ceil((tendencia.length - 1) / 5)) : 0}
                  />
                  <YAxis
                    axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 2" strokeOpacity={0.7} />
                  <ChartTooltip content={<SatisfacaoTooltip />} />
                  <Area
                    type="monotone" dataKey="sentiment" stroke="hsl(var(--chart-1))" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradSatisfacao)" connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Categorias */}
          {stats.porCategoria.length > 0 && (
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Satisfação por categoria</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Índice de 0 a 100 em cada assunto citado pelos clientes.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {stats.porCategoria.map((c) => (
                  <div key={c.nome} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-foreground">{c.nome}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.satisfacao}%`, background: 'hsl(var(--chart-1))' }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {c.satisfacao}
                    </span>
                    <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
                      {c.total} avaliaç{c.total !== 1 ? 'ões' : 'ão'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recortes extras */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatMini
              icon={UserCheck} label="Clientes únicos" valor={String(stats.clientesUnicos)}
              detalhe={`${stats.avaliacoesPorCliente} avaliação(ões) por cliente`}
            />
            <StatMini
              icon={Repeat} label="Clientes que voltaram a avaliar"
              valor={String(stats.clientesRecorrentes)}
              detalhe={stats.clientesRecorrentes === 0 ? 'ninguém avaliou 2x ainda' : 'avaliaram mais de uma vez'}
            />
            <StatMini
              icon={CalendarDays} label="Melhor dia da semana"
              valor={stats.melhorDia ? stats.melhorDia.nome : '—'}
              detalhe={stats.melhorDia
                ? `${stats.melhorDia.satisfacao}/100 · ${stats.melhorDia.total} avaliações`
                : 'ainda sem dados suficientes'}
            />
            <StatMini
              icon={Clock} label="Horário mais movimentado"
              valor={stats.faixaMaisMovimentada ? stats.faixaMaisMovimentada.nome.split(' ')[0] : '—'}
              detalhe={stats.faixaMaisMovimentada
                ? `${stats.faixaMaisMovimentada.total} avaliações · ${stats.faixaMaisMovimentada.satisfacao}/100`
                : 'ainda sem dados suficientes'}
            />
          </div>

          {/* Pontos de atenção derivados dos recortes */}
          {(stats.piorDia || stats.faixaCritica || stats.piorCategoria) && (
            <Card className="bg-white shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Onde vale olhar de perto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2 text-sm">
                {stats.piorCategoria && (
                  <p className="text-muted-foreground">
                    A categoria com menor satisfação foi{' '}
                    <span className="font-semibold text-foreground">{stats.piorCategoria.nome}</span>{' '}
                    ({stats.piorCategoria.satisfacao}/100 em {stats.piorCategoria.total} avaliações).
                  </p>
                )}
                {stats.piorDia && (
                  <p className="text-muted-foreground">
                    O dia mais fraco foi{' '}
                    <span className="font-semibold text-foreground">{stats.piorDia.nome}</span>{' '}
                    ({stats.piorDia.satisfacao}/100 em {stats.piorDia.total} avaliações).
                  </p>
                )}
                {stats.faixaCritica && (
                  <p className="text-muted-foreground">
                    A faixa de horário com menor satisfação foi{' '}
                    <span className="font-semibold text-foreground">{stats.faixaCritica.nome}</span>{' '}
                    ({stats.faixaCritica.satisfacao}/100 em {stats.faixaCritica.total} avaliações).
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!stats.amostraSuficiente && (
            <p className="text-xs text-muted-foreground text-center">
              Com poucas avaliações, os recortes por dia e horário ficam ocultos para não induzir a conclusões erradas.
            </p>
          )}
        </>
      )}
    </div>
  )
}
