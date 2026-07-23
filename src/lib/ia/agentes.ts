import { enviarMensagem, enviarMensagemComFontes } from '@/lib/openrouter'
import { CAMPOS_CONFIG } from '@/lib/queries/config-update'
import { AcaoAgente, FormularioIA, validarAcao } from '@/lib/queries/agente-ia'

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
// 2. AGENTE PLANEJADOR — decide quem do time precisa trabalhar
// ─────────────────────────────────────────────────────────────────────────────

export interface Plano {
  /** Consultar a internet (dados que mudam com o tempo) */
  pesquisarWeb: boolean
  /** Termos de busca escolhidos pelo próprio planejador */
  termosWeb: string
  /** Página específica para abrir (quando o dono manda um link) */
  urlParaLer: string
  /** Consultar os materiais de treinamento (RAG) */
  consultarConhecimento: boolean
  /** Pergunta reescrita para a busca vetorial render mais */
  consultaConhecimento: string
}

const PLANO_VAZIO: Plano = {
  pesquisarWeb: false,
  termosWeb: '',
  urlParaLer: '',
  consultarConhecimento: false,
  consultaConhecimento: '',
}

/**
 * Roda uma vez por mensagem e diz quais fontes externas valem a pena.
 * Antes isso era feito pelo próprio redator, com marcadores no meio da
 * resposta — custava uma chamada inteira a mais e falhava com frequência.
 */
