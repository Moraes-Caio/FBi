import { useState, useEffect, useRef } from 'react'
import { ActionStatus } from '@/lib/mock-data'
import { TaskCard } from './TaskCard'
import { TaskModal } from '@/components/insights/TaskModal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  buscarAcoes,
  atualizarStatusAcao,
  criarAcao,
  atualizarAcao,
  excluirAcao,
  atualizarOrdemAcoes,
} from '@/lib/queries/acoes'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

export type ExtendedActionTask = {
  id: string
  titulo_acao: string
  plano_detalhado?: string
  status: ActionStatus
  prioridade: string
  categoria: string
  texto?: string
  feedback_id?: number | null
  restaurante_id?: number | null
  client_id?: string | null
  created_at?: string
  ordem: number
  responsible?: string
  date?: string
  progress?: number
}

function DroppableTask({ task, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      className={isOver ? 'opacity-50 ring-2 ring-primary rounded-xl transition-all' : ''}
    >
      {children}
    </div>
  )
}

function DroppableColumn({ id, title, count, children, onAdd, showAddButton }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: `col-${id}` })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full md:flex-1 min-w-[320px] bg-slate-50/50 rounded-xl border border-border/50 p-4 transition-colors ${isOver ? 'bg-slate-100 border-primary/30' : ''}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-sm text-foreground tracking-wide">{title}</h3>
        <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[150px]">
        {children}
        {showAddButton && (
          <Button
            variant="ghost"
            className="w-full mt-2 border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 justify-center py-6"
            onClick={() => onAdd(id)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar tarefa
          </Button>
        )}
      </div>
    </div>
  )
}

interface TaskBoardProps {
  refreshTrigger?: number
}

