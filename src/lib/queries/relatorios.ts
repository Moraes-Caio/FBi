import { supabase } from '@/lib/supabase/client'
import {
  buscarKpis,
  buscarCategorias,
  buscarUltimosFeedbacks,
  getPeriodDates,
  PeriodInfo,
} from '@/lib/queries/visao-geral'
import { enviarMensagem } from '@/lib/openrouter'
import { construirSystemPromptResumoExecutivo } from '@/lib/prompts-sistema'
import { parseISO, format, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Amostra mínima para afirmar "melhor/pior dia" sem virar ruído estatístico. */
const MIN_AMOSTRA = 3

/** Índice de satisfação 0-100: positivo=100, neutro=50, negativo=0. */
function calcSatisfacao(fs: any[]): number | null {
  if (!fs.length) return null
  let pos = 0
  let neu = 0
  for (const f of fs) {
    const s = f.sentimento?.toLowerCase()
    if (s === 'positivo' || s === 'positive') pos++
    else if (s === 'neutro' || s === 'neutral') neu++
  }
  return Math.round((pos * 100 + neu * 50) / fs.length)
}

function faixaDoHorario(h: number): string {
  if (h >= 6 && h < 11) return 'Manhã (6h–11h)'
  if (h >= 11 && h < 15) return 'Almoço (11h–15h)'
  if (h >= 15 && h < 18) return 'Tarde (15h–18h)'
  if (h >= 18 && h < 23) return 'Jantar (18h–23h)'
  return 'Madrugada (23h–6h)'
}

export interface Recorte {
  nome: string
  total: number
  satisfacao: number
}

export interface EstatisticasRelatorio {
  clientesUnicos: number
  clientesRecorrentes: number
  avaliacoesPorCliente: number
  /** Todas as categorias do período, com o MESMO índice 0-100 do resto da página. */
  porCategoria: Array<{ nome: string; total: number; satisfacao: number }>
  melhorCategoria: Recorte | null
  piorCategoria: Recorte | null
  porDiaSemana: Array<{ nome: string; total: number; satisfacao: number | null }>
  melhorDia: Recorte | null
  piorDia: Recorte | null
  porFaixaHorario: Array<{ nome: string; total: number; satisfacao: number | null }>
  faixaMaisMovimentada: Recorte | null
  faixaCritica: Recorte | null
  amostraSuficiente: boolean
}

/**
 * Estatísticas extras do período (recortes que o dono usa para agir:
 * clientes que voltaram, melhor/pior categoria, dia e horário fracos).
 */
export async function buscarEstatisticasRelatorio(
  restauranteId: number | null,
  periodo: PeriodInfo,
): Promise<EstatisticasRelatorio> {
  const vazio: EstatisticasRelatorio = {
    clientesUnicos: 0,
    clientesRecorrentes: 0,
    avaliacoesPorCliente: 0,
    porCategoria: [],
    melhorCategoria: null,
    piorCategoria: null,
    porDiaSemana: [],
    melhorDia: null,
    piorDia: null,
    porFaixaHorario: [],
    faixaMaisMovimentada: null,
    faixaCritica: null,
    amostraSuficiente: false,
  }
  if (!restauranteId) return vazio

  const { currentStart } = getPeriodDates(periodo)
  const { data, error } = await supabase
    .from('feedbacks_restaurante')
    .select('created_at, categoria, sentimento, telefone_cliente')
    .eq('restaurante_id', restauranteId)
    .gte('created_at', currentStart.toISOString())
  if (error) throw error

  const fs = data || []
  if (!fs.length) return vazio

  // Clientes (telefone é o identificador do cliente no WhatsApp)
  const porTelefone = new Map<string, number>()
  for (const f of fs) {
    if (!f.telefone_cliente) continue
    porTelefone.set(f.telefone_cliente, (porTelefone.get(f.telefone_cliente) ?? 0) + 1)
  }
  const clientesUnicos = porTelefone.size
  const clientesRecorrentes = [...porTelefone.values()].filter((n) => n > 1).length
  const avaliacoesPorCliente = clientesUnicos ? Number((fs.length / clientesUnicos).toFixed(1)) : 0

  // Melhor / pior categoria (exige amostra mínima para não eleger categoria de 1 avaliação)
  const porCategoria = new Map<string, any[]>()
  for (const f of fs) {
    const c = f.categoria || 'Geral'
    if (!porCategoria.has(c)) porCategoria.set(c, [])
    porCategoria.get(c)!.push(f)
  }
  // Todas as categorias (para exibição) — mesmo índice 0-100 usado no resto do relatório
  const listaCategorias = [...porCategoria.entries()]
    .map(([nome, arr]) => ({ nome, total: arr.length, satisfacao: calcSatisfacao(arr)! }))
    .sort((a, b) => b.total - a.total)
  // Melhor/pior só com amostra mínima, para não eleger categoria de 1 avaliação
  const cats: Recorte[] = listaCategorias
    .filter((c) => c.total >= MIN_AMOSTRA)
    .sort((a, b) => b.satisfacao - a.satisfacao)
  const melhorCategoria = cats.length ? cats[0] : null
  const piorCategoria = cats.length > 1 ? cats[cats.length - 1] : null

  // Dia da semana
  const diaBuckets = new Map<number, any[]>()
  for (const f of fs) {
    const d = getDay(parseISO(f.created_at))
    if (!diaBuckets.has(d)) diaBuckets.set(d, [])
    diaBuckets.get(d)!.push(f)
  }
  const nomeDia = (d: number) =>
    format(new Date(2024, 0, 7 + d), 'EEEE', { locale: ptBR }) // 07/01/2024 = domingo
  const porDiaSemana = Array.from({ length: 7 }, (_, d) => {
    const arr = diaBuckets.get(d) || []
    return { nome: nomeDia(d), total: arr.length, satisfacao: calcSatisfacao(arr) }
  })
  const diasComAmostra: Recorte[] = porDiaSemana
    .filter((d) => d.total >= MIN_AMOSTRA)
    .map((d) => ({ nome: d.nome, total: d.total, satisfacao: d.satisfacao! }))
    .sort((a, b) => b.satisfacao - a.satisfacao)
  const melhorDia = diasComAmostra.length ? diasComAmostra[0] : null
  const piorDia = diasComAmostra.length > 1 ? diasComAmostra[diasComAmostra.length - 1] : null

  // Faixa de horário
  const faixaBuckets = new Map<string, any[]>()
  for (const f of fs) {
    const nome = faixaDoHorario(parseISO(f.created_at).getHours())
    if (!faixaBuckets.has(nome)) faixaBuckets.set(nome, [])
    faixaBuckets.get(nome)!.push(f)
  }
  const porFaixaHorario = [...faixaBuckets.entries()]
    .map(([nome, arr]) => ({ nome, total: arr.length, satisfacao: calcSatisfacao(arr) }))
    .sort((a, b) => b.total - a.total)
  const faixaMaisMovimentada = porFaixaHorario.length
    ? {
        nome: porFaixaHorario[0].nome,
        total: porFaixaHorario[0].total,
        satisfacao: porFaixaHorario[0].satisfacao!,
      }
    : null
  const faixasComAmostra = porFaixaHorario
    .filter((f) => f.total >= MIN_AMOSTRA)
    .map((f) => ({ nome: f.nome, total: f.total, satisfacao: f.satisfacao! }))
    .sort((a, b) => a.satisfacao - b.satisfacao)
  const faixaCritica = faixasComAmostra.length ? faixasComAmostra[0] : null

  return {
    clientesUnicos,
    clientesRecorrentes,
    avaliacoesPorCliente,
    porCategoria: listaCategorias,
    melhorCategoria,
    piorCategoria,
    porDiaSemana,
    melhorDia,
    piorDia,
    porFaixaHorario,
    faixaMaisMovimentada,
    faixaCritica,
    amostraSuficiente: fs.length >= MIN_AMOSTRA,
  }
}

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
