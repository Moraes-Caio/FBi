import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Search, CheckCircle2, Bot, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { buscarFeedbacks, buscarCategoriasAtivas, FiltrosFeedback } from '@/lib/queries/feedbacks'
import { useAuth } from '@/hooks/use-auth'

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function Feedbacks() {
  const { toast } = useToast()
  const { usuario } = useAuth()

  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [totalFeedbacks, setTotalFeedbacks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<string[]>([])

  const [filtros, setFiltros] = useState<FiltrosFeedback>({
    periodo: '7d',
    sentimento: 'all',
    categorias: [],
    busca: '',
    ordenacao: 'recent',
  })
  const [offset, setOffset] = useState(0)
  const LIMIT = 10

  useEffect(() => {
    buscarCategoriasAtivas(usuario?.restaurante_id ?? undefined)
      .then(setCategoriasDisponiveis)
      .catch(console.error)
  }, [usuario?.restaurante_id])

  const carregarFeedbacks = useCallback(
    async (isLoadMore = false) => {
      try {
        setLoading(true)
        const currentOffset = isLoadMore ? offset + LIMIT : 0
        const { feedbacks: newFbs, total } = await buscarFeedbacks(filtros, LIMIT, currentOffset)

        setFeedbacks((prev) => (isLoadMore ? [...prev, ...newFbs] : newFbs))
        setTotalFeedbacks(total)
        setOffset(currentOffset)
      } catch (err) {
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar os feedbacks.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [filtros, offset, toast],
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => carregarFeedbacks(false), 300)
    return () => clearTimeout(timeoutId)
  }, [filtros, carregarFeedbacks])

  const toggleCategoria = (cat: string) => {
    setFiltros((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }))
  }

  const dataToDisplay = feedbacks

  return (
    <div className="mx-auto max-w-[1050px] pb-12 animate-fade-in-up">
      <div className="flex flex-col xl:flex-row gap-3 mb-6 items-start xl:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Select
            value={filtros.periodo}
            onValueChange={(val: any) => setFiltros((prev) => ({ ...prev, periodo: val }))}
          >
            <SelectTrigger className="w-[160px] h-10 bg-white shadow-sm border-gray-200">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.sentimento}
            onValueChange={(val) => setFiltros((prev) => ({ ...prev, sentimento: val }))}
          >
            <SelectTrigger className="w-[170px] h-10 bg-white shadow-sm border-gray-200">
              <SelectValue placeholder="Todos Sentimentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Sentimentos</SelectItem>
              <SelectItem value="positivo">Positivo</SelectItem>
              <SelectItem value="negativo">Negativo</SelectItem>
              <SelectItem value="neutro">Neutro</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 bg-white font-normal text-muted-foreground hover:text-foreground shadow-sm border-gray-200"
              >
                Categorias
                {filtros.categorias.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 px-1.5 py-0 text-xs font-semibold rounded-md border-transparent"
                  >
                    {filtros.categorias.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {categoriasDisponiveis.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={filtros.categorias.includes(cat)}
                  onCheckedChange={() => toggleCategoria(cat)}
                >
                  {cat}
                </DropdownMenuCheckboxItem>
              ))}
              {categoriasDisponiveis.length === 0 && (
                <div className="p-2 text-sm text-gray-500 text-center">Nenhuma categoria</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-10 bg-white w-full shadow-sm border-gray-200"
              placeholder="Buscar nos feedbacks..."
              value={filtros.busca}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busca: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center shrink-0 w-full xl:w-auto mt-2 xl:mt-0">
          <Select
            value={filtros.ordenacao}
            onValueChange={(val: any) => setFiltros((prev) => ({ ...prev, ordenacao: val }))}
          >
            <SelectTrigger className="w-full xl:w-[150px] h-10 border xl:border-0 bg-white xl:bg-transparent shadow-sm xl:shadow-none hover:bg-gray-50 font-medium text-gray-600 focus:ring-0">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {loading && feedbacks.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-[20px] border border-[#E5E7EB] rounded-[12px] bg-white shadow-subtle flex flex-col sm:flex-row gap-4 sm:gap-6"
            >
              <div className="w-full sm:w-[90px] shrink-0">
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
            </div>
          ))
        ) : dataToDisplay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white border border-dashed rounded-xl">
            <Folder className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum feedback encontrado</h3>
            <p className="text-sm mt-1">
              Ajuste os filtros ou aguarde novas avaliações de clientes.
            </p>
          </div>
        ) : (
          dataToDisplay.map((fb) => {
            const isPos = fb.sentimento?.toUpperCase() === 'POSITIVO'
            const isNeg = fb.sentimento?.toUpperCase() === 'NEGATIVO'
            return (
              <div
                key={fb.id}
                className="p-[20px] border border-[#E5E7EB] rounded-[12px] bg-white shadow-subtle flex flex-col sm:flex-row gap-4 sm:gap-6 hover:shadow-elevation transition-all duration-200"
              >
                <div className="w-full sm:w-[90px] flex sm:flex-col items-center justify-start sm:justify-start pt-1 gap-2 shrink-0 border-b sm:border-b-0 pb-3 sm:pb-0 border-gray-100">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      isPos ? 'bg-success' : isNeg ? 'bg-destructive' : 'bg-warning',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-bold tracking-wider',
                      isPos ? 'text-success' : isNeg ? 'text-destructive' : 'text-warning',
                    )}
                  >
                    {fb.sentimento?.toUpperCase() || 'NEUTRO'}
                  </span>
                </div>
                <div className="flex-1 space-y-4 min-w-0">
                  <p className="text-[15px] text-[#1F2937] leading-relaxed font-normal">
                    {fb.texto_original}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                    <span className="font-medium text-gray-700">
                      {fb.cliente_nome || 'Cliente'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#6B7280]">
                    {fb.categoria && (
                      <span className="bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 rounded-md font-medium text-[11px] tracking-wide">
                        {fb.categoria}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span>WhatsApp</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(fb.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-1.5 shrink-0 items-center justify-end sm:justify-start sm:pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full"
                  >
                    <Folder className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-full"
                  >
                    <Bot className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {totalFeedbacks > feedbacks.length && !loading && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => carregarFeedbacks(true)}
            className="h-[44px] rounded-[8px] px-6 font-semibold shadow-sm hover:bg-gray-50 text-gray-700 bg-white border-gray-200"
          >
            Carregar mais feedbacks
          </Button>
        </div>
      )}
      {loading && feedbacks.length > 0 && (
        <div className="mt-8 flex justify-center">
          <span className="text-sm text-gray-500 animate-pulse">Carregando...</span>
        </div>
      )}
    </div>
  )
}
