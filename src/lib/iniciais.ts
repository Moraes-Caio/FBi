/**
 * Extrai as iniciais de um texto (nome de usuário, restaurante, mascote).
 * Pega a primeira letra de cada palavra, limitado por `max`.
 * Ex.: getIniciais('João Silva', 2) => 'JS'; getIniciais('Restaurante da Vila', 2) => 'RV'.
 */
export function getIniciais(texto?: string | null, max = 2): string {
  if (!texto) return '?'
  const palavras = texto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Ignora conectores comuns ("da", "de", "do", "e") ao montar iniciais
    .filter((p) => !['da', 'de', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase()))

  if (palavras.length === 0) return '?'

  const iniciais = palavras
    .slice(0, max)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')

  return iniciais || '?'
}
