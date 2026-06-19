import { supabase } from '@/lib/supabase/client'
import { buscarKpis, buscarCategorias, buscarUltimosFeedbacks } from '@/lib/queries/visao-geral'
import { enviarMensagem } from '@/lib/openrouter'
import { construirSystemPromptResumoExecutivo } from '@/lib/prompts-sistema'

export async function buscarInsightsAtivos(restauranteId: number, limit: number) {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function gerarDadosRelatorio(restauranteId: number, periodo: '7d' | '30d' | '90d') {
  const kpis = await buscarKpis(restauranteId, periodo)
  const categorias = await buscarCategorias(restauranteId, periodo)
  const feedbacks = await buscarUltimosFeedbacks(restauranteId, 10)
  const insights = await buscarInsightsAtivos(restauranteId, 3)

  return {
    kpis,
    categorias: categorias.slice(0, 3),
    insights,
    feedbacks,
    restauranteId,
    periodo,
    geradoEm: new Date().toISOString(),
  }
}

export async function gerarResumoExecutivo(dadosRelatorio: any) {
  const systemPrompt = construirSystemPromptResumoExecutivo(dadosRelatorio)
  const resposta = await enviarMensagem([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Gere o resumo executivo do relatório.' },
  ])
  return String(resposta)
}

export async function salvarRelatorio(
  restauranteId: number,
  periodo: string,
  dadosJson: any,
  resumoExecutivo: string,
  urlPdf: string,
) {
  const { data, error } = await supabase
    .from('relatorios')
    .insert({
      restaurante_id: restauranteId,
      periodo,
      dados_json: dadosJson,
      resumo_executivo: resumoExecutivo,
      url_pdf: urlPdf,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listarRelatorios(restauranteId: number) {
  const { data, error } = await supabase
    .from('relatorios')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
