import { supabase } from '@/lib/supabase/client'

/** Rótulos amigáveis de cada campo que a IA pode atualizar. */
export const CAMPOS_CONFIG: Record<string, string> = {
  nome: 'seu nome',
  nome_restaurante: 'nome do restaurante',
  tipo_culinaria: 'tipo de cozinha',
  numero_mesas: 'número de mesas',
  localizacao: 'localização',
  estilo: 'estilo',
  capacidade_lugares: 'capacidade de lugares',
  num_funcionarios: 'tamanho da equipe',
  faixa_preco: 'ticket médio',
  horario_funcionamento: 'horário de funcionamento',
  publico_alvo: 'público',
  pratos_destaque: 'pratos que mais saem',
  diferenciais: 'diferenciais',
  desafios: 'desafios',
  ano_abertura: 'ano de abertura',
  detalhes: 'descrição do restaurante',
}

// Onde cada campo mora no banco
const COLUNAS_TEXTO = new Set(['nome', 'nome_restaurante', 'tipo_culinaria', 'detalhes'])
const CAMPOS_JSON = new Set([
  'localizacao', 'estilo', 'capacidade_lugares', 'num_funcionarios', 'faixa_preco',
  'horario_funcionamento', 'publico_alvo', 'pratos_destaque', 'diferenciais', 'desafios', 'ano_abertura',
])

export function campoValido(campo: string): boolean {
  return campo === 'numero_mesas' || COLUNAS_TEXTO.has(campo) || CAMPOS_JSON.has(campo)
}

/**
 * Atualiza um campo da configuração do restaurante a partir do chat.
 * Grava na coluna própria quando existe, ou dentro de perfil_restaurante (jsonb).
 */
export async function atualizarCampoConfig(
  restauranteId: number,
  campo: string,
  valor: string,
): Promise<void> {
  const v = valor.trim()

  if (campo === 'numero_mesas') {
    const n = parseInt(v.replace(/\D/g, ''), 10)
    await supabase.from('restaurantes').update({ numero_mesas: Number.isFinite(n) ? n : null }).eq('id', restauranteId)
    return
  }

  if (COLUNAS_TEXTO.has(campo)) {
    // coluna definida em tempo de execução: fora do alcance dos tipos gerados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('restaurantes').update({ [campo]: v || null }).eq('id', restauranteId)
    return
  }

  if (CAMPOS_JSON.has(campo)) {
    // merge: preserva os outros campos do jsonb
    const { data } = await supabase
      .from('restaurantes').select('perfil_restaurante').eq('id', restauranteId).single()
    const perfil = { ...((data?.perfil_restaurante as any) || {}), [campo]: v }
    await supabase.from('restaurantes').update({ perfil_restaurante: perfil }).eq('id', restauranteId)
    return
  }

  throw new Error(`Campo desconhecido: ${campo}`)
}
