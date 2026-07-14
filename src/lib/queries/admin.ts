import { supabase } from '@/lib/supabase/client'

export interface RespostaAdmin {
  id: string
  texto: string
  autor: string
  arquivos: string[]
  created_at: string
}

export interface SugestaoAdmin {
  id: string
  texto: string
  titulo: string | null
  arquivos: string[]
  status: 'aberta' | 'respondida' | 'finalizada'
  created_at: string
  usuario_id: string
  usuario_nome: string | null
  usuario_email: string | null
  admin_leu_em: string | null
  cliente_leu_em: string | null
  respostas: RespostaAdmin[]
}

export interface DivisaoReceita {
  id: string
  nome: string
  chave_pix: string | null
  tipo: 'porcentagem' | 'valor_fixo'
  valor: number
  ativo: boolean
  created_at: string
}

export async function buscarTodasSugestoes(): Promise<SugestaoAdmin[]> {
  const { data: sugestoes, error } = await supabase
    .from('sugestoes_plataforma')
    .select(`
      id, texto, titulo, arquivos, status, created_at, usuario_id,
      admin_leu_em, cliente_leu_em,
      respostas_sugestoes (id, texto, autor, arquivos, created_at)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!sugestoes || sugestoes.length === 0) return []

  const usuarioIds = [...new Set((sugestoes as any[]).map((s) => s.usuario_id).filter(Boolean))]

  const { data: restaurantes } = await supabase
    .from('restaurantes')
    .select('auth_user_id, nome, email')
    .in('auth_user_id', usuarioIds)

  const userMap: Record<string, { nome: string | null; email: string | null }> = {}
  for (const r of restaurantes ?? []) {
    if (r.auth_user_id) {
      userMap[r.auth_user_id] = { nome: r.nome ?? null, email: r.email ?? null }
    }
  }

  return (sugestoes as any[]).map((s) => ({
    id: s.id,
    texto: s.texto,
    titulo: s.titulo ?? null,
    arquivos: Array.isArray(s.arquivos) ? s.arquivos : [],
    status: s.status,
    created_at: s.created_at,
    usuario_id: s.usuario_id,
    usuario_nome: userMap[s.usuario_id]?.nome ?? null,
    usuario_email: userMap[s.usuario_id]?.email ?? null,
    admin_leu_em: s.admin_leu_em ?? null,
    cliente_leu_em: s.cliente_leu_em ?? null,
    respostas: ((s.respostas_sugestoes ?? []) as any[])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((r) => ({
        id: r.id,
        texto: r.texto,
        autor: r.autor,
        arquivos: Array.isArray(r.arquivos) ? r.arquivos : [],
        created_at: r.created_at,
      })),
  }))
}

export async function responderSugestao(
  sugestaoId: string,
  texto: string,
  arquivoPaths: string[],
): Promise<void> {
  const { error } = await supabase.from('respostas_sugestoes').insert({
    sugestao_id: sugestaoId,
    texto,
    arquivos: arquivoPaths,
  })
  if (error) throw error
}

export async function editarRespostaAdmin(
  id: string,
  texto: string,
  arquivos: string[],
): Promise<void> {
  const { error } = await supabase
    .from('respostas_sugestoes')
    .update({ texto, arquivos })
    .eq('id', id)
  if (error) throw error
}

export async function excluirRespostaAdmin(id: string): Promise<void> {
  const { error } = await supabase.from('respostas_sugestoes').delete().eq('id', id)
  if (error) throw error
}

export async function excluirArquivosAdmin(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from('sugestoes-plataforma').remove(paths)
  if (error) throw error
}

export async function buscarTotalNaoLidas(): Promise<number> {
  const { data, error } = await supabase
    .from('sugestoes_plataforma')
    .select('id, created_at, admin_leu_em, respostas_sugestoes(autor, created_at)')
  if (error || !data) return 0

  let total = 0
  for (const s of data as any[]) {
    const respostas = ((s.respostas_sugestoes ?? []) as { autor: string; created_at: string }[])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    if (s.admin_leu_em) {
      const leuEm = new Date(s.admin_leu_em)
      total += respostas.filter((r) => r.autor === 'usuario' && new Date(r.created_at) > leuEm).length
    } else {
      // Nunca lida: mensagens do usuário após a última resposta do admin
      const adminReplies = respostas.filter((r) => r.autor !== 'usuario')
      if (adminReplies.length === 0) {
        total += 1 + respostas.filter((r) => r.autor === 'usuario').length
      } else {
        const lastAdmin = new Date(adminReplies[adminReplies.length - 1].created_at)
        total += respostas.filter((r) => r.autor === 'usuario' && new Date(r.created_at) > lastAdmin).length
      }
    }
  }
  return total
}

export async function marcarAdminLeu(sugestaoId: string): Promise<void> {
  await supabase
    .from('sugestoes_plataforma')
    .update({ admin_leu_em: new Date().toISOString() })
    .eq('id', sugestaoId)
}

export async function uploadArquivosResposta(sugestaoId: string, files: File[]): Promise<string[]> {
  const paths: string[] = []
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `admin/${sugestaoId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error } = await supabase.storage
      .from('sugestoes-plataforma')
      .upload(path, file, { upsert: false })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

// ── Afiliados ─────────────────────────────────────────────────────────────────

export interface Afiliado {
  id: string
  nome: string
  email: string | null
  codigo: string
  comissao_tipo: 'porcentagem' | 'valor_fixo'
  comissao_valor: number
  ativo: boolean
  created_at: string
}

export async function buscarAfiliados(): Promise<Afiliado[]> {
  const { data, error } = await supabase
    .from('afiliados')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Afiliado[]
}

export async function criarAfiliado(input: Omit<Afiliado, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('afiliados').insert(input)
  if (error) throw error
}

export async function atualizarAfiliado(
  id: string,
  input: Partial<Omit<Afiliado, 'id' | 'created_at'>>,
): Promise<void> {
  const { error } = await supabase.from('afiliados').update(input).eq('id', id)
  if (error) throw error
}

export async function excluirAfiliado(id: string): Promise<void> {
  const { error } = await supabase.from('afiliados').delete().eq('id', id)
  if (error) throw error
}

// ── Cupons ────────────────────────────────────────────────────────────────────

export interface Cupon {
  id: string
  codigo: string
  descricao: string | null
  tipo_desconto: 'porcentagem' | 'valor_fixo'
  valor_desconto: number
  validade: string | null
  usos_maximos: number | null
  usos_atuais: number
  ativo: boolean
  afiliado_id: string | null
  afiliado_nome?: string | null
  created_at: string
}

export async function buscarCupons(): Promise<Cupon[]> {
  const { data, error } = await supabase
    .from('cupons')
    .select('*, afiliados(nome)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as any[]).map((c) => ({
    ...c,
    afiliado_nome: c.afiliados?.nome ?? null,
    afiliados: undefined,
  }))
}

