import { useState, useEffect } from 'react'
import { FileText, Download, Printer, BarChart3, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buscarKpis, PeriodInfo } from '@/lib/queries/visao-geral'
import { useUserProfile } from '@/hooks/use-user-profile'

export default function Reports() {
  const { profile } = useUserProfile()
  const [period, setPeriod] = useState<PeriodInfo>('30d')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>(null)

  useEffect(() => {
    if (profile === undefined) return // perfil ainda carregando
    const fetchKpis = async () => {
      setLoading(true)
      try {
        // buscarKpis trata restaurante nulo retornando zeros — não trava a página
        const data = await buscarKpis(profile?.restaurante_id ?? null, period)
        setKpis(data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    fetchKpis()
  }, [profile, period])

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!kpis) return
    const csvContent = `data:text/csv;charset=utf-8,Métrica,Valor,Tendência\nTotal de Avaliações,${kpis.totalFeedbacks},${kpis.totalTrend}\nSentimento Positivo,${kpis.sentiment}%,${kpis.sentimentTrend}\nNPS,${kpis.nps},${kpis.npsTrend}`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio-restaurante-${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !kpis) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios
          </h2>
          <p className="text-muted-foreground mt-1">
            Visualize e exporte os dados consolidados do seu restaurante.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} className="bg-white">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handlePrint} className="shadow-sm">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Avaliações
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{kpis.totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.totalTrend} em relação ao período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nota Média (NPS)
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{kpis.nps}</div>
            <p className="text-xs text-muted-foreground mt-1">Tendência de {kpis.npsTrend}</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sentimento Positivo
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{kpis.sentiment}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tendência de {kpis.sentimentTrend}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed shadow-none bg-secondary/30 mt-8">
        <CardHeader className="text-center pb-2">
          <CardTitle>Exportação de Relatórios PDF</CardTitle>
          <CardDescription>
            O sistema utiliza o recurso nativo de impressão do navegador para gerar PDFs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-border/50">
            <Printer className="h-8 w-8 text-primary/80" />
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            Para gerar um relatório em PDF otimizado e sem falhas de dependência, clique no botão
            "Imprimir" e selecione a opção <strong>"Salvar como PDF"</strong> na janela de impressão
            do seu navegador.
          </p>
          <Button variant="default" className="mt-6" onClick={handlePrint}>
            Abrir Janela de Impressão
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
