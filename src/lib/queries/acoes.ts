import { supabase } from '@/lib/supabase/client'

export async function buscarAcoes(restauranteId: number, apenasAprovadas = true) {
  const { data, error } = await supabase
    .from('acoes_operacionais')
    .select(
      'id, titulo_acao, plano_detalhado, status, prioridade, categoria, texto, feedback_id, restaurante_id, created_at, ordem',
    )
    .eq('restaurante_id', restauranteId)
    .in('status', apenasAprovadas ? ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'] : ['SUGERIDA'])
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function atualizarOrdemAcoes(acoes: { id: number; ordem: number }[]) {
  const promises = acoes.map((acao) =>
    supabase.from('acoes_operacionais').update({ ordem: acao.ordem }).eq('id', acao.id),
  )

  const results = await Promise.all(promises)
  const hasError = results.some((r) => r.error)
  if (hasError) {
    throw new Error('Falha ao atualizar ordem')
  }
  return true
}

export async function atualizarStatusAcao(acaoId: number, novoStatus: string) {
  const { data, error } = await supabase
    .from('acoes_operacionais')
    .update({ status: novoStatus })
    .eq('id', acaoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function atualizarAcao(acaoId: number, dados: any) {
  const { data, error } = await supabase
    .from('acoes_operacionais')
    .update(dados)
    .eq('id', acaoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function criarAcao(dados: any) {
  const { data, error } = await supabase
    .from('acoes_operacionais')
    .insert([dados])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function aprovarSugestao(acaoId: number) {
  return atualizarStatusAcao(acaoId, 'PENDENTE')
}

export async function rejeitarSugestao(acaoId: number) {
  const { error } = await supabase.from('acoes_operacionais').delete().eq('id', acaoId)

  if (error) throw error
  return true
}

export async function excluirAcao(acaoId: number) {
  const { error } = await supabase.from('acoes_operacionais').delete().eq('id', acaoId)

  if (error) throw error
  return true
}

export async function sugerirAcoesManualmente(restauranteId: number) {
  const { data, error } = await supabase.functions.invoke('sugerir-acoes', {
    body: { restaurante_id: restauranteId },
  })
  if (error) throw error
  return data
}

export async function buscarPerguntasAcao(acaoId: number) {
  const { data, error } = await supabase
    .from('perguntas_direcionadas')
    .select('*')
    .eq('acao_id', acaoId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function atualizarPergunta(perguntaId: string, dados: any) {
  const { data, error } = await supabase
    .from('perguntas_direcionadas')
    .update(dados)
    .eq('id', perguntaId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function criarPergunta(dados: any) {
  const { data, error } = await supabase
    .from('perguntas_direcionadas')
    .insert([dados])
    .select()
    .single()

  if (error) throw error
  return data
}
