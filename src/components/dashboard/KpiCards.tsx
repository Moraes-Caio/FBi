import { ArrowUpRight, ArrowDownRight, Smile, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { DashboardData } from '@/lib/queries/visao-geral'

function SimpleSparkline({ color, points }: { color: string; points: string }) {
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" className="opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GaugeNps({ value, trend }: { value: number; trend: string }) {
  const percentage = Math.min(Math.max(value, 0), 100)
  const arcLength = (percentage / 100) * 125.6 // 125.6 is half circle circumference approx

  return (
    <div className="relative w-16 h-8 flex items-end justify-center">
      <svg viewBox="0 0 100 50" className="absolute top-0 left-0 w-full h-full overflow-visible">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#22C55E"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset={125.6 - arcLength}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="text-[10px] font-bold text-success bg-green-50 px-1 rounded absolute -right-2 top-0">
        {trend}
      </div>
    </div>
  )
}

export function KpiCards({ data }: { data: DashboardData['kpis'] }) {
  const isUpTotal = data.totalTrend.startsWith('+')
  const isUpSentiment = data.sentimentTrend.startsWith('+')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1 */}
      <Card className="shadow-subtle hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Total de Feedbacks</h3>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-foreground">{data.totalFeedbacks}</span>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-xs font-semibold ${isUpTotal ? 'text-success' : 'text-destructive'}`}
              >
                {data.totalTrend}
              </span>
              <SimpleSparkline
                color={isUpTotal ? '#22C55E' : '#EF4444'}
                points={isUpTotal ? '0,15 15,12 30,14 45,5 60,2' : '0,2 15,5 30,4 45,12 60,15'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 */}
      <Card className="shadow-subtle hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Sentimento Geral</h3>
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-foreground">{data.sentiment}%</span>
              <Smile className="h-6 w-6 text-warning" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-xs font-semibold ${isUpSentiment ? 'text-success' : 'text-destructive'}`}
              >
                {data.sentimentTrend}
              </span>
              <SimpleSparkline
                color={isUpSentiment ? '#22C55E' : '#EF4444'}
                points={isUpSentiment ? '0,18 20,10 40,8 60,2' : '0,2 20,8 40,10 60,18'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 */}
      <Card className="shadow-subtle hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">NPS Estimado</h3>
          <div className="flex items-end justify-between h-[42px]">
            <span className="text-3xl font-bold text-foreground leading-none">{data.nps}</span>
            <GaugeNps value={data.nps} trend={data.npsTrend} />
          </div>
        </CardContent>
      </Card>

      {/* Card 4 */}
      <Card className="shadow-subtle hover:shadow-md transition-shadow border-l-4 border-l-destructive">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">Tema Crítico</h3>
          <div>
            <div className="text-lg font-bold text-foreground leading-tight">
              {data.criticalTheme}
            </div>
            <div className="text-xs font-medium text-destructive mt-0.5">
              {data.criticalPercent}% negativo
            </div>
          </div>
          <button className="text-xs font-medium text-primary flex items-center gap-1 hover:underline mt-1 w-fit">
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
