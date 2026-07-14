import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DashboardData, PeriodInfo } from '@/lib/queries/visao-geral'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'

const chartConfig = {
  sentiment: {
    label: 'Sentimento (%)',
    color: 'hsl(var(--chart-1))',
  },
}

interface TooltipPayload {
  date: string
  sentiment: number | null
  avaliacoes: number
}

function SentimentTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: TooltipPayload }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-foreground mb-0.5">{d.date}</p>
      {d.avaliacoes > 0 ? (
        <p className="text-xs text-muted-foreground">
          Sentimento:{' '}
          <span className="font-semibold text-foreground">{d.sentiment}%</span>
          {' '}· {d.avaliacoes} feedback{d.avaliacoes !== 1 ? 's' : ''}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem feedbacks</p>
      )}
    </div>
  )
}

interface TrendChartProps {
  data: DashboardData['chartData']
  categories: DashboardData['categories']
  period: PeriodInfo
  onPeriodChange: (p: PeriodInfo) => void
}

export function TrendChart({ data, categories, period, onPeriodChange }: TrendChartProps) {
  // Intervalo derivado do tamanho real dos dados (não do period),
  // para evitar bug visual quando o period muda antes dos dados chegarem.
  // Mais de 10 pontos → espaça os rótulos; ≤10 → mostra todos.
  const xInterval =
    data.length > 10 ? Math.max(1, Math.ceil((data.length - 1) / 5)) : 0

  return (
    <Card className="shadow-subtle flex flex-col">
      <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between border-b-0 space-y-0">
        <CardTitle className="text-base font-semibold">Tendência de Sentimento</CardTitle>
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(v) => v && onPeriodChange(v as PeriodInfo)}
          className="bg-muted p-1 rounded-lg scale-90 sm:scale-100"
        >
          <ToggleGroupItem
            value="7d"
            className="h-7 px-3 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm"
          >
            7d
          </ToggleGroupItem>
          <ToggleGroupItem
            value="30d"
            className="h-7 px-3 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm"
          >
            30d
          </ToggleGroupItem>
          <ToggleGroupItem
            value="90d"
            className="h-7 px-3 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm"
          >
            90d
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="p-5 pt-6 flex gap-6 min-h-[280px]">
        <div className="flex-1 min-w-0">
          <ChartContainer config={chartConfig} className="w-full h-full min-h-[240px]">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={xInterval}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} domain={[0, 100]} hide />
              <ChartTooltip content={<SentimentTooltip />} />
              <Area
                type="monotone"
                dataKey="sentiment"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSentiment)"
                animationDuration={1000}
                connectNulls={true}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props
                  if (!cx || !cy || payload.avaliacoes === 0) return <g key={`d-${index}`} />
                  return (
                    <circle
                      key={`d-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="hsl(var(--chart-1))"
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy || payload.avaliacoes === 0) return <g />
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="hsl(var(--chart-1))"
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="w-px bg-border/50 self-stretch shrink-0" />

        <div className="w-44 shrink-0 flex flex-col">
          <p className="text-sm font-semibold text-foreground mb-3">Categorias de Feedback</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria neste período</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/40">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">{cat.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
