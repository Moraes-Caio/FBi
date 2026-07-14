import { supabase } from '@/lib/supabase/client'

export interface Resposta {
  id: string
  texto: string
  autor: string
  created_at: string
}

export interface Sugestao {
  id: string
  texto: string
  titulo: string | null
  arquivos: string[]
  status: 'aberta' | 'respondida' | 'finalizada'
  created_at: string
  respostas: Resposta[]
}

export async function buscarSugestoes(): Promise<Sugestao[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('sugestoes_plataforma')
    .select(
      `id, texto, titulo, arquivos, status, created_at,
       respostas_sugestoes (id, texto, autor, created_at)`,
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
    respostas: (s.respostas_sugestoes ?? []).sort(
      (a: Resposta, b: Resposta) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
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

export async function finalizarSugestao(id: string): Promise<void> {
  const { error } = await supabase
    .from('sugestoes_plataforma')
    .update({ status: 'finalizada' })
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
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('sugestoes-plataforma')
      .upload(path, file, { upsert: false })
    if (error) throw error
    paths.push(path)
  }
  return paths
}
