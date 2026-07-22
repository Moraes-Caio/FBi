import { enviarMensagem } from '@/lib/openrouter'
import { CAMPOS_CONFIG } from '@/lib/queries/config-update'
import { AcaoAgente, validarAcao } from '@/lib/queries/agente-ia'

/**
 * Time de agentes especializados.
 *
 * A ideia central: um único prompt gigante tentando fazer tudo erra muito —
 * foi o que aconteceu com a leitura de arquivos e com a detecção de alterações.
 * Aqui cada agente tem UMA responsabilidade, e só recebe o que precisa.
 *
 * MEMÓRIA (o que cada um enxerga):
 * - Documentos e Rotulador: SEM memória. Recebem só o material da vez, então
 *   não têm como confundir com arquivos ou assuntos de mensagens anteriores.
 * - Roteador: memória curta (a mensagem e a última resposta).
 * - Escritores (ação/insight/config): SEM memória de conversa; recebem o pedido
 *   e o estado atual do sistema.
 * - Redator final: COM memória (fica no use-chat, é quem conversa).
 */

const JSON_OPTS = { response_format: { type: 'json_object' as const }, temperature: 0 }

function parse(res: unknown): any {
  try {
    return typeof res === 'string' ? JSON.parse(res.replace(/^```(?:json)?|```$/g, '').trim()) : res
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AGENTE DE DOCUMENTOS — sem memória
// ─────────────────────────────────────────────────────────────────────────────

export interface AnaliseArquivo {
  nome: string
  tipo: string
  resumo: string
  pontos: string[]
  /** Marca quando a leitura falhou, para o redator não inventar. */
  erro?: string
}

/**
 * Lê UM arquivo isolado. Sem histórico, sem outros arquivos no contexto —
 * é isso que impede a IA de misturar com o que veio antes.
 */
async function analisarUm(nome: string, texto: string): Promise<AnaliseArquivo> {
  const base: AnaliseArquivo = { nome, tipo: 'documento', resumo: '', pontos: [] }
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Você lê UM documento e resume o conteúdo dele. Você não tem histórico de
conversa e não conhece nenhum outro arquivo: descreva SOMENTE o que está no texto abaixo.

Nome do arquivo: "${nome}"

Conteúdo:
"""
${texto.slice(0, 18000)}
"""

Responda APENAS com este JSON:
{ "tipo": "que tipo de documento é (relatório, cardápio, contrato, manual...)",
  "resumo": "2 a 4 frases sobre o que este documento contém",
  "pontos": ["fato concreto 1", "fato concreto 2", "fato concreto 3"] }

Os "pontos" devem trazer números, nomes e datas que estejam no texto. Máximo 6.
Não invente nada que não esteja no documento. Português do Brasil.`,
        },
        { role: 'user', content: 'Analise e responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 800 },
    )
    const d = parse(res)
    if (!d) return { ...base, erro: 'não consegui interpretar o conteúdo' }
    return {
      nome,
      tipo: String(d.tipo || 'documento'),
      resumo: String(d.resumo || ''),
      pontos: Array.isArray(d.pontos) ? d.pontos.map(String).slice(0, 6) : [],
    }
  } catch (e: any) {
    return { ...base, erro: e?.message || 'falha ao ler' }
  }
}

/** Analisa vários arquivos em paralelo, cada um isolado do outro. */
export async function analisarDocumentos(
  arquivos: { nome: string; texto?: string }[],
): Promise<AnaliseArquivo[]> {
  const comTexto = arquivos.filter((a) => (a.texto || '').trim().length > 20)
  if (!comTexto.length) return []
  return Promise.all(comTexto.map((a) => analisarUm(a.nome, a.texto!)))
}

/** Monta o bloco de contexto com as análises — separadas e identificadas. */
export function blocoDeAnalises(
  atuais: AnaliseArquivo[],
  anteriores: AnaliseArquivo[],
): string {
  const formatar = (a: AnaliseArquivo) =>
    a.erro
      ? `• ${a.nome}: não foi possível ler (${a.erro})`
      : `• ${a.nome} (${a.tipo})\n  ${a.resumo}\n${a.pontos.map((p) => `  - ${p}`).join('\n')}`

  let txt = ''
  if (atuais.length) {
    txt += `ARQUIVOS DESTA MENSAGEM (é sobre estes que o dono está falando agora):\n${atuais
      .map(formatar)
      .join('\n\n')}`
  }
  if (anteriores.length) {
    txt += `${txt ? '\n\n' : ''}ARQUIVOS DE MENSAGENS ANTERIORES (só use se ele pedir explicitamente, citando o nome):\n${anteriores
      .map((a) => `• ${a.nome} (${a.tipo}) — ${a.resumo}`)
      .join('\n')}`
  }
  if (txt) {
    txt += `\n\nREGRAS: cada arquivo é independente, não misture o conteúdo de um com o do
outro. Ao citar uma informação, diga de qual arquivo ela veio. Se o dono não citar
um arquivo antigo, responda apenas sobre os desta mensagem.`
  }
  return txt
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AGENTE ROTEADOR — memória curta
// ─────────────────────────────────────────────────────────────────────────────

export type Dominio = 'conversa' | 'acao' | 'insight' | 'config' | 'anotacao'

/**
 * Decide de que assunto é o pedido. Barato e curto — evita chamar os
 * escritores à toa e reduz o erro de um prompt único decidindo tudo.
 */
export async function rotearPedido(
  mensagem: string,
  ultimaResposta: string,
): Promise<{ dominio: Dominio; operacao: 'criar' | 'editar' | 'excluir' | 'nenhuma' }> {
  const padrao = { dominio: 'conversa' as Dominio, operacao: 'nenhuma' as const }
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Classifique o que o dono do restaurante quer. Não execute nada, só classifique.

Dono disse: "${mensagem}"
Assistente respondeu: "${ultimaResposta.slice(0, 400)}"

Responda APENAS com este JSON:
{ "dominio": "conversa|acao|insight|config|anotacao",
  "operacao": "criar|editar|excluir|nenhuma" }

- "acao": plano/tarefa operacional do restaurante.
- "insight": padrão ou observação sobre os feedbacks.
- "config": dado do perfil (mesas, horário, nome, cozinha, ticket, público...).
- "anotacao": um fato para lembrar depois.
- "conversa": pergunta, opinião, análise, bate-papo. Use "nenhuma" na operação.

Arquivar, desativar, remover, tirar ou apagar = operação "excluir" (nunca "editar").
Se ele só perguntou ou comentou, é "conversa" + "nenhuma".`,
        },
        { role: 'user', content: 'Classifique no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 120 },
    )
    const d = parse(res)
    const dominios: Dominio[] = ['conversa', 'acao', 'insight', 'config', 'anotacao']
    const ops = ['criar', 'editar', 'excluir', 'nenhuma']
    if (!d || !dominios.includes(d.dominio)) return padrao
    return {
      dominio: d.dominio,
      operacao: ops.includes(d.operacao) ? d.operacao : 'nenhuma',
    }
  } catch {
    return padrao
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AGENTES ESCRITORES — sem memória de conversa
// ─────────────────────────────────────────────────────────────────────────────

/** Monta os campos de uma ação nova a partir do pedido. */
export async function montarAcao(pedido: string): Promise<AcaoAgente | null> {
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `O dono pediu uma AÇÃO operacional. Monte os campos.
Pedido: "${pedido}"

JSON: { "titulo_acao": "...", "plano_detalhado": "passos práticos",
"prioridade": "URGENTE|IMPORTANTE|OBSERVACAO", "categoria": "Servico|Comida|Ambiente|Preco|Agilidade|Geral",
"status": "PENDENTE" }

Sem prioridade dita, use IMPORTANTE. Português do Brasil. Nunca deixe campo vazio.`,
        },
        { role: 'user', content: 'Monte no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 500 },
    )
    const d = parse(res)
    if (!d?.titulo_acao) return null
    const a: AcaoAgente = {
      tipo: 'criar_acao',
      dados: d,
      descricao: `Criar a ação "${d.titulo_acao}"`,
    }
    return validarAcao(a) ? null : a
  } catch {
    return null
  }
}

