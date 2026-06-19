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
import { Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

interface Categoria {
  id: string
  nome: string
}

export function CategoriesTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Categoria[]>([])
  const [newCat, setNewCat] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restauranteId) return
    const fetchCats = async () => {
      const { data } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('restaurante_id', restauranteId)
        .eq('ativa', true)
        .order('nome')

      if (data) setCategories(data)
      setLoading(false)
    }
    fetchCats()
  }, [restauranteId])

  const handleAdd = async () => {
    if (!newCat.trim() || !restauranteId) return

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome: newCat.trim(), restaurante_id: restauranteId, ativa: true })
      .select('id, nome')
      .single()

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a categoria.',
        variant: 'destructive',
      })
      return
    }

    if (data) setCategories([...categories, data])
    setNewCat('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: 'Categoria adicionada.' })
  }

  const handleRemove = async (id: string) => {
    if (
      !confirm(
        'Deseja realmente remover esta categoria? Ela será arquivada para preservar o histórico.',
      )
    )
      return

    const { error } = await supabase.from('categorias').update({ ativa: false }).eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a categoria.',
        variant: 'destructive',
      })
      return
    }

    setCategories(categories.filter((c) => c.id !== id))
    toast({ title: 'Removida', description: 'Categoria arquivada com sucesso.' })
  }

  if (loading) return <Skeleton className="h-64 w-full animate-fade-in" />

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Categorias de Feedback</CardTitle>
          <CardDescription>
            Gerencie os tópicos que a IA deve observar nas avaliações dos clientes.
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
              <DialogTitle>Nova Categoria</DialogTitle>
              <DialogDescription>
                Adicione um novo tópico ou departamento para avaliação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nome da Categoria</Label>
                <Input
                  id="cat-name"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Ex: Estacionamento"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={!newCat.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-2xl">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-sm">{cat.nome}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleRemove(cat.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
              Nenhuma categoria encontrada. Adicione uma para começar.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
