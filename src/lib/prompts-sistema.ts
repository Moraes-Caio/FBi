import { getPersonalidadePrompt } from './mascote-config'

export function construirSystemPromptChef(mascoteConfig: any, contextoDados?: any) {
  const nome = mascoteConfig?.nome || 'Chef Pepê'
  const personalidade = getPersonalidadePrompt(
    mascoteConfig?.personalidade || 'profissional_amigavel',
  )

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
