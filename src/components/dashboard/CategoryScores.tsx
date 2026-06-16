import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { DashboardData } from '@/lib/queries/visao-geral'
import { cn } from '@/lib/utils'

export function CategoryScores({ categories }: { categories: DashboardData['categories'] }) {
  return (
    <Card className="shadow-subtle col-span-1 flex flex-col">
      <CardHeader className="p-5 pb-4 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Categorias de Feedback</CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
        {categories.map((cat, i) => {
          const isGood = cat.score >= 60
          const isBad = cat.score < 50
          const progressClass = cn({
            'progress-success': isGood,
            'progress-destructive': isBad,
            'progress-warning': !isGood && !isBad,
          })

          return (
            <div key={i} className="flex flex-col gap-1.5 group">
              <div className="flex justify-between items-end text-sm">
                <span className="font-medium text-foreground">{cat.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">{cat.score}</span>
                  {cat.trend === 'up' && <ArrowUp className="h-3 w-3 text-success" />}
                  {cat.trend === 'down' && <ArrowDown className="h-3 w-3 text-destructive" />}
                  {cat.trend === 'neutral' && <Minus className="h-3 w-3 text-muted-foreground" />}
                </div>
              </div>
              <Progress value={cat.score} className={cn('h-1.5 bg-muted', progressClass)} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
