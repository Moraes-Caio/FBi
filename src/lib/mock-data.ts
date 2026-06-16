export type PeriodInfo = '7d' | '30d' | '90d'

export interface CategoryScore {
  name: string
  score: number
  trend: 'up' | 'down' | 'neutral'
}

export interface FeedbackItem {
  id: string
  text: string
  categories: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  timeAgo: string
}

export interface DashboardData {
  kpis: {
    totalFeedbacks: number
    totalTrend: string
    sentiment: number
    sentimentTrend: string
    nps: number
    npsTrend: string
    criticalTheme: string
    criticalPercent: number
  }
  chartData: Array<{ date: string; sentiment: number }>
  categories: CategoryScore[]
  recentFeedbacks: FeedbackItem[]
}

export type InsightPriority = 'URGENTE' | 'IMPORTANTE' | 'OBSERVAÇÃO'

export interface InsightData {
  id: string
  priority: InsightPriority
  category: string
  title: string
  description: string
  suggestion: string
  relatedCount: number
}

export const MOCK_INSIGHTS: InsightData[] = [
  {
    id: '1',
    priority: 'URGENTE',
    category: 'Serviço',
    title: 'Tempo de espera no almoço piorou 23%',
    description:
      '12 de 34 feedbacks negativos mencionam espera acima de 20 minutos para pratos executivos na última semana. Impacto direto na satisfação de clientes recorrentes.',
    suggestion: 'Considere adicionar 1 garçom no turno do almoço',
    relatedCount: 3,
  },
  {
    id: '2',
    priority: 'IMPORTANTE',
    category: 'Comida',
    title: 'Aumento de elogios à sobremesa sazonal',
    description:
      'A torta de limão siciliano recebeu 8 menções positivas espontâneas. Clientes sugerem que ela se torne um item fixo no cardápio de verão.',
    suggestion: 'Manter item no menu e destacar em mídias sociais',
    relatedCount: 8,
  },
  {
    id: '3',
    priority: 'OBSERVAÇÃO',
    category: 'Ambiente',
    title: 'Sugestão de música ambiente mais calma',
    description:
      'Pequeno grupo de clientes (4 menções) sugeriu que o volume da música estava alto durante o jantar de terça-feira. Pode ser um caso isolado.',
    suggestion: 'Verificar checklist de som com a equipe noturna',
    relatedCount: 4,
  },
  {
    id: '4',
    priority: 'OBSERVAÇÃO',
    category: 'Comida',
    title: 'Interesse em opções sem glúten no café',
    description:
      'Houve 5 solicitações de pães ou bolos sem glúten na última quinzena. Atualmente o cardápio de café da manhã não atende essa demanda.',
    suggestion: 'Testar 2 opções de pães artesanais sem glúten',
    relatedCount: 5,
  },
]