export async function planejar(mensagem: string, temArquivos: boolean): Promise<Plano> {
  if (!mensagem.trim()) return PLANO_VAZIO
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Você planeja o trabalho de um assistente de restaurante. Não responda ao dono,
apenas diga que fontes precisam ser consultadas.

Mensagem do dono: "${mensagem}"
${temArquivos ? 'Ele anexou arquivos nesta mensagem (já serão lidos por outro agente).' : ''}

Responda APENAS com este JSON:
{ "pesquisarWeb": true|false,
  "termosWeb": "termos de busca, como você digitaria no Google",
  "urlParaLer": "endereço completo, se ele mandou um link ou citou um site",
  "consultarConhecimento": true|false,
  "consultaConhecimento": "pergunta reescrita para buscar nos materiais" }

pesquisarWeb = true quando a resposta depende de algo que muda com o tempo ou está
fora do restaurante: leis e normas, preços, fornecedores, concorrentes, tendências,
notícias, datas, ferramentas, empresas, receitas.

consultarConhecimento = true quando o assunto pode estar em manuais e cartilhas do
setor: higiene e vigilância sanitária, custos e CMV, cardápio, atendimento, estoque,
precificação, marketing, obrigações legais, indicadores.

Ambos podem ser true, mas o padrão é FALSE nos dois. Só marque true quando a
resposta realmente depender daquela fonte.

EXEMPLOS (siga à risca):
"como estão minhas avaliações?" -> tudo false (é dado do próprio painel)
"quantas mesas eu tenho?" -> tudo false (está na configuração)
"crie uma ação de reparar as mesas" -> tudo false (é só executar um pedido)
"resumo das reclamações" -> tudo false (são os dados dele)
"posso descongelar carne na pia?" -> consultarConhecimento true (norma sanitária)
"meu CMV está alto, o que faço?" -> consultarConhecimento true (gestão de custos)
"quanto está a arroba do boi?" -> pesquisarWeb true (preço muda todo dia)
"o que tem no site X" -> urlParaLer com o endereço`,
        },
        { role: 'user', content: 'Planeje e responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 250 },
    )
    const d = parse(res)
    if (!d) return PLANO_VAZIO
    return {
      pesquisarWeb: !!d.pesquisarWeb,
      termosWeb: String(d.termosWeb || '').trim(),
      urlParaLer: String(d.urlParaLer || '').trim(),
      consultarConhecimento: !!d.consultarConhecimento,
      consultaConhecimento: String(d.consultaConhecimento || mensagem).trim(),
    }
  } catch {
    return PLANO_VAZIO
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AGENTE DE PESQUISA — sem memória
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoPesquisa {
  resumo: string
  fontes: { url: string; titulo: string }[]
}

/**
 * Pesquisa e devolve os FATOS apurados, não a resposta final. Quem conversa
 * com o dono é o redator — assim a voz do assistente não muda.
 */
export async function pesquisarNaWeb(termos: string): Promise<ResultadoPesquisa | null> {
  if (!termos.trim()) return null
  try {
    const { texto, fontes } = await enviarMensagemComFontes(
      [
        {
          role: 'system',
          content: `Pesquise e relate os fatos encontrados sobre o tema pedido, em português do Brasil.
Escreva em tópicos curtos e objetivos, com números e datas quando houver.
Não converse, não cumprimente, não dê conselhos: só os fatos apurados.
Se não encontrar nada confiável, diga isso em uma linha.`,
        },
        { role: 'user', content: termos },
      ],
      { web: true, max_tokens: 700, temperature: 0 },
    )
    return { resumo: texto, fontes }
  } catch {
    return null
  }
}

/** Lê uma página específica e resume — reaproveita o agente de documentos. */
export async function lerPaginaWeb(
  url: string,
  buscarPagina: (u: string) => Promise<{ ok: boolean; titulo?: string; texto?: string; motivo?: string }>,
): Promise<ResultadoPesquisa | null> {
  try {
    const pagina = await buscarPagina(url)
    if (!pagina.ok || !pagina.texto) return null
    const analise = await analisarDocumentos([{ nome: pagina.titulo || url, texto: pagina.texto }])
    if (!analise.length) return null
    const a = analise[0]
    return {
      resumo: `${a.resumo}\n${a.pontos.map((p) => `- ${p}`).join('\n')}`,
      fontes: [{ url, titulo: pagina.titulo || url }],
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AGENTE DE CONHECIMENTO — sem memória
// ─────────────────────────────────────────────────────────────────────────────

export interface TrechoConhecimento {
  conteudo: string
  titulo: string
}

/**
 * A busca vetorial traz trechos aproximados, e vários não servem. Este agente
 * lê o que voltou e fica só com o que responde de fato — antes, trechos fora
 * do assunto iam direto para o prompt e atrapalhavam a resposta.
 */
export async function curarConhecimento(
  pergunta: string,
  trechos: TrechoConhecimento[],
): Promise<string> {
  if (!trechos.length) return ''
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Você seleciona material de apoio. A busca trouxe trechos por semelhança e
alguns não têm relação com a pergunta.

Pergunta: "${pergunta}"

Trechos:
${trechos.map((t, i) => `[${i}] (${t.titulo})\n${t.conteudo}`).join('\n\n')}

Responda APENAS com este JSON:
{ "uteis": [índices dos trechos que realmente ajudam a responder, do melhor para o pior] }

Seja rigoroso: se um trecho é só vagamente parecido, deixe de fora.
Se nenhum servir, devolva { "uteis": [] }.`,
        },
        { role: 'user', content: 'Selecione e responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 150 },
    )
    const d = parse(res)
    const indices: number[] = Array.isArray(d?.uteis) ? d.uteis : []
    const escolhidos = indices
      .map((i) => trechos[i])
      .filter(Boolean)
      .slice(0, 4)
    if (!escolhidos.length) return ''
    return escolhidos
      .map((t, i) => `[${i + 1}] (${t.titulo})\n"${t.conteudo}"`)
      .join('\n\n')
  } catch {
    // Sem curadoria, é melhor mandar os melhores do que não mandar nada
    return trechos
      .slice(0, 3)
      .map((t, i) => `[${i + 1}] (${t.titulo})\n"${t.conteudo}"`)
      .join('\n\n')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AGENTE ROTEADOR — memória curta
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
// 6. AGENTES ESCRITORES — sem memória de conversa
// ─────────────────────────────────────────────────────────────────────────────

/** Monta os campos de uma ação nova a partir do pedido. */
export async function montarAcao(pedido: string): Promise<AcaoAgente | null> {
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Você monta os campos de UMA ação operacional de restaurante. Só isso.
Assunto da ação: "${pedido}"

JSON: { "titulo_acao": "curto, direto ao ponto do assunto",
"plano_detalhado": "passos práticos para resolver ESSE assunto",
"prioridade": "URGENTE|IMPORTANTE|OBSERVACAO", "categoria": "Servico|Comida|Ambiente|Preco|Agilidade|Geral",
"status": "PENDENTE" }

Fique estritamente no assunto acima — não invente outro tema nem fale do sistema/chat.
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

/**
 * Agente de UMA tarefa: existe um assunto concreto no pedido de criar?
 * Separado da montagem para não inventar assunto quando não há (era o que
 * fazia a IA criar "ação sobre formulários" a partir de um pedido meta).
 */
export async function extrairAssunto(
  tipo: 'acao' | 'insight',
  pedido: string,
): Promise<{ temAssunto: boolean; assunto: string }> {
  try {
    const alvo = tipo === 'acao' ? 'uma AÇÃO operacional' : 'um INSIGHT'
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `O dono pediu para criar ${alvo}. Sua única tarefa: dizer se o pedido já
contém um ASSUNTO CONCRETO — um problema, tarefa ou tema real do restaurante.

Pedido: "${pedido}"

Responda APENAS com este JSON:
{ "temAssunto": true|false, "assunto": "o tema, em poucas palavras" }

temAssunto = false quando o pedido:
- é genérico ("crie uma ação", "cria um insight", "faz uma tarefa");
- é meta ou sobre o próprio sistema ("faça aparecer o formulário", "me mostra um exemplo");
- não descreve nada concreto do restaurante.

NUNCA invente um assunto. Se não houver um assunto real e específico no pedido,
temAssunto é false e "assunto" fica vazio.`,
        },
        { role: 'user', content: 'Responda no formato JSON pedido.' },
      ],
      { ...JSON_OPTS, max_tokens: 120 },
    )
    const d = parse(res)
    const assunto = String(d?.assunto || '').trim()
    return { temAssunto: !!d?.temAssunto && assunto.length > 2, assunto }
  } catch {
    return { temAssunto: false, assunto: '' }
  }
}

