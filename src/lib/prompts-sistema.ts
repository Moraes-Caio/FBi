import { getPersonalidadePrompt } from './mascote-config'

export function construirSystemPromptChef(mascoteConfig: any, contextoDados?: any) {
  const nome = mascoteConfig?.nome || 'Chef Pepê'
  // 'profissional_amigavel' não existe no mapa de personalidades — o padrão real é 'direto_objetivo'
  const personalidade = getPersonalidadePrompt(mascoteConfig?.personalidade || 'direto_objetivo')

  let prompt = `Você é o ${nome}, um assistente virtual especialista em gestão e operação de restaurantes.\nSua personalidade: ${personalidade}\n\nResponda sempre em Markdown. Seja objetivo.`

  if (contextoDados) {
    prompt += `\n\nContexto de Dados Atuais:\n${JSON.stringify(contextoDados, null, 2)}`
  }

  return prompt
}

export function construirSystemPromptInsights(feedbacks: any[], config: any) {
  return `Analise os feedbacks e gere insights. Priorize riscos sanitários ou de segurança sempre como URGENTE, independente do volume.\nFeedbacks:\n${JSON.stringify(feedbacks)}\nConfig:\n${JSON.stringify(config)}`
}

export function construirSystemPromptAcoes(insights: any[], config: any) {
  return `Sugira ações operacionais baseadas nestes insights. Nunca sugira ação para feedback único. Sempre inclua um plano detalhado norteador.\nInsights:\n${JSON.stringify(insights)}\nConfig:\n${JSON.stringify(config)}`
}

export function construirSystemPromptBanner(feedbacksUltimas24h: any[]) {
  return `Gere um texto curto para um banner baseado nestes feedbacks recentes:\n${JSON.stringify(feedbacksUltimas24h)}`
}

/**
 * Pede à IA a análise do relatório em JSON, campo a campo, para o PDF encaixar
 * cada frase/parágrafo no seu lugar do template (em vez de um bloco solto).
 */
export function construirSystemPromptRelatorioEstruturado(dadosRelatorio: any) {
  return `Você é um consultor de restaurantes escrevendo a análise do relatório mensal
para o DONO do restaurante (não é analista de dados). Português do Brasil, tom
profissional porém direto, sem enrolação.

Responda APENAS com um JSON válido neste formato exato:
{
  "titulo": "manchete de no máximo 60 caracteres resumindo o período",
  "resumo": "2 a 4 frases: como foi o período em volume e satisfação, e o que puxou o resultado",
  "ponto_forte": "1 frase sobre o que os clientes mais elogiaram",
  "ponto_fraco": "1 frase sobre o que mais incomodou os clientes",
  "leitura_categorias": "1 a 2 frases interpretando a satisfação por categoria",
  "leitura_clientes": "1 a 2 frases sobre volume de clientes e recorrência",
  "recomendacoes": ["ação concreta 1", "ação concreta 2", "ação concreta 3"],
  "alerta_amostra": "se houver menos de 10 avaliações, uma frase avisando que a leitura é preliminar; senão string vazia"
}

REGRAS OBRIGATÓRIAS:
- Nunca invente número. Use SOMENTE os dados abaixo. Se algo não existir, não cite.
- Proibido jargão: não escreva "NPS", "CSAT", "score", "sentimento", "churn", "amostra estatística".
- Diga satisfação como "X de 100".
- NÃO compare com o período anterior se "prevConfiavel" for false — nesse caso a base
  de comparação é pequena demais e a variação enganaria o dono.
- As recomendações devem ser executáveis por um restaurante nesta semana
  (ex: "revisar a temperatura das sobremesas antes de servir"), nunca genéricas
  como "melhorar o atendimento".
- Se só existir uma faixa de horário ou um único dia com avaliações, não afirme que
  ele é o "melhor" ou o "pior" — não há comparação possível.
- Cite trechos reais dos clientes quando ajudar a justificar o ponto forte/fraco.

DADOS DO PERÍODO:
${JSON.stringify(dadosRelatorio)}`
}

export function construirSystemPromptResumoExecutivo(dadosRelatorio: any) {
  return `Você escreve o resumo executivo do relatório de um restaurante, lido pelo DONO
(não é analista de dados). Escreva em português do Brasil, direto e prático.

REGRAS:
- Texto corrido, 3 a 5 frases curtas. SEM markdown, SEM títulos, SEM bullets, SEM emojis.
- Nunca invente número: use apenas os dados abaixo. Se um dado não existir, não cite.
- Nada de jargão (não use "NPS", "CSAT", "sentimento", "score", "churn").
- Diga o índice de satisfação como "X de 100".
- Estrutura: (1) como foi o período em volume e satisfação; (2) o que mais pesou
  positivo e negativo; (3) UMA recomendação concreta e acionável para as próximas semanas.
- Se o total de avaliações for pequeno (menos de 10), diga explicitamente que a amostra
  ainda é pequena e que a leitura é preliminar.

DADOS DO PERÍODO:
${JSON.stringify(dadosRelatorio)}`
}