export async function criarCupon(
  input: Omit<Cupon, 'id' | 'created_at' | 'usos_atuais' | 'afiliado_nome'>,
): Promise<void> {
  const { error } = await supabase.from('cupons').insert(input)
  if (error) throw error
}

export async function atualizarCupon(
  id: string,
  input: Partial<Omit<Cupon, 'id' | 'created_at' | 'usos_atuais' | 'afiliado_nome'>>,
): Promise<void> {
  const { error } = await supabase.from('cupons').update(input).eq('id', id)
  if (error) throw error
}

export async function excluirCupon(id: string): Promise<void> {
  const { error } = await supabase.from('cupons').delete().eq('id', id)
  if (error) throw error
}

// ── Divisão de Receita ────────────────────────────────────────────────────────

export async function buscarDivisoes(): Promise<DivisaoReceita[]> {
  const { data, error } = await supabase
    .from('divisao_receita')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DivisaoReceita[]
}

export async function criarDivisao(
  input: Omit<DivisaoReceita, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('divisao_receita').insert(input)
  if (error) throw error
}

export async function atualizarDivisao(
  id: string,
  input: Partial<Omit<DivisaoReceita, 'id' | 'created_at'>>,
): Promise<void> {
  const { error } = await supabase.from('divisao_receita').update(input).eq('id', id)
  if (error) throw error
}

export async function excluirDivisao(id: string): Promise<void> {
  const { error } = await supabase.from('divisao_receita').delete().eq('id', id)
  if (error) throw error
}
