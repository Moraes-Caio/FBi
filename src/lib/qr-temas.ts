export interface QrTema {
  id: string
  nome: string
  // Página (landing) que o cliente abre
  bg: string
  texto: string
  botao: string
  botaoTexto: string
  // Pôster impresso (QR)
  posterBg: [string, string]
  posterTexto: string
  posterAccent: string
  // Elementos decorativos (culinária)
  emojis: string[]
}

// Modelos de fundo (culinária + estilo). Aplicados ao pôster do QR e à página do cliente.
export const QR_TEMAS: QrTema[] = [
  { id: 'classico', nome: 'Clássico', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', texto: '#1e293b', botao: '#25D366', botaoTexto: '#fff', posterBg: ['#ffffff', '#DBEAFE'], posterTexto: '#1e293b', posterAccent: '#2563eb', emojis: ['⭐', '💬', '👍', '❤️', '🍽️'] },
  { id: 'moderno', nome: 'Moderno', bg: 'linear-gradient(135deg,#0f172a,#1e293b)', texto: '#f8fafc', botao: '#25D366', botaoTexto: '#0b141a', posterBg: ['#0f172a', '#334155'], posterTexto: '#f8fafc', posterAccent: '#22d3ee', emojis: ['✨', '⚡', '💬', '⭐', '🍽️'] },
  { id: 'rustico', nome: 'Rústico', bg: 'linear-gradient(135deg,#78350f,#b45309)', texto: '#fff7ed', botao: '#facc15', botaoTexto: '#3b2412', posterBg: ['#5b3410', '#a16207'], posterTexto: '#fff7ed', posterAccent: '#f59e0b', emojis: ['🍖', '🔥', '🌿', '🍺', '🥩'] },
  { id: 'hamburgueria', nome: 'Hamburgueria', bg: 'linear-gradient(135deg,#b91c1c,#f59e0b)', texto: '#fff', botao: '#facc15', botaoTexto: '#7f1d1d', posterBg: ['#991b1b', '#ea580c'], posterTexto: '#fff7ed', posterAccent: '#facc15', emojis: ['🍔', '🍟', '🥤', '🌭', '🧀'] },
  { id: 'japones', nome: 'Japonês', bg: 'linear-gradient(135deg,#111827,#7f1d1d)', texto: '#fff', botao: '#ef4444', botaoTexto: '#fff', posterBg: ['#0a0a0a', '#450a0a'], posterTexto: '#f5f5f5', posterAccent: '#ef4444', emojis: ['🍣', '🍜', '🥢', '🍱', '🐟'] },
  { id: 'pizzaria', nome: 'Pizzaria', bg: 'linear-gradient(135deg,#166534,#dc2626)', texto: '#fff', botao: '#fff', botaoTexto: '#166534', posterBg: ['#fef3c7', '#dcfce7'], posterTexto: '#14532d', posterAccent: '#dc2626', emojis: ['🍕', '🍅', '🧀', '🌿', '🍕'] },
  { id: 'cafe', nome: 'Cafeteria', bg: 'linear-gradient(135deg,#f5ede2,#c8a27c)', texto: '#3b2f22', botao: '#6f4e37', botaoTexto: '#fff', posterBg: ['#f5ede2', '#c8a27c'], posterTexto: '#3b2f22', posterAccent: '#6f4e37', emojis: ['☕', '🥐', '🍰', '🫖', '🍪'] },
  { id: 'natural', nome: 'Natural', bg: 'linear-gradient(135deg,#065f46,#10b981)', texto: '#ecfdf5', botao: '#fff', botaoTexto: '#065f46', posterBg: ['#047857', '#34d399'], posterTexto: '#ecfdf5', posterAccent: '#a7f3d0', emojis: ['🥗', '🥑', '🍃', '🥕', '🍅'] },
  { id: 'boteco', nome: 'Boteco', bg: 'linear-gradient(135deg,#78350f,#eab308)', texto: '#fffbeb', botao: '#eab308', botaoTexto: '#422006', posterBg: ['#422006', '#ca8a04'], posterTexto: '#fffbeb', posterAccent: '#fde047', emojis: ['🍺', '🍢', '🍟', '⚽', '🥜'] },
  { id: 'elegante', nome: 'Elegante', bg: 'linear-gradient(135deg,#2e1065,#7c3aed)', texto: '#f5f3ff', botao: '#fbbf24', botaoTexto: '#2e1065', posterBg: ['#2e1065', '#6d28d9'], posterTexto: '#f5f3ff', posterAccent: '#fbbf24', emojis: ['🍷', '🥂', '✨', '🍽️', '🕯️'] },
]

export function getTema(id?: string | null): QrTema {
  return QR_TEMAS.find((t) => t.id === id) ?? QR_TEMAS[0]
}

// Filtros aplicados sobre o fundo (como filtros de imagem)
export interface QrFiltro {
  id: string
  nome: string
  overlay: string // cor sobreposta (pôster/tema)
  css: string // filtro CSS (imagem de upload)
}
export const QR_FILTROS: QrFiltro[] = [
  { id: 'nenhum', nome: 'Nenhum', overlay: 'transparent', css: 'none' },
  { id: 'escurecer', nome: 'Escurecer', overlay: 'rgba(0,0,0,0.4)', css: 'brightness(0.65)' },
  { id: 'clarear', nome: 'Clarear', overlay: 'rgba(255,255,255,0.32)', css: 'brightness(1.18)' },
  { id: 'quente', nome: 'Quente', overlay: 'rgba(234,88,12,0.24)', css: 'sepia(0.4) saturate(1.4)' },
  { id: 'frio', nome: 'Frio', overlay: 'rgba(37,99,235,0.22)', css: 'saturate(1.2) hue-rotate(-15deg)' },
  { id: 'pb', nome: 'Preto e branco', overlay: 'rgba(0,0,0,0.15)', css: 'grayscale(1)' },
]
export function getFiltro(id?: string | null): QrFiltro {
  return QR_FILTROS.find((f) => f.id === id) ?? QR_FILTROS[0]
}
