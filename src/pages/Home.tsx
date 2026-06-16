import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Users, MessageSquare, Star, TrendingUp, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfile } from '@/hooks/use-user-profile'
import {
  buscarKpis,
  buscarTendencia,
  buscarUltimosFeedbacks,
  DashboardData,
} from '@/lib/queries/visao-geral'

const chartConfig = {
  avaliacoes: {
    label: 'Avaliações',
    color: 'hsl(var(--primary))',
  },
}

export default function HomePage() {
  const { profile } = useUserProfile()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.restaurante_id) {
      const loadData = async () => {
        setLoading(true)
        const restauranteId = profile.restaurante_id!
        const [kpis, trendData, feedbacks] = await Promise.all([
          buscarKpis(restauranteId, '7d'),
          buscarTendencia(restauranteId, '7d'),
          buscarUltimosFeedbacks(restauranteId, 5),
        ])

        setData({
          kpis,
          chartData: trendData,
          recentFeedbacks: feedbacks,
          categories: [],
        })
        setLoading(false)
      }
      loadData()
    }
  }, [profile?.restaurante_id])

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!data?.chartData) return
    const headers = ['Dia', 'Avaliações']
    const csvContent = [
      headers.join(','),
      ...data.chartData.map((row) => [row.date, row.avaliacoes].join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'visao-geral.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-[1200px] mx-auto animate-fade-in-up">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 mt-4">
          <Skeleton className="h-[400px] lg:col-span-4" />
          <Skeleton className="h-[400px] lg:col-span-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-[1200px] mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe o desempenho do seu restaurante em tempo real.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handlePrint} variant="outline" className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleExportCSV} className="print:hidden bg-primary hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground">
              {data.kpis.totalTrend} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentimento Geral</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.sentiment}%</div>
            <p className="text-xs text-muted-foreground">
              {data.kpis.sentimentTrend} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tema Crítico</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.criticalTheme}</div>
            <p className="text-xs text-muted-foreground">{data.kpis.criticalPercent}% negativo</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.nps}</div>
            <p className="text-xs text-green-600 font-medium">Zona de Avaliação</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>Avaliações na Semana</CardTitle>
            <CardDescription>Volume de feedbacks recebidos nos últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="avaliacoes"
                  stroke="var(--color-avaliacoes)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 hover:shadow-md transition-all duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle>Feedbacks Recentes</CardTitle>
            <CardDescription>Últimas avaliações dos seus clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.recentFeedbacks.map((feedback, idx) => (
                <div
                  key={idx}
                  className="flex flex-col space-y-1 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {feedback.categories.map((c) => (
                        <span
                          key={c}
                          className="text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{feedback.timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${feedback.sentiment === 'positive' ? 'bg-success' : feedback.sentiment === 'negative' ? 'bg-destructive' : 'bg-warning'}`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{feedback.text}</p>
                </div>
              ))}
              {data.recentFeedbacks.length === 0 && (
                <div className="text-sm text-muted-foreground py-4">
                  Nenhum feedback recente encontrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
