import { supabase } from '@/lib/supabase/client'
import { subDays, isAfter, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type PeriodInfo = '7d' | '30d' | '90d'

export interface CategoryScore {
  name: string
  score: number
  trend: 'up' | 'down' | 'neutral'
}

export interface FeedbackItem {
  id: string
  text: string
  categories: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  timeAgo: string
}

export interface DashboardData {
  kpis: {
    totalFeedbacks: number
    totalTrend: string
    sentiment: number
    sentimentTrend: string
    nps: number
    npsTrend: string
    criticalTheme: string
    criticalPercent: number
  }
  chartData: Array<{ date: string; sentiment: number; avaliacoes: number }>
  categories: CategoryScore[]
  recentFeedbacks: FeedbackItem[]
}

export const getPeriodDates = (period: PeriodInfo) => {
  const now = new Date()
  let days = 7
  if (period === '30d') days = 30
  if (period === '90d') days = 90

  const currentStart = subDays(now, days)
  const previousStart = subDays(now, days * 2)

  return { now, currentStart, previousStart, days }
}

const getFeedbacksForPeriod = async (restauranteId: number | null, period: PeriodInfo) => {
  // Conta sem restaurante vinculado (onboarding incompleto): nada a buscar
  if (!restauranteId) return []

  const { previousStart } = getPeriodDates(period)
  const { data, error } = await supabase
    .from('feedbacks_restaurante')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .gte('created_at', previousStart.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const buscarKpis = async (restauranteId: number | null, periodo: PeriodInfo) => {
  const feedbacks = await getFeedbacksForPeriod(restauranteId, periodo)
  const { currentStart } = getPeriodDates(periodo)

  const currentFeedbacks = feedbacks.filter((f) => isAfter(parseISO(f.created_at), currentStart))
  const previousFeedbacks = feedbacks.filter((f) => !isAfter(parseISO(f.created_at), currentStart))

  const totalFeedbacks = currentFeedbacks.length
  const prevTotal = previousFeedbacks.length
  const totalTrendValue =
    prevTotal === 0
      ? totalFeedbacks > 0
        ? 100
        : 0
      : Math.round(((totalFeedbacks - prevTotal) / prevTotal) * 100)
  const totalTrend = `${totalTrendValue >= 0 ? '+' : ''}${totalTrendValue}%`

  const getSentimentScore = (arr: any[]) => {
    if (!arr.length) return 0
    const pos = arr.filter(
      (f) =>
        f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive',
    ).length
    return Math.round((pos / arr.length) * 100)
  }

  const sentiment = getSentimentScore(currentFeedbacks)
  const prevSentiment = getSentimentScore(previousFeedbacks)
  const sentimentTrendValue = sentiment - prevSentiment
  const sentimentTrend = `${sentimentTrendValue >= 0 ? '+' : ''}${sentimentTrendValue}%`

  const getNpsScore = (arr: any[]) => {
    if (!arr.length) return 0
    const proms = arr.filter(
      (f) =>
        f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive',
    ).length
    const dets = arr.filter(
      (f) =>
        f.sentimento?.toLowerCase() === 'negativo' || f.sentimento?.toLowerCase() === 'negative',
    ).length
    return Math.round(((proms - dets) / arr.length) * 100)
  }

  const nps = getNpsScore(currentFeedbacks)
  const prevNps = getNpsScore(previousFeedbacks)
  const npsTrendValue = nps - prevNps
  const npsTrend = `${npsTrendValue >= 0 ? '+' : ''}${npsTrendValue}`

  const negativeFeedbacks = currentFeedbacks.filter(
    (f) => f.sentimento?.toLowerCase() === 'negativo' || f.sentimento?.toLowerCase() === 'negative',
  )
  const categoriesCount = negativeFeedbacks.reduce(
    (acc, f) => {
      const cat = f.categoria || 'Geral'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  let criticalTheme = 'Nenhum'
  let criticalPercent = 0
  let maxCount = 0

  for (const [cat, count] of Object.entries(categoriesCount)) {
    if (count > maxCount) {
      maxCount = count
      criticalTheme = cat
    }
  }

  if (currentFeedbacks.length > 0 && maxCount > 0) {
    criticalPercent = Math.round((maxCount / currentFeedbacks.length) * 100)
  }

  return {
    totalFeedbacks,
    totalTrend,
    sentiment,
    sentimentTrend,
    nps,
    npsTrend,
    criticalTheme,
    criticalPercent,
  }
}

export const buscarTendencia = async (restauranteId: number | null, periodo: PeriodInfo) => {
  const feedbacks = await getFeedbacksForPeriod(restauranteId, periodo)
  const { now, currentStart, days } = getPeriodDates(periodo)
  const currentFeedbacks = feedbacks.filter((f) => isAfter(parseISO(f.created_at), currentStart))

  const groupedData: Record<string, { total: number; positive: number }> = {}

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i)
    let formatStr = 'EE'
    if (periodo === '30d') formatStr = 'dd/MM'
    if (periodo === '90d') formatStr = 'MMM'

    const key = format(date, formatStr, { locale: ptBR })
    if (!groupedData[key]) groupedData[key] = { total: 0, positive: 0 }
  }

  currentFeedbacks.forEach((f) => {
    const date = parseISO(f.created_at)
    let formatStr = 'EE'
    if (periodo === '30d') formatStr = 'dd/MM'
    if (periodo === '90d') formatStr = 'MMM'

    const key = format(date, formatStr, { locale: ptBR })
    if (groupedData[key]) {
      groupedData[key].total++
      if (f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive')
        groupedData[key].positive++
    }
  })

  return Object.entries(groupedData).map(([date, stats]) => ({
    date,
    sentiment: stats.total === 0 ? 50 : Math.round((stats.positive / stats.total) * 100),
    avaliacoes: stats.total,
  }))
}

export const buscarCategorias = async (restauranteId: number | null, periodo: PeriodInfo) => {
  const feedbacks = await getFeedbacksForPeriod(restauranteId, periodo)
  const { currentStart } = getPeriodDates(periodo)

  const currentFeedbacks = feedbacks.filter((f) => isAfter(parseISO(f.created_at), currentStart))
  const previousFeedbacks = feedbacks.filter((f) => !isAfter(parseISO(f.created_at), currentStart))

  const categoryMap = currentFeedbacks.reduce(
    (acc, f) => {
      const cat = f.categoria || 'Geral'
      if (!acc[cat]) acc[cat] = { total: 0, positive: 0, prevTotal: 0, prevPositive: 0 }
      acc[cat].total++
      if (f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive')
        acc[cat].positive++
      return acc
    },
    {} as Record<
      string,
      { total: number; positive: number; prevTotal: number; prevPositive: number }
    >,
  )

  previousFeedbacks.forEach((f) => {
    const cat = f.categoria || 'Geral'
    if (!categoryMap[cat])
      categoryMap[cat] = { total: 0, positive: 0, prevTotal: 0, prevPositive: 0 }
    categoryMap[cat].prevTotal++
    if (f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive')
      categoryMap[cat].prevPositive++
  })

  return Object.entries(categoryMap)
    .map(([name, stats]) => {
      const score = stats.total === 0 ? 0 : Math.round((stats.positive / stats.total) * 100)
      const prevScore =
        stats.prevTotal === 0 ? 0 : Math.round((stats.prevPositive / stats.prevTotal) * 100)

      let trend: 'up' | 'down' | 'neutral' = 'neutral'
      if (score > prevScore) trend = 'up'
      else if (score < prevScore) trend = 'down'

      return { name, score, trend } as CategoryScore
    })
    .sort((a, b) => b.score - a.score)
}

export const buscarUltimosFeedbacks = async (
  restauranteId: number | null,
  limit = 5,
): Promise<FeedbackItem[]> => {
  if (!restauranteId) return []

  const { data, error } = await supabase
    .from('feedbacks_restaurante')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const now = new Date()

  return (data || []).map((f) => {
    const date = parseISO(f.created_at)
    const hours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    let timeAgo = `há ${hours}h`
    if (hours > 24) timeAgo = `há ${Math.round(hours / 24)} dias`
    if (hours === 0) timeAgo = 'agora mesmo'

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (f.sentimento?.toLowerCase() === 'positivo' || f.sentimento?.toLowerCase() === 'positive')
      sentiment = 'positive'
    else if (
      f.sentimento?.toLowerCase() === 'negativo' ||
      f.sentimento?.toLowerCase() === 'negative'
    )
      sentiment = 'negative'

    return {
      id: String(f.id),
      text: f.texto_original || f.resumo || '',
      categories: f.categoria ? [f.categoria] : [],
      sentiment,
      timeAgo,
    }
  })
}