/**
 * Formulários de criação são FIXOS — sem IA. Perguntar sempre a mesma coisa é
 * mais confiável e não custa chamada. Campo aberto para o assunto; alternativas
 * quando o valor é de um conjunto conhecido (prioridade).
 */
export const FORM_CRIAR_ACAO: FormularioIA & { acao_pretendida: string } = {
  titulo: 'Vamos criar a ação. Me conta:',
  acao_pretendida: 'criar_acao',
  campos: [
    { nome: 'assunto', label: 'O que precisa ser feito?', tipo: 'texto', obrigatorio: true },
    {
      nome: 'prioridade',
      label: 'Qual a prioridade?',
      tipo: 'escolha',
      opcoes: ['Urgente', 'Importante', 'Observação'],
      obrigatorio: false,
    },
  ],
}

export const FORM_CRIAR_INSIGHT: FormularioIA & { acao_pretendida: string } = {
  titulo: 'Vamos criar o insight. Me conta:',
  acao_pretendida: 'criar_insight',
  campos: [{ nome: 'assunto', label: 'Sobre o que é o insight?', tipo: 'texto', obrigatorio: true }],
}

/** Monta os campos de um insight novo. */
export async function montarInsight(pedido: string): Promise<AcaoAgente | null> {
  try {
    const res = await enviarMensagem(
      [
        {
          role: 'system',
          content: `Você monta os campos de UM insight de restaurante. Só isso.
Assunto do insight: "${pedido}"

JSON: { "titulo": "curto, sobre ESSE assunto", "descricao": "o que foi observado",
"sugestao": "o que fazer", "prioridade": "URGENTE|IMPORTANTE|OBSERVACAO",
"categoria": "Servico|Comida|Ambiente|Preco|Agilidade|Geral" }

Fique estritamente no assunto acima — não invente outro tema nem fale do sistema/chat.
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
// 7. COORDENADOR — junta o time
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
): Promise<{ acao: AcaoAgente | null; formulario: (FormularioIA & { acao_pretendida?: string }) | null }> {
  const so = (acao: AcaoAgente | null) => ({ acao, formulario: null })
  const { dominio, operacao } = await rotearPedido(mensagem, ultimaResposta)
  if (dominio === 'conversa' || operacao === 'nenhuma') {
    // Mesmo em "conversa", uma afirmação pode mudar o perfil ("agora são 30 mesas")
    return so(dominio === 'config' ? await montarConfig(mensagem, ctx.configAtual) : null)
  }

  // Criar: um agente decide se há assunto; se não, mostra o formulário fixo
  if ((dominio === 'acao' || dominio === 'insight') && operacao === 'criar') {
    const { temAssunto, assunto } = await extrairAssunto(dominio, mensagem)
    if (!temAssunto) {
      return { acao: null, formulario: dominio === 'acao' ? FORM_CRIAR_ACAO : FORM_CRIAR_INSIGHT }
    }
    const pedido = assunto || mensagem
    return so(dominio === 'acao' ? await montarAcao(pedido) : await montarInsight(pedido))
  }

  switch (dominio) {
    case 'acao':
      return so(await montarEdicao(mensagem, 'acao', operacao === 'excluir' ? 'excluir' : 'editar', ctx.acoes))
    case 'insight':
      return so(await montarEdicao(mensagem, 'insight', operacao === 'excluir' ? 'excluir' : 'editar', ctx.insights))
    case 'config':
      return so(await montarConfig(mensagem, ctx.configAtual))
    case 'anotacao':
      return so(
        operacao === 'criar'
          ? {
              tipo: 'criar_anotacao',
              dados: { fato: mensagem.slice(0, 300), categoria: 'geral' },
              descricao: 'Guardar esta informação',
            }
          : null,
      )
    default:
      return so(null)
  }
}
