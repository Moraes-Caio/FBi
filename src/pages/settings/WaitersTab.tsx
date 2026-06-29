import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [bulkText, setBulkText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restauranteId) {
      setLoading(false)
      return
    }
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

  const handleAddSingle = async () => {
    if (!newWaiter.trim()) return
    if (!restauranteId) {
      toast({ title: 'Erro', description: 'Restaurante não identificado. Recarregue a página.', variant: 'destructive' })
      return
    }
    setSaving(true)

    const { data, error } = await supabase
      .from('garcons')
      .insert({ nome_garcon: newWaiter.trim(), restaurante_id: restauranteId, ativo: true })
      .select('id, nome_garcon, ativo')
      .single()

    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' })
      return
    }
    if (data) setWaiters((prev) => [...prev, data].sort((a, b) => a.nome_garcon.localeCompare(b.nome_garcon)))
    setNewWaiter('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: 'Garçom adicionado.' })
  }

  const handleAddBulk = async () => {
    if (!bulkText.trim()) return
    if (!restauranteId) {
      toast({ title: 'Erro', description: 'Restaurante não identificado. Recarregue a página.', variant: 'destructive' })
      return
    }
    const nomes = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (nomes.length === 0) return
    setSaving(true)

    const inserts = nomes.map((nome_garcon) => ({
      nome_garcon,
      restaurante_id: restauranteId,
      ativo: true,
    }))
    const { data, error } = await supabase.from('garcons').insert(inserts).select('id, nome_garcon, ativo')

    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' })
      return
    }
    if (data) {
      setWaiters((prev) =>
        [...prev, ...data].sort((a, b) => a.nome_garcon.localeCompare(b.nome_garcon)),
      )
    }
    setBulkText('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: `${nomes.length} garçom(ns) adicionado(s).` })
  }

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase.from('garcons').update({ ativo: !currentStatus }).eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' })
      return
    }
    setWaiters(waiters.map((w) => (w.id === id ? { ...w, ativo: !currentStatus } : w)))
  }

  const handleRemove = async (id: number) => {
    if (!confirm('Deseja remover este garçom?')) return
    const { error } = await supabase.from('garcons').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' })
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
          <CardTitle>Garçons</CardTitle>
          <CardDescription>
            Gerencie os garçons para acompanhar avaliações por atendente.
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); setNewWaiter(''); setBulkText('') }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Garçons</DialogTitle>
              <DialogDescription>Adicione um garçom individual ou vários de uma vez.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="individual" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
                <TabsTrigger value="varios" className="flex-1">Vários de uma vez</TabsTrigger>
              </TabsList>
              <TabsContent value="individual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="waiter-name">Nome do Garçom</Label>
                  <Input
                    id="waiter-name"
                    value={newWaiter}
                    onChange={(e) => setNewWaiter(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSingle()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddSingle} disabled={!newWaiter.trim() || saving}>
                    {saving ? 'Salvando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="varios" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-waiters">Um garçom por linha</Label>
                  <Textarea
                    id="bulk-waiters"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"João Silva\nMaria Oliveira\nCarlos Santos"}
                    rows={7}
                    className="resize-none"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    {bulkText.split('\n').filter((l) => l.trim()).length} garçom(ns) detectado(s)
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddBulk} disabled={!bulkText.trim() || saving}>
                    {saving ? 'Salvando...' : 'Adicionar todos'}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
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
                  <span className="text-xs text-muted-foreground">{w.ativo ? 'Ativo' : 'Inativo'}</span>
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
