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
  return `Gere um resumo executivo em Markdown para o relatório:\n${JSON.stringify(dadosRelatorio)}`
}
