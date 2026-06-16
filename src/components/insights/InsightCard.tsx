import { Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface InsightCardProps {
  insight: any
  onCreateTask: () => void
  onAiChat: () => void
}

const priorityConfig: Record<string, any> = {
  URGENTE: { bg: 'bg-[#FEF2F2]', text: 'text-[#EF4444]', label: 'URGENTE' },
  IMPORTANTE: { bg: 'bg-[#FFF7ED]', text: 'text-[#F59E0B]', label: 'IMPORTANTE' },
  OBSERVAÇÃO: { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', label: 'OBSERVAÇÃO' },
  OBSERVACAO: { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', label: 'OBSERVAÇÃO' },
}

export function InsightCard({ insight, onCreateTask, onAiChat }: InsightCardProps) {
  const prio = insight.prioridade || insight.priority || 'OBSERVACAO'
  const config = priorityConfig[prio] || priorityConfig['OBSERVACAO']

  return (
    <Card className="bg-white border-border shadow-sm flex flex-col hover:shadow-md transition-shadow duration-200 h-full">
      <CardHeader className="pb-3 space-y-3">
        <div>
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] font-bold tracking-wider rounded-md px-2 py-0.5',
              config.bg,
              config.text,
              'hover:bg-opacity-80 border-none',
            )}
          >
            {config.label}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
          {insight.titulo || insight.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 flex-1 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          {insight.descricao || insight.description}
        </p>
        <div className="flex items-start gap-2 text-sm text-[#1D4ED8] font-medium bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
          <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{insight.sugestao || insight.suggestion}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-gray-100 mt-auto pt-4">
        <Link
          to={`/feedbacks?categoria=${insight.categoria || insight.category || ''}`}
          className="text-sm text-[#1D4ED8] hover:underline font-medium"
        >
          {insight.feedbacks_relacionados || insight.relatedCount || 0} feedbacks relacionados
        </Link>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateTask}
            className="w-full sm:w-auto text-gray-700 border-gray-300 hover:bg-gray-50 h-9"
          >
            Criar tarefa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAiChat}
            className="w-full sm:w-auto text-[#1D4ED8] border-[#1D4ED8] hover:bg-blue-50 h-9 font-semibold"
          >
            Discutir com IA
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
