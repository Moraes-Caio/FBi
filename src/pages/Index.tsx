import { useState, useEffect } from 'react'
import { MOCK_DATA, type PeriodInfo, type DashboardData } from '@/lib/mock-data'
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

export default function Index() {
  const [period, setPeriod] = useState<PeriodInfo>('7d')
  const [currentData, setCurrentData] = useState<DashboardData>(MOCK_DATA['7d'])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        const restauranteId = user?.user_metadata?.restaurante_id || null

        const [kpis, chartData, categories, recentFeedbacks] = await Promise.all([
          buscarKpis(restauranteId, period),
          buscarTendencia(restauranteId, period),
          buscarCategorias(restauranteId, period),
          buscarUltimosFeedbacks(restauranteId, 5),
        ])

        if (!mounted) return

        if (kpis.totalFeedbacks > 5) {
          setCurrentData({
            kpis,
            chartData,
            categories,
            recentFeedbacks,
          })
        } else {
          // Fallback to mock data if there are not enough real feedbacks
          setCurrentData(MOCK_DATA[period])
          toast({
            title: 'Modo de demonstração',
            description:
              'Exibindo dados de exemplo. Adicione mais feedbacks para ver métricas reais.',
            duration: 5000,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar visão geral:', error)
        if (mounted) {
          setCurrentData(MOCK_DATA[period])
          toast({
            title: 'Erro ao carregar dados',
            description: 'Não foi possível carregar os dados reais. Exibindo dados de exemplo.',
            variant: 'destructive',
          })
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [period, toast, user])

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
      ) : (
        <>
          <KpiCards data={currentData.kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendChart data={currentData.chartData} period={period} onPeriodChange={setPeriod} />
            <CategoryScores categories={currentData.categories} />
          </div>

          <RecentFeedbacks feedbacks={currentData.recentFeedbacks} />
        </>
      )}
    </div>
  )
}
