import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { DashboardData, PeriodInfo } from '@/lib/queries/visao-geral'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  sentiment: {
    label: 'Sentimento (%)',
    color: 'hsl(var(--chart-1))',
  },
}

interface TrendChartProps {
  data: DashboardData['chartData']
  period: PeriodInfo
  onPeriodChange: (p: PeriodInfo) => void
}

export function TrendChart({ data, period, onPeriodChange }: TrendChartProps) {
  return (
    <Card className="shadow-subtle col-span-1 lg:col-span-2 flex flex-col">
      <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between border-b-0 space-y-0">
        <CardTitle className="text-base font-semibold">Tendência de Sentimento</CardTitle>
        <div className="flex items-center gap-3">
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs hidden sm:flex border-border bg-white shadow-sm"
          >
            <Plus className="h-3 w-3 mr-1" /> Evento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-6 flex-1 min-h-[250px]">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
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
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              domain={['dataMin - 10', 'dataMax + 10']}
              hide
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              type="monotone"
              dataKey="sentiment"
              stroke="hsl(var(--chart-1))"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorSentiment)"
              animationDuration={1000}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
