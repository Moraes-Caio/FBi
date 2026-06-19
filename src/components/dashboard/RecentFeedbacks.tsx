import { ArrowRight, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardData } from '@/lib/queries/visao-geral'
import { cn } from '@/lib/utils'

export function RecentFeedbacks({ feedbacks }: { feedbacks: DashboardData['recentFeedbacks'] }) {
  return (
    <Card className="shadow-subtle col-span-1 lg:col-span-3">
      <CardHeader className="p-5 flex flex-row items-center justify-between border-b border-border/50">
        <CardTitle className="text-base font-semibold">Últimos Feedbacks</CardTitle>
        <button className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
          Ver todos <ArrowRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum feedback no período selecionado</p>
          </div>
        ) : (
        <div className="flex flex-col divide-y divide-border/50">
          {feedbacks.map((item) => (
            <div key={item.id} className="p-5 flex gap-4 hover:bg-muted/30 transition-colors">
              <div className="mt-1 flex-shrink-0">
                <div
                  className={cn('h-2.5 w-2.5 rounded-full', {
                    'bg-success': item.sentiment === 'positive',
                    'bg-destructive': item.sentiment === 'negative',
                    'bg-warning': item.sentiment === 'neutral',
                  })}
                />
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <p className="text-sm text-foreground font-medium leading-relaxed truncate whitespace-normal line-clamp-2">
                  "{item.text}"
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {item.categories.map((cat, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-accent text-primary hover:bg-accent/80 font-medium text-[10px] px-2 py-0 h-5"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.timeAgo}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
