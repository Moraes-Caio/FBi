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

  // O update precisa devolver a linha: sem isso, uma falha de permissão (RLS)
  // ou um id errado passariam em silêncio e a IA diria que salvou sem ter salvo.
  const gravar = async (campos: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('restaurantes')
      .update(campos)
      .eq('id', restauranteId)
      .select('id')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      throw new Error('Nada foi alterado — verifique se você tem permissão para editar este restaurante.')
    }
  }

  if (campo === 'numero_mesas') {
    const n = parseInt(v.replace(/\D/g, ''), 10)
    await gravar({ numero_mesas: Number.isFinite(n) ? n : null })
    return
  }

  if (COLUNAS_TEXTO.has(campo)) {
    await gravar({ [campo]: v || null })
    return
  }

  if (CAMPOS_JSON.has(campo)) {
    // merge: preserva os outros campos do jsonb
    const { data, error } = await supabase
      .from('restaurantes').select('perfil_restaurante').eq('id', restauranteId).single()
    if (error) throw new Error(error.message)
    const perfil = { ...((data?.perfil_restaurante as any) || {}), [campo]: v }
    await gravar({ perfil_restaurante: perfil })
    return
  }

  throw new Error(`Campo desconhecido: ${campo}`)
}
