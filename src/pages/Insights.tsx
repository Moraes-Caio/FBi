import { useState, useMemo, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { InsightCard } from '@/components/insights/InsightCard'
import { TaskModal } from '@/components/insights/TaskModal'
import { AiChatSheet } from '@/components/insights/AiChatSheet'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export default function Insights() {
  const [filterPriority, setFilterPriority] = useState<string>('Todos')
  const [filterCategory, setFilterCategory] = useState<string>('Todas')

  const [insights, setInsights] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<any>(null)

  const { user } = useAuth()
  const { toast } = useToast()

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('restaurante_id')
        .eq('id', user?.id)
        .single()
      const restId = userData?.restaurante_id

      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('ativo', true)
        .eq('restaurante_id', restId || 1)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setInsights(data)
        const cats = Array.from(
          new Set(data.map((i: any) => i.categoria).filter(Boolean)),
        ) as string[]
        setCategories(cats)
      }
    } catch (e: any) {
      toast({ title: 'Erro ao buscar insights', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchInsights()
  }, [user])

  const handleGerarInsights = async () => {
    if (
      !window.confirm(
        'Deseja forçar a geração de insights agora? O Chef Pepê analisará todos os feedbacks recentes.',
      )
    )
      return

    setGenerating(true)
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('restaurante_id')
        .eq('id', user?.id)
        .single()

      const { data, error } = await supabase.functions.invoke('gerar-insights', {
        body: { restaurante_id: userData?.restaurante_id || 1, force: true },
      })

      if (error) throw error

      toast({
        title: 'Análise concluída!',
        description:
          data.insights_gerados > 0
            ? `Foram gerados ${data.insights_gerados} novos insights operacionais.`
            : 'Não há novos feedbacks suficientes para gerar insights diferentes agora.',
      })
      fetchInsights()
    } catch (e: any) {
      toast({ title: 'Erro ao gerar insights', description: e.message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateTask = (insight: any) => {
    setSelectedInsight(insight)
    setTaskModalOpen(true)
  }

  const handleAiChat = (insight: any) => {
    setSelectedInsight(insight)
    setAiChatOpen(true)
  }

  const handleSaveTask = async (taskData: any) => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('restaurante_id')
        .eq('id', user?.id)
        .single()

      const { error } = await supabase.from('acoes_operacionais').insert({
        titulo_acao: taskData.title,
        prioridade: taskData.priority,
        categoria: selectedInsight?.categoria,
        texto: selectedInsight?.descricao,
        status: 'PENDENTE',
        client_id: null,
      })

      if (error) throw error
      toast({
        title: 'Tarefa criada com sucesso',
        description: 'Ação adicionada ao seu painel operacional.',
      })
    } catch (e: any) {
      toast({ title: 'Erro ao criar tarefa', description: e.message, variant: 'destructive' })
    }
  }

  const filteredInsights = useMemo(() => {
    return insights.filter((i) => {
      const prioMatch =
        filterPriority === 'Todos' ||
        i.prioridade === filterPriority ||
        (filterPriority === 'OBSERVAÇÃO' && i.prioridade === 'OBSERVACAO')
      const catMatch = filterCategory === 'Todas' || i.categoria === filterCategory
      return prioMatch && catMatch
    })
  }, [insights, filterPriority, filterCategory])

  const priorities = [
    {
      label: 'Todos',
      value: 'Todos',
      colors: 'text-[#1D4ED8]',
      activeClass: 'border-[#1D4ED8] bg-blue-50/50',
    },
    {
      label: 'Urgente',
      value: 'URGENTE',
      colors: 'text-[#EF4444]',
      activeClass: 'border-[#EF4444] bg-red-50/50',
    },
    {
      label: 'Importante',
      value: 'IMPORTANTE',
      colors: 'text-[#F59E0B]',
      activeClass: 'border-[#F59E0B] bg-orange-50/50',
    },
    {
      label: 'Observação',
      value: 'OBSERVAÇÃO',
      colors: 'text-[#6B7280]',
      activeClass: 'border-[#6B7280] bg-gray-50',
    },
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-[#F9FAFB] min-h-[calc(100vh-4rem)] font-inter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Insights da IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Análises automáticas dos feedbacks dos seus clientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <Button
            onClick={handleGerarInsights}
            disabled={generating}
            className="w-full sm:w-auto bg-[#1D4ED8] hover:bg-blue-800 text-white font-medium shadow-sm transition-all"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', generating && 'animate-spin')} />
            {generating ? 'Analisando dados...' : 'Gerar insights agora'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-200 w-full sm:w-auto overflow-x-auto">
          {priorities.map((p) => {
            const isActive = filterPriority === p.value
            return (
              <button
                key={p.value}
                onClick={() => setFilterPriority(p.value)}
                className={cn(
                  'px-4 py-1.5 text-sm font-semibold rounded-full transition-all border outline-none whitespace-nowrap',
                  p.colors,
                  isActive ? p.activeClass : 'border-transparent hover:bg-gray-100',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[220px] bg-white h-10 shadow-sm rounded-lg border-gray-200">
            <SelectValue placeholder="Filtrar Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInsights.length > 0 ? (
            filteredInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onCreateTask={() => handleCreateTask(insight)}
                onAiChat={() => handleAiChat(insight)}
              />
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-xl border border-dashed">
              <p className="text-lg font-medium">Nenhum insight encontrado</p>
              <p className="text-sm mt-1">
                Tente ajustar os filtros ou clique em "Gerar insights agora".
              </p>
            </div>
          )}
        </div>
      )}

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        insight={selectedInsight}
        onSave={handleSaveTask}
      />

      <AiChatSheet open={aiChatOpen} onOpenChange={setAiChatOpen} insight={selectedInsight} />
    </div>
  )
}
