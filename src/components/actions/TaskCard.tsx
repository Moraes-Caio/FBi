import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getIniciais } from '@/lib/iniciais'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, MessageCircleQuestion, ArrowRight, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PerguntasAcao } from './PerguntasAcao'
import { cn } from '@/lib/utils'
import { useDraggable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'

interface TaskCardProps {
  task: any
  onClick?: () => void
  onProgress?: () => void
  onUndo?: () => void
  canUndo?: boolean
  isOverlay?: boolean
}

export function TaskCard({ task, onClick, onProgress, onUndo, canUndo, isOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: isOverlay ? `overlay-${task.id}` : task.id.toString(),
    data: { task },
  })

  const style =
    transform && !isOverlay
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined

  const getPriorityStyle = (prioridade: string) => {
    switch (prioridade?.toUpperCase()) {
      case 'URGENTE':
        return 'bg-[#EF4444] text-white'
      case 'IMPORTANTE':
        return 'bg-[#F59E0B] text-white'
      case 'NORMAL':
        return 'bg-[#F3F4F6] text-[#1F2937]'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isCompleted = task.status === 'CONCLUIDO'
  const isOngoing = task.status === 'EM_ANDAMENTO'

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={(e) => {
        if (!isDragging && !isOverlay && onClick) onClick()
      }}
      className={cn(
        'bg-white p-5 rounded-xl border border-[#E5E7EB] hover:shadow-md transition-all shadow-sm flex flex-col',
        !isOverlay && 'cursor-grab active:cursor-grabbing',
        isCompleted && 'opacity-75 bg-slate-50/50',
        isDragging && !isOverlay && 'opacity-50 ring-2 ring-primary ring-offset-2 z-50 relative',
        isOverlay && 'rotate-2 shadow-xl scale-105 cursor-grabbing z-50',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
            isCompleted ? 'bg-green-100 text-green-700' : getPriorityStyle(task.prioridade),
          )}
        >
          {isCompleted ? 'CONCLUÍDO' : task.prioridade || 'NORMAL'}
        </span>
        <div className="flex items-center gap-2">
          {!isDragging && !isOverlay && task.status !== 'SUGERIDA' && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                  title="Perguntas de Feedback"
                >
                  <MessageCircleQuestion className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Validação da Ação</DialogTitle>
                </DialogHeader>
                <PerguntasAcao acaoId={parseInt(task.id)} isConcluido={isCompleted} />
              </DialogContent>
            </Dialog>
          )}
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        </div>
      </div>

      <h4
        className={cn(
          'font-semibold text-sm mb-1.5 leading-tight',
          isCompleted && 'line-through text-muted-foreground',
        )}
      >
        {task.titulo_acao}
      </h4>

      {task.texto && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.texto}</p>
      )}

      {task.plano_detalhado && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.plano_detalhado}</p>
      )}

      <p
        className={cn(
          'text-[11px] font-medium mb-4 inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md self-start',
          isCompleted && 'bg-slate-100 text-slate-500',
        )}
      >
        {task.categoria}
      </p>

      {isOngoing && task.progress !== undefined && (
        <div className="mb-4">
          <Progress value={task.progress} className="h-1.5 bg-blue-100 [&>div]:bg-[#1D4ED8]" />
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="w-6 h-6 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {getIniciais(task.responsible || 'Equipe', 2)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[100px] font-medium">{task.responsible || 'Equipe'}</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{task.date}</span>
      </div>

      {!isOverlay && !isDragging && (canUndo || !isCompleted) && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 animate-fade-in-up">
          {canUndo && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 flex-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onUndo?.()
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" /> Desfazer
            </Button>
          )}
          {!isCompleted && (
            <Button
              size="sm"
              className={cn(
                'h-8 px-3 text-xs flex-1 transition-all',
                task.status === 'PENDENTE'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onProgress?.()
              }}
            >
              {task.status === 'PENDENTE' ? 'Iniciar Ação' : 'Concluir'}
              <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