export const MOCK_DATA: Record<PeriodInfo, DashboardData> = {
  '7d': {
    kpis: {
      totalFeedbacks: 247,
      totalTrend: '+12%',
      sentiment: 82,
      sentimentTrend: '+5%',
      nps: 67,
      npsTrend: '+3',
      criticalTheme: 'Tempo de Espera',
      criticalPercent: 34,
    },
    chartData: [
      { date: 'Seg', sentiment: 75 },
      { date: 'Ter', sentiment: 78 },
      { date: 'Qua', sentiment: 80 },
      { date: 'Qui', sentiment: 82 },
      { date: 'Sex', sentiment: 85 },
      { date: 'Sáb', sentiment: 81 },
      { date: 'Dom', sentiment: 86 },
    ],
    categories: [
      { name: 'Comida', score: 84, trend: 'up' },
      { name: 'Serviço', score: 62, trend: 'up' },
      { name: 'Atendimento', score: 55, trend: 'up' },
      { name: 'Ambiente', score: 48, trend: 'neutral' },
      { name: 'Tempo de Espera', score: 41, trend: 'down' },
      { name: 'Preço', score: 32, trend: 'up' },
    ],
    recentFeedbacks: [
      {
        id: '1',
        sentiment: 'positive',
        text: 'A massa estava perfeita e o molho muito saboroso. O ambiente continua impecável.',
        categories: ['Comida', 'Ambiente'],
        timeAgo: 'há 2h',
      },
      {
        id: '2',
        sentiment: 'negative',
        text: 'Demorou mais de 40 minutos para chegar o prato principal, mesmo com o restaurante vazio.',
        categories: ['Tempo de Espera', 'Serviço'],
        timeAgo: 'há 4h',
      },
      {
        id: '3',
        sentiment: 'positive',
        text: 'O garçom Ricardo foi extremamente atencioso. Voltaremos com certeza pelo atendimento.',
        categories: ['Atendimento'],
        timeAgo: 'há 5h',
      },
      {
        id: '4',
        sentiment: 'positive',
        text: 'Melhor custo-benefício da região para o almoço executivo.',
        categories: ['Preço'],
        timeAgo: 'há 7h',
      },
      {
        id: '5',
        sentiment: 'neutral',
        text: 'O ar condicionado estava um pouco forte demais, mas a comida estava ok.',
        categories: ['Ambiente'],
        timeAgo: 'Ontem',
      },
    ],
  },
  '30d': {
    kpis: {
      totalFeedbacks: 1054,
      totalTrend: '+8%',
      sentiment: 78,
      sentimentTrend: '-2%',
      nps: 62,
      npsTrend: '-1',
      criticalTheme: 'Preço',
      criticalPercent: 28,
    },
    chartData: [
      { date: 'Sem 1', sentiment: 79 },
      { date: 'Sem 2', sentiment: 76 },
      { date: 'Sem 3', sentiment: 75 },
      { date: 'Sem 4', sentiment: 80 },
    ],
    categories: [
      { name: 'Comida', score: 81, trend: 'up' },
      { name: 'Serviço', score: 65, trend: 'neutral' },
      { name: 'Atendimento', score: 58, trend: 'down' },
      { name: 'Ambiente', score: 50, trend: 'up' },
      { name: 'Tempo de Espera', score: 45, trend: 'down' },
      { name: 'Preço', score: 25, trend: 'down' },
    ],
    recentFeedbacks: [
      {
        id: '1',
        sentiment: 'positive',
        text: 'Sempre uma ótima experiência.',
        categories: ['Geral'],
        timeAgo: 'há 1 dia',
      },
      {
        id: '2',
        sentiment: 'negative',
        text: 'Achei os pratos muito caros para o tamanho da porção.',
        categories: ['Preço', 'Comida'],
        timeAgo: 'há 2 dias',
      },
    ],
  },
  '90d': {
    kpis: {
      totalFeedbacks: 3205,
      totalTrend: '+15%',
      sentiment: 85,
      sentimentTrend: '+8%',
      nps: 71,
      npsTrend: '+5',
      criticalTheme: 'Serviço',
      criticalPercent: 15,
    },
    chartData: [
      { date: 'Mês 1', sentiment: 72 },
      { date: 'Mês 2', sentiment: 80 },
      { date: 'Mês 3', sentiment: 88 },
    ],
    categories: [
      { name: 'Comida', score: 88, trend: 'up' },
      { name: 'Serviço', score: 72, trend: 'up' },
      { name: 'Atendimento', score: 65, trend: 'up' },
      { name: 'Ambiente', score: 55, trend: 'up' },
      { name: 'Tempo de Espera', score: 50, trend: 'up' },
      { name: 'Preço', score: 40, trend: 'up' },
    ],
    recentFeedbacks: [
      {
        id: '1',
        sentiment: 'positive',
        text: 'Melhorou muito nos últimos meses.',
        categories: ['Serviço'],
        timeAgo: 'há 1 semana',
      },
    ],
  },
}

export type ActionPriority = 'URGENTE' | 'IMPORTANTE' | 'NORMAL'
export type ActionStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'

export interface ActionTask {
  id: string
  title: string
  priority: ActionPriority
  source: string
  responsible: string
  date: string
  status: ActionStatus
  progress?: number
}

export const MOCK_ACTION_TASKS: ActionTask[] = [
  {
    id: '1',
    title: 'Reforçar equipe no almoço de domingo',
    priority: 'URGENTE',
    source: 'Feedback #47',
    responsible: 'Mariana L.',
    date: '24 Jan',
    status: 'PENDENTE',
  },
  {
    id: '2',
    title: 'Investigar problemas de temperatura na pizza',
    priority: 'IMPORTANTE',
    source: 'Insight: Qualidade Comida',
    responsible: 'Carlos Chef',
    date: '25 Jan',
    status: 'PENDENTE',
  },
  {
    id: '3',
    title: 'Atualizar menu QR Code com novos preços',
    priority: 'NORMAL',
    source: 'Operacional',
    responsible: 'Ana Paula',
    date: '28 Jan',
    status: 'PENDENTE',
  },
  {
    id: '4',
    title: 'Treinamento de atendimento cordial',
    priority: 'IMPORTANTE',
    source: 'Insight: Tempo de espera',
    responsible: 'Carlos Silva',
    date: '22 Jan',
    status: 'EM_ANDAMENTO',
    progress: 65,
  },
  {
    id: '5',
    title: 'Revisão de fornecedor de vegetais',
    priority: 'NORMAL',
    source: 'Feedback #52',
    responsible: 'Jorge M.',
    date: '26 Jan',
    status: 'EM_ANDAMENTO',
    progress: 30,
  },
  {
    id: '6',
    title: 'Conserto de ar condicionado salão sul',
    priority: 'NORMAL',
    source: 'Manutenção',
    responsible: 'Carlos Silva',
    date: '20 Jan',
    status: 'CONCLUIDO',
  },
]
