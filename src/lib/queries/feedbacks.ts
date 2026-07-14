import { supabase } from '@/lib/supabase/client'
import { subDays, startOfDay } from 'date-fns'

export interface FiltrosFeedback {
  periodo: '7d' | '30d' | '90d' | 'all'
  sentimento: string
  categorias: string[]
  busca: string
  ordenacao: 'recent' | 'oldest'
}

export async function buscarFeedbacks(filtros: FiltrosFeedback, limit: number, offset: number) {
  let query = supabase.from('feedbacks_restaurante').select('*', { count: 'exact' })

  if (filtros.periodo !== 'all') {
    const days = filtros.periodo === '7d' ? 7 : filtros.periodo === '30d' ? 30 : 90
    const startDate = startOfDay(subDays(new Date(), days)).toISOString()
    query = query.gte('created_at', startDate)
  }

  if (filtros.sentimento && filtros.sentimento !== 'all') {
    query = query.eq('sentimento', filtros.sentimento.toUpperCase())
  }

  if (filtros.categorias.length > 0) {
    query = query.in('categoria', filtros.categorias)
  }

  if (filtros.busca) {
    query = query.ilike('texto_original', `%${filtros.busca}%`)
  }

  if (filtros.ordenacao === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return { feedbacks: data || [], total: count || 0 }
}

export async function buscarCategoriasAtivas(
  restauranteId?: number,
  periodo?: FiltrosFeedback['periodo'],
) {
  let query = supabase
    .from('feedbacks_restaurante')
    .select('categoria')
    .not('categoria', 'is', null)

  if (restauranteId) {
    query = query.eq('restaurante_id', restauranteId)
  }

  if (periodo && periodo !== 'all') {
    const days = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
    const startDate = startOfDay(subDays(new Date(), days)).toISOString()
    query = query.gte('created_at', startDate)
  }

  const { data, error } = await query
  if (error) throw error
  return [...new Set(data?.map((d) => d.categoria).filter(Boolean) as string[])].sort()
}