/** Monta os campos de um insight novo. */
export async function montarInsight(pedido: string): Promise<AcaoAgente | null> {
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `O dono pediu um INSIGHT. Monte os campos.
Pedido: "${pedido}"

JSON: { "titulo": "...", "descricao": "o que foi observado", "sugestao": "o que fazer",
"prioridade": "URGENTE|IMPORTANTE|OBSERVACAO", "categoria": "Servico|Comida|Ambiente|Preco|Agilidade|Geral" }

Sem prioridade dita, use IMPORTANTE. Português do Brasil. Nunca deixe campo vazio.`,
        },
        { role: 'user', content: 'Monte no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 500 },
    )
    const d = parse(res)
    if (!d?.titulo) return null
    const a: AcaoAgente = {
      tipo: 'criar_insight',
      dados: d,
      descricao: `Criar o insight "${d.titulo}"`,
    }
    return validarAcao(a) ? null : a
  } catch {
    return null
  }
}

/** Decide campo + valor de uma mudança no perfil. */
export async function montarConfig(
  pedido: string,
  configAtual: Record<string, unknown>,
): Promise<AcaoAgente | null> {
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `O dono disse algo que pode mudar um dado do perfil.

Campos (chave = significado):
${Object.entries(CAMPOS_CONFIG).map(([k, v]) => `- ${k} = ${v}`).join('\n')}

Valores atuais: ${JSON.stringify(configAtual)}
Frase dele: "${pedido}"

JSON: { "campo": "<chave exata ou null>", "valor": "<novo valor>" }

Devolva o campo quando ele informar ou mandar mudar um valor.
Devolva null se for pergunta, ou se o valor for igual ao atual, ou se nada corresponder.`,
        },
        { role: 'user', content: 'Responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 200 },
    )
    const d = parse(res)
    if (!d?.campo || !String(d.valor ?? '').trim()) return null
    const a: AcaoAgente = {
      tipo: 'atualizar_config',
      dados: { campo: d.campo, valor: String(d.valor).trim() },
      descricao: `Atualizar ${CAMPOS_CONFIG[d.campo] || d.campo} para "${String(d.valor).trim()}"`,
    }
    return validarAcao(a) ? null : a
  } catch {
    return null
  }
}

