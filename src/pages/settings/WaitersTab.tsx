import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Plus, Users, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

interface Garcom {
  id: number
  nome_garcon: string
  ativo: boolean
}

export function WaitersTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const [waiters, setWaiters] = useState<Garcom[]>([])
  const [newWaiter, setNewWaiter] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restauranteId) return
    const fetchWaiters = async () => {
      const { data } = await supabase
        .from('garcons')
        .select('id, nome_garcon, ativo')
        .eq('restaurante_id', restauranteId)
        .order('nome_garcon')

      if (data) setWaiters(data)
      setLoading(false)
    }
    fetchWaiters()
  }, [restauranteId])

  const handleAdd = async () => {
    if (!newWaiter.trim() || !restauranteId) return

    const { data, error } = await supabase
      .from('garcons')
      .insert({ nome_garcon: newWaiter.trim(), restaurante_id: restauranteId, ativo: true })
      .select('id, nome_garcon, ativo')
      .single()

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o garçom.',
        variant: 'destructive',
      })
      return
    }

    if (data) setWaiters([...waiters, data])
    setNewWaiter('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: 'Garçom adicionado.' })
  }

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase.from('garcons').update({ ativo: !currentStatus }).eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
      return
    }

    setWaiters(waiters.map((w) => (w.id === id ? { ...w, ativo: !currentStatus } : w)))
  }

  const handleRemove = async (id: number) => {
    if (!confirm('Deseja realmente remover este garçom?')) return

    const { error } = await supabase.from('garcons').delete().eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover.',
        variant: 'destructive',
      })
      return
    }

    setWaiters(waiters.filter((w) => w.id !== id))
    toast({ title: 'Removido', description: 'Garçom removido com sucesso.' })
  }

  if (loading) return <Skeleton className="h-64 w-full animate-fade-in" />

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Garçons / Atendentes</CardTitle>
          <CardDescription>
            Gerencie os membros da equipe de atendimento para acompanhar avaliações por atendente.
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Garçom</DialogTitle>
              <DialogDescription>Adicione um novo atendente ao sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="waiter-name">Nome do Atendente</Label>
                <Input
                  id="waiter-name"
                  value={newWaiter}
                  onChange={(e) => setNewWaiter(e.target.value)}
                  placeholder="Ex: João Silva"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={!newWaiter.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-2xl">
          {waiters.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-full ${w.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-sm block">{w.nome_garcon}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => handleToggleStatus(w.id, w.ativo)}
                  title={w.ativo ? 'Desativar' : 'Ativar'}
                >
                  {w.ativo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemove(w.id)}
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {waiters.length === 0 && (
            <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground text-sm flex flex-col items-center">
              <Users className="w-8 h-8 text-gray-300 mb-2" />
              Nenhum garçom cadastrado.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
