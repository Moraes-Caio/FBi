import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { InsightData, ActionTask, ActionPriority } from '@/lib/mock-data'
import { PerguntasAcao } from '@/components/actions/PerguntasAcao'
import { PlanoAcao } from '@/components/actions/PlanoAcao'
import { Separator } from '@/components/ui/separator'

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insight?: InsightData | null
  task?: ActionTask | null
  onSave?: (task: Partial<ActionTask>) => void
  onDelete?: (taskId: string) => void
}

export function TaskModal({ open, onOpenChange, insight, task, onSave, onDelete }: TaskModalProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<string>('NORMAL')
  const [responsible, setResponsible] = useState('')
  const [date, setDate] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setPriority(task.priority)
        setResponsible(task.responsible)
        setDate(task.date)
        setSource(task.source)
      } else if (insight) {
        setTitle(`Verificar: ${insight.title || 'Insight'}`)
        setPriority('IMPORTANTE')
        setSource(`Insight: ${insight.category || 'Geral'}`)
        setResponsible('')
        setDate('')
      } else {
        setTitle('')
        setPriority('NORMAL')
        setResponsible('')
        setDate('')
        setSource('')
      }
    }
  }, [insight, task, open])

  const handleSave = () => {
    if (onSave) {
      onSave({
        title,
        priority: priority as ActionPriority,
        responsible,
        date,
        source,
      })
    } else {
      toast({
        title: 'Tarefa criada com sucesso',
        description: `A tarefa "${title}" foi adicionada ao backlog.`,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {task ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="font-semibold">
              Título da Tarefa
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority" className="font-semibold">
              Prioridade
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="IMPORTANTE">Importante</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="source" className="font-semibold">
              Origem
            </Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: Feedback #47"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignee" className="font-semibold">
              Responsável
            </Label>
            <Input
              id="assignee"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Ex: Chef Pepê"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deadline" className="font-semibold">
              Prazo
            </Label>
            <Input
              id="deadline"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Ex: 24 Jan"
            />
          </div>

          {task && (
            <>
              <Separator className="my-2" />
              <div className="grid gap-2">
                <Separator className="my-2" />
                <div className="grid gap-2">
                  <Label className="font-semibold">Plano de Ação</Label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <PlanoAcao
                      acaoId={parseInt(task.id)}
                      planoInicial={(task as any)._original?.plano_detalhado || ''}
                      isConcluido={task.status === 'CONCLUIDO'}
                    />
                  </div>
                </div>

                <Label className="font-semibold">Perguntas de Validação</Label>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <PerguntasAcao
                    acaoId={parseInt(task.id)}
                    isConcluido={task.status === 'CONCLUIDO'}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between w-full flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          {task && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa e os
                    dados associados a ela.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(task.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto mt-2 sm:mt-0"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto bg-[#1D4ED8] hover:bg-blue-800 text-white"
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