/** Escolhe qual item existente alterar e o que mudar nele. */
export async function montarEdicao(
  pedido: string,
  alvo: 'acao' | 'insight',
  operacao: 'editar' | 'excluir',
  itens: Array<Record<string, any>>,
): Promise<AcaoAgente | null> {
  if (!itens.length) return null
  try {
    const campos =
      alvo === 'acao'
        ? '"titulo_acao", "plano_detalhado", "prioridade", "categoria", "status" (SUGERIDA|PENDENTE|EM_ANDAMENTO|CONCLUIDO)'
        : '"titulo", "descricao", "sugestao", "prioridade", "categoria"'
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `O dono quer ${operacao === 'excluir' ? 'REMOVER' : 'ALTERAR'} ${alvo === 'acao' ? 'uma ação' : 'um insight'}.

Itens existentes: ${JSON.stringify(itens)}
Pedido dele: "${pedido}"

JSON: ${
            operacao === 'excluir'
              ? '{ "id": "<id exato da lista, ou null>" }'
              : `{ "id": "<id exato da lista, ou null>", "campos": { ...só o que muda } }
Campos possíveis: ${campos}`
          }

Use o id EXATO de um item da lista. Se nenhum corresponder ao pedido, devolva id null.
${alvo === 'insight' ? 'Insight não tem status: arquivar/desativar é remoção.' : ''}`,
        },
        { role: 'user', content: 'Responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 400 },
    )
    const d = parse(res)
    if (!d?.id) return null

    const item = itens.find((i) => String(i.id) === String(d.id))
    const rotulo = item?.titulo_acao || item?.titulo || 'item'

    if (operacao === 'excluir') {
      const a: AcaoAgente = {
        tipo: alvo === 'acao' ? 'excluir_acao' : 'excluir_insight',
        dados: { id: d.id },
        descricao: `${alvo === 'acao' ? 'Excluir a ação' : 'Arquivar o insight'} "${rotulo}"`,
      }
      return validarAcao(a) ? null : a
    }

    const camposMudados = d.campos && typeof d.campos === 'object' ? d.campos : null
    if (!camposMudados || !Object.keys(camposMudados).length) return null
    const a: AcaoAgente = {
      tipo: alvo === 'acao' ? 'editar_acao' : 'editar_insight',
      dados: { id: d.id, ...camposMudados },
      descricao: `Alterar ${alvo === 'acao' ? 'a ação' : 'o insight'} "${rotulo}"`,
    }
    return validarAcao(a) ? null : a
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COORDENADOR — junta o time
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextoAgente {
  configAtual: Record<string, unknown>
  acoes: Array<Record<string, any>>
  insights: Array<Record<string, any>>
}

/**
 * Roteia o pedido para o especialista certo e devolve a alteração pronta.
 * Cada agente vê só a sua fatia — nenhum recebe a conversa inteira.
 */
export async function decidirAlteracao(
  mensagem: string,
  ultimaResposta: string,
  ctx: ContextoAgente,
): Promise<AcaoAgente | null> {
  const { dominio, operacao } = await rotearPedido(mensagem, ultimaResposta)
  if (dominio === 'conversa' || operacao === 'nenhuma') {
    // Mesmo em "conversa", uma afirmação pode mudar o perfil ("agora são 30 mesas")
    return dominio === 'config' ? montarConfig(mensagem, ctx.configAtual) : null
  }

  switch (dominio) {
    case 'acao':
      return operacao === 'criar'
        ? montarAcao(mensagem)
        : montarEdicao(mensagem, 'acao', operacao === 'excluir' ? 'excluir' : 'editar', ctx.acoes)
    case 'insight':
      return operacao === 'criar'
        ? montarInsight(mensagem)
        : montarEdicao(mensagem, 'insight', operacao === 'excluir' ? 'excluir' : 'editar', ctx.insights)
    case 'config':
      return montarConfig(mensagem, ctx.configAtual)
    case 'anotacao':
      return operacao === 'criar'
        ? {
            tipo: 'criar_anotacao',
            dados: { fato: mensagem.slice(0, 300), categoria: 'geral' },
            descricao: 'Guardar esta informação',
          }
        : null
    default:
      return null
  }
}
