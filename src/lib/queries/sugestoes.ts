import { supabase } from '@/lib/supabase/client'

export interface Resposta {
  id: string
  texto: string
  autor: string
  arquivos: string[]
  created_at: string
  responde_a: string | null
}

export interface Reacao {
  mensagem_id: string
  autor: 'cliente' | 'admin'
  emoji: string
}

export interface Sugestao {
  id: string
  texto: string
  titulo: string | null
  arquivos: string[]
  status: 'aberta' | 'respondida' | 'finalizada'
  created_at: string
  admin_leu_em: string | null
  cliente_leu_em: string | null
  respostas: Resposta[]
  reacoes: Reacao[]
}

export async function buscarSugestoes(): Promise<Sugestao[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('sugestoes_plataforma')
    .select(
      `id, texto, titulo, arquivos, status, created_at, admin_leu_em, cliente_leu_em,
       respostas_sugestoes (id, texto, autor, arquivos, created_at, responde_a),
       reacoes_sugestoes (mensagem_id, autor, emoji)`,
    )
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((s: any) => ({
    id: s.id,
    texto: s.texto,
    titulo: s.titulo,
    arquivos: s.arquivos ?? [],
    status: s.status,
    created_at: s.created_at,
    admin_leu_em: s.admin_leu_em ?? null,
    cliente_leu_em: s.cliente_leu_em ?? null,
    respostas: (s.respostas_sugestoes ?? []).sort(
      (a: Resposta, b: Resposta) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    reacoes: (s.reacoes_sugestoes ?? []) as Reacao[],
  }))
}

export async function criarSugestao(
  texto: string,
  arquivoPaths: string[],
  restauranteId?: number | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase.from('sugestoes_plataforma').insert({
    usuario_id: user.id,
    restaurante_id: restauranteId ?? null,
    texto,
    arquivos: arquivoPaths,
  })
  if (error) throw error
}

export async function editarSugestao(
  id: string,
  texto: string,
  arquivos: string[],
): Promise<void> {
  const { error } = await supabase
    .from('sugestoes_plataforma')
    .update({ texto, arquivos })
    .eq('id', id)
  if (error) throw error
}

export async function editarResposta(
  id: string,
  texto: string,
  arquivos: string[],
  respondeA: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from('respostas_sugestoes')
    .update({ texto, arquivos, responde_a: respondeA })
    .eq('id', id)
  if (error) throw error
}

export async function excluirResposta(id: string): Promise<void> {
  const { error } = await supabase.from('respostas_sugestoes').delete().eq('id', id)
  if (error) throw error
}

export async function excluirArquivosStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from('sugestoes-plataforma').remove(paths)
  if (error) throw error
}

export async function responderSugestao(
  sugestaoId: string,
  texto: string,
  arquivoPaths: string[],
  respondeA: string | null = null,
): Promise<void> {
  const { error } = await supabase.from('respostas_sugestoes').insert({
    sugestao_id: sugestaoId,
    texto,
    autor: 'usuario',
    arquivos: arquivoPaths,
    responde_a: respondeA,
  })
  if (error) throw error
}

export async function buscarTotalNaoLidasCliente(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase
    .from('sugestoes_plataforma')
    .select('id, cliente_leu_em, respostas_sugestoes(autor, created_at)')
    .eq('usuario_id', user.id)
  if (error || !data) return 0

  let total = 0
  for (const s of data as any[]) {
    const adminReplies = ((s.respostas_sugestoes ?? []) as { autor: string; created_at: string }[])
      .filter((r) => r.autor !== 'usuario')
    if (s.cliente_leu_em) {
      const leuEm = new Date(s.cliente_leu_em)
      total += adminReplies.filter((r) => new Date(r.created_at) > leuEm).length
    } else {
      // Nunca aberta: todas as respostas do suporte contam
      total += adminReplies.length
    }
  }
  return total
}

export async function reagirCliente(
  sugestaoId: string,
  mensagemId: string,
  emoji: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('reacoes_sugestoes')
    .select('id, emoji')
    .eq('mensagem_id', mensagemId)
    .eq('autor', 'cliente')
    .maybeSingle()

  if (existing) {
    if (existing.emoji === emoji) {
      await supabase.from('reacoes_sugestoes').delete().eq('id', existing.id)
    } else {
      // Bumpa created_at: reagir/trocar é a ação mais recente
      await supabase
        .from('reacoes_sugestoes')
        .update({ emoji, created_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
  } else {
    await supabase.from('reacoes_sugestoes').insert({
      sugestao_id: sugestaoId,
      mensagem_id: mensagemId,
      autor: 'cliente',
      emoji,
    })
  }
}

export async function marcarClienteLeu(sugestaoId: string): Promise<void> {
  await supabase
    .from('sugestoes_plataforma')
    .update({ cliente_leu_em: new Date().toISOString() })
    .eq('id', sugestaoId)
}

export async function resetAdminLeu(sugestaoId: string, beforeTime: string): Promise<void> {
  const rollbackTo = new Date(new Date(beforeTime).getTime() - 1).toISOString()
  await supabase
    .from('sugestoes_plataforma')
    .update({ admin_leu_em: rollbackTo })
    .eq('id', sugestaoId)
}

export async function excluirSugestao(id: string): Promise<void> {
  const { error } = await supabase
    .from('sugestoes_plataforma')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const results = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from('sugestoes-plataforma')
        .createSignedUrl(path, 3600)
      return [path, data?.signedUrl ?? ''] as [string, string]
    }),
  )
  return Object.fromEntries(results)
}

export async function uploadArquivosSugestao(
  userId: string,
  files: File[],
): Promise<string[]> {
  const paths: string[] = []
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error } = await supabase.storage
      .from('sugestoes-plataforma')
      .upload(path, file, { upsert: false })
    if (error) throw error
    paths.push(path)
  }
  return paths
}
