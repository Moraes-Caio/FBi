import { useState, useEffect } from 'react'
import type { PeriodInfo, DashboardData } from '@/lib/queries/visao-geral'
import { AiBanner } from '@/components/dashboard/AiBanner'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { CategoryScores } from '@/components/dashboard/CategoryScores'
import { RecentFeedbacks } from '@/components/dashboard/RecentFeedbacks'
import {
  buscarKpis,
  buscarTendencia,
  buscarCategorias,
  buscarUltimosFeedbacks,
} from '@/lib/queries/visao-geral'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { MessageSquare, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Index() {
  const [period, setPeriod] = useState<PeriodInfo>('7d')
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { usuario } = useAuth()

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        const restauranteId = usuario?.restaurante_id ?? null

        const [kpis, chartData, categories, recentFeedbacks] = await Promise.all([
          buscarKpis(restauranteId, period),
          buscarTendencia(restauranteId, period),
          buscarCategorias(restauranteId, period),
          buscarUltimosFeedbacks(restauranteId, 5),
        ])

        if (!mounted) return
        setData({ kpis, chartData, categories, recentFeedbacks })
      } catch (error) {
        console.error('Erro ao carregar visão geral:', error)
        if (mounted) {
          toast({
            title: 'Erro ao carregar dados',
            description: 'Não foi possível carregar os dados do dashboard.',
            variant: 'destructive',
          })
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [period, toast, usuario])

  const isEmpty = !isLoading && data?.kpis.totalFeedbacks === 0

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <AiBanner />

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="col-span-1 lg:col-span-2 h-[350px] w-full" />
            <Skeleton className="col-span-1 h-[350px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 mb-6">
            <MessageSquare className="h-10 w-10 text-[#1D4ED8]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Você ainda não recebeu nenhum feedback
          </h2>
          <p className="text-gray-500 max-w-md mb-8">
            Configure o WhatsApp nas configurações do restaurante e compartilhe o QR Code com seus
            clientes para começar a coletar feedbacks.
          </p>
          <div className="flex gap-3">
            <Button asChild className="bg-[#1D4ED8] hover:bg-blue-700">
              <Link to="/configuracoes">
                <Settings className="mr-2 h-4 w-4" />
                Ir para Configurações
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/qrcode">Ver QR Code</Link>
            </Button>
          </div>
        </div>
      ) : data ? (
        <>
          <KpiCards data={data.kpis} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendChart data={data.chartData} period={period} onPeriodChange={setPeriod} />
            <CategoryScores categories={data.categories} />
          </div>
          <RecentFeedbacks feedbacks={data.recentFeedbacks} />
        </>
      ) : null}
    </div>
  )
}