export function TaskBoard({ refreshTrigger = 0 }: TaskBoardProps) {
  const { toast } = useToast()
  const { usuario } = useAuth()
  const [tasks, setTasks] = useState<ExtendedActionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<ExtendedActionTask | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ExtendedActionTask | null>(null)
  const [activeColumn, setActiveColumn] = useState<ActionStatus>('PENDENTE')

  const undoTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const [undoableTasks, setUndoableTasks] = useState<Record<string, ActionStatus>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const load = async () => {
    if (!usuario?.restaurante_id) {
      return
    }
    try {
      setLoading(true)
      const data = await buscarAcoes(usuario.restaurante_id, true)
      if (data) {
        const mapped: ExtendedActionTask[] = data.map((d) => ({
          id: d.id.toString(),
          titulo_acao: d.titulo_acao || 'Sem título',
          prioridade: d.prioridade || 'NORMAL',
          categoria: d.categoria || 'Geral',
          plano_detalhado: d.plano_detalhado || undefined,
          texto: d.texto || undefined,
          feedback_id: d.feedback_id,
          restaurante_id: d.restaurante_id,
          client_id: d.client_id,
          created_at: d.created_at,
          responsible: 'Equipe',
          date: new Date(d.created_at).toLocaleDateString(),
          status: d.status as ActionStatus,
          progress: d.status === 'EM_ANDAMENTO' ? 50 : undefined,
          ordem: d.ordem || 0,
        }))
        mapped.sort((a, b) => a.ordem - b.ordem)
        setTasks(mapped)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as ações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (usuario === undefined) {
      return
    }

    if (!usuario || !usuario.restaurante_id) {
      setLoading(false)
      return
    }

    load()

    return () => {
      Object.values(undoTimers.current).forEach((timer) => clearTimeout(timer))
    }
  }, [refreshTrigger, usuario])

  const isValidMove = (from: ActionStatus, to: ActionStatus) => {
    if (from === 'PENDENTE' && to === 'EM_ANDAMENTO') return true
    if (from === 'EM_ANDAMENTO' && to === 'CONCLUIDO') return true
    return false
  }

  const doMoveStatusApi = async (
    taskId: string,
    oldStatus: ActionStatus,
    newStatus: ActionStatus,
    taskDetails: any,
  ) => {
    try {
      await atualizarStatusAcao(parseInt(taskId), newStatus)
      toast({
        title: oldStatus !== newStatus ? 'Status atualizado' : 'Avanço de etapa',
        description: `A tarefa foi movida para ${newStatus === 'EM_ANDAMENTO' ? 'Em Andamento' : newStatus === 'CONCLUIDO' ? 'Concluído' : 'Pendente'}.`,
      })

      if (taskDetails) {
        supabase.functions
          .invoke('webhook-n8n', {
            body: {
              task_id: taskId,
              title: taskDetails.titulo_acao,
              status: newStatus,
              priority: taskDetails.prioridade,
              source: taskDetails.categoria,
              restaurante_id: usuario?.restaurante_id,
            },
          })
          .catch(console.error)
      }

      setUndoableTasks((prev) => ({ ...prev, [taskId]: oldStatus }))
      if (undoTimers.current[taskId]) clearTimeout(undoTimers.current[taskId])

      undoTimers.current[taskId] = setTimeout(() => {
        setUndoableTasks((prev) => {
          const next = { ...prev }
          delete next[taskId]
          return next
        })
        delete undoTimers.current[taskId]
      }, 60000)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar o status.', variant: 'destructive' })
      load() // reload to reset state on error
    }
  }

  const moveTask = async (taskId: string, oldStatus: ActionStatus, newStatus: ActionStatus) => {
    const taskDetails = tasks.find((t) => t.id === taskId)
    let updatedTasks: ExtendedActionTask[] = []

    setTasks((prev) => {
      const newTasks = prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      const byStatus = {
        PENDENTE: newTasks.filter((t) => t.status === 'PENDENTE').sort((a, b) => a.ordem - b.ordem),
        EM_ANDAMENTO: newTasks
          .filter((t) => t.status === 'EM_ANDAMENTO')
          .sort((a, b) => a.ordem - b.ordem),
        CONCLUIDO: newTasks
          .filter((t) => t.status === 'CONCLUIDO')
          .sort((a, b) => a.ordem - b.ordem),
      }
      updatedTasks = [
        ...byStatus.PENDENTE.map((t, i) => ({ ...t, ordem: i })),
        ...byStatus.EM_ANDAMENTO.map((t, i) => ({ ...t, ordem: i })),
        ...byStatus.CONCLUIDO.map((t, i) => ({ ...t, ordem: i })),
      ]
      return updatedTasks
    })

    await doMoveStatusApi(taskId, oldStatus, newStatus, taskDetails)

    if (updatedTasks.length > 0) {
      const changedOrders = updatedTasks.map((t) => ({ id: parseInt(t.id), ordem: t.ordem }))
      atualizarOrdemAcoes(changedOrders).catch(console.error)
    }
  }

  const handleUndo = async (taskId: string) => {
    const oldStatus = undoableTasks[taskId]
    if (!oldStatus) return

    const taskDetails = tasks.find((t) => t.id === taskId)
    if (!taskDetails) return

    let updatedTasks: ExtendedActionTask[] = []

    setTasks((prev) => {
      const newTasks = prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t))
      const byStatus = {
        PENDENTE: newTasks.filter((t) => t.status === 'PENDENTE').sort((a, b) => a.ordem - b.ordem),
        EM_ANDAMENTO: newTasks
          .filter((t) => t.status === 'EM_ANDAMENTO')
          .sort((a, b) => a.ordem - b.ordem),
        CONCLUIDO: newTasks
          .filter((t) => t.status === 'CONCLUIDO')
          .sort((a, b) => a.ordem - b.ordem),
      }
      updatedTasks = [
        ...byStatus.PENDENTE.map((t, i) => ({ ...t, ordem: i })),
        ...byStatus.EM_ANDAMENTO.map((t, i) => ({ ...t, ordem: i })),
        ...byStatus.CONCLUIDO.map((t, i) => ({ ...t, ordem: i })),
      ]
      return updatedTasks
    })

    if (undoTimers.current[taskId]) clearTimeout(undoTimers.current[taskId])
    setUndoableTasks((prev) => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
    delete undoTimers.current[taskId]

    await doMoveStatusApi(taskId, taskDetails.status, oldStatus, taskDetails)

    if (updatedTasks.length > 0) {
      const changedOrders = updatedTasks.map((t) => ({ id: parseInt(t.id), ordem: t.ordem }))
      atualizarOrdemAcoes(changedOrders).catch(console.error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    const activeTaskIndex = tasks.findIndex((t) => t.id === activeId)
    const activeTask = tasks[activeTaskIndex]
    if (!activeTask) return

    let newStatus: ActionStatus
    let targetIndex = -1

    if (overId.startsWith('col-')) {
      newStatus = overId.replace('col-', '') as ActionStatus
      targetIndex = tasks.filter((t) => t.status === newStatus).length
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (!overTask) return
      newStatus = overTask.status
      targetIndex = tasks.filter((t) => t.status === newStatus).findIndex((t) => t.id === overId)
    }

    if (activeTask.status !== newStatus) {
      if (!isValidMove(activeTask.status, newStatus)) {
        let reason = 'Movimento inválido.'
        if (activeTask.status === 'CONCLUIDO')
          reason = 'Não é possível retornar tarefas concluídas.'
        else if (newStatus === 'PENDENTE')
          reason = 'Não é possível retroceder etapas manualmente. Use o botão "Desfazer".'
        else if (activeTask.status === 'PENDENTE' && newStatus === 'CONCLUIDO')
          reason = 'Você não pode pular etapas. Mova para "Em Andamento" primeiro.'

        toast({ title: 'Movimentação Bloqueada', description: reason, variant: 'destructive' })
        return
      }
    }

    const oldStatus = activeTask.status

    const newTasks = [...tasks]
    const [removedTask] = newTasks.splice(
      newTasks.findIndex((t) => t.id === activeId),
      1,
    )
    removedTask.status = newStatus

    const tasksByStatus = {
      PENDENTE: newTasks.filter((t) => t.status === 'PENDENTE').sort((a, b) => a.ordem - b.ordem),
      EM_ANDAMENTO: newTasks
        .filter((t) => t.status === 'EM_ANDAMENTO')
        .sort((a, b) => a.ordem - b.ordem),
      CONCLUIDO: newTasks.filter((t) => t.status === 'CONCLUIDO').sort((a, b) => a.ordem - b.ordem),
    }

    tasksByStatus[newStatus].splice(targetIndex, 0, removedTask)

    const updatedTasks = [
      ...tasksByStatus.PENDENTE.map((t, i) => ({ ...t, ordem: i })),
      ...tasksByStatus.EM_ANDAMENTO.map((t, i) => ({ ...t, ordem: i })),
      ...tasksByStatus.CONCLUIDO.map((t, i) => ({ ...t, ordem: i })),
    ]

    setTasks(updatedTasks)

    if (oldStatus !== newStatus) {
      doMoveStatusApi(activeId, oldStatus, newStatus, activeTask)
    }

    const changedOrders = updatedTasks
      .filter((t) => {
        const oldTask = tasks.find((old) => old.id === t.id)
        return oldTask && (oldTask.ordem !== t.ordem || oldTask.status !== t.status)
      })
      .map((t) => ({ id: parseInt(t.id), ordem: t.ordem }))

    if (changedOrders.length > 0) {
      atualizarOrdemAcoes(changedOrders).catch(() => {
        toast({
          title: 'Erro',
          description: 'Falha ao salvar a nova ordem.',
          variant: 'destructive',
        })
      })
    }
  }

  const handleOpenModal = (status: ActionStatus, task?: ExtendedActionTask) => {
    setActiveColumn(status)
    setEditingTask(task || null)
    setModalOpen(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await excluirAcao(parseInt(taskId))
      toast({ title: 'Tarefa excluída', description: 'A tarefa foi removida com sucesso.' })
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao excluir a tarefa', variant: 'destructive' })
    }
  }

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await atualizarAcao(parseInt(editingTask.id), {
          titulo_acao: taskData.title || taskData.titulo_acao,
          prioridade: taskData.priority || taskData.prioridade,
          categoria: taskData.source || taskData.categoria,
          plano_detalhado:
            taskData.description || taskData.plano_detalhado || editingTask.plano_detalhado || '',
        })
        toast({ title: 'Tarefa atualizada' })
      } else {
        const currentPendente = tasks.filter((t) => t.status === 'PENDENTE')
        const maxOrdem =
          currentPendente.length > 0 ? Math.max(...currentPendente.map((t) => t.ordem)) : -1

        const novaAcao = await criarAcao({
          titulo_acao: taskData.title || taskData.titulo_acao || 'Nova Tarefa',
          prioridade: taskData.priority || taskData.prioridade || 'NORMAL',
          categoria: taskData.source || taskData.categoria || 'Geral',
          plano_detalhado: taskData.description || taskData.plano_detalhado || '',
          status: 'PENDENTE',
          restaurante_id: usuario?.restaurante_id,
          ordem: maxOrdem + 1,
        })
        toast({ title: 'Tarefa criada' })

        if (novaAcao?.id) {
          supabase.functions
            .invoke('gerar-perguntas-direcionadas', {
              body: { acao_id: novaAcao.id },
            })
            .catch(() => console.log('Geração de perguntas iniciada em background'))
        }
      }
      load()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar tarefa', variant: 'destructive' })
    }
    setModalOpen(false)
  }

  const columns: { title: string; status: ActionStatus }[] = [
    { title: 'PENDENTE', status: 'PENDENTE' },
    { title: 'EM ANDAMENTO', status: 'EM_ANDAMENTO' },
    { title: 'CONCLUÍDO', status: 'CONCLUIDO' },
  ]

  if (loading || !usuario || !usuario.restaurante_id) {
    return (
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px] overflow-x-auto pb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col w-full md:flex-1 min-w-[320px] bg-slate-50/50 rounded-xl border border-border/50 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-5 w-16 rounded-md mt-1" />
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px] overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status)
          return (
            <DroppableColumn
              key={col.status}
              id={col.status}
              title={col.title}
              count={colTasks.length}
              onAdd={() => handleOpenModal(col.status)}
              showAddButton={col.status === 'PENDENTE'}
            >
              {colTasks.map((task) => (
                <DroppableTask key={task.id} task={task}>
                  <TaskCard
                    task={task}
                    onClick={() => handleOpenModal(col.status, task)}
                    canUndo={!!undoableTasks[task.id]}
                    onUndo={() => handleUndo(task.id)}
                    onProgress={() => {
                      const next = task.status === 'PENDENTE' ? 'EM_ANDAMENTO' : 'CONCLUIDO'
                      moveTask(task.id, task.status, next)
                    }}
                  />
                </DroppableTask>
              ))}
            </DroppableColumn>
          )
        })}

        <DragOverlay>{activeTask ? <TaskCard task={activeTask} isOverlay /> : null}</DragOverlay>

        {modalOpen && (
          <TaskModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            task={
              editingTask
                ? {
                    ...editingTask,
                    title: editingTask.titulo_acao,
                    priority: editingTask.prioridade,
                    source: editingTask.categoria,
                    description: editingTask.plano_detalhado,
                  }
                : (null as any)
            }
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </DndContext>
  )
}
