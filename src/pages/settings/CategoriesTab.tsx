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
  const [bulkText, setBulkText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restauranteId) {
      setLoading(false)
      return
    }
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

  const handleAddSingle = async () => {
    if (!newCat.trim()) return
    if (!restauranteId) {
      toast({ title: 'Erro', description: 'Restaurante não identificado. Recarregue a página.', variant: 'destructive' })
      return
    }
    setSaving(true)

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome: newCat.trim(), restaurante_id: restauranteId, ativa: true })
      .select('id, nome')
      .single()

    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' })
      return
    }
    if (data) setCategories((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNewCat('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: 'Categoria adicionada.' })
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

    const inserts = nomes.map((nome) => ({ nome, restaurante_id: restauranteId, ativa: true }))
    const { data, error } = await supabase.from('categorias').insert(inserts).select('id, nome')

    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' })
      return
    }
    if (data) {
      setCategories((prev) =>
        [...prev, ...data].sort((a, b) => a.nome.localeCompare(b.nome)),
      )
    }
    setBulkText('')
    setIsOpen(false)
    toast({ title: 'Sucesso', description: `${nomes.length} categoria(s) adicionada(s).` })
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja remover esta categoria? Ela será arquivada para preservar o histórico.'))
      return
    const { error } = await supabase.from('categorias').update({ ativa: false }).eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' })
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
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); setNewCat(''); setBulkText('') }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Categorias</DialogTitle>
              <DialogDescription>
                Adicione uma categoria individual ou várias de uma vez.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="individual" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
                <TabsTrigger value="varios" className="flex-1">Várias de uma vez</TabsTrigger>
              </TabsList>
              <TabsContent value="individual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Nome da Categoria</Label>
                  <Input
                    id="cat-name"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="Ex: Atendimento, Limpeza, Cardápio..."
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSingle()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddSingle} disabled={!newCat.trim() || saving}>
                    {saving ? 'Salvando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="varios" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-cats">Uma categoria por linha</Label>
                  <Textarea
                    id="bulk-cats"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"Atendimento\nLimpeza\nCardápio\nAmbiente\nTempo de espera"}
                    rows={7}
                    className="resize-none"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    {bulkText.split('\n').filter((l) => l.trim()).length} categoria(s) detectada(s)
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddBulk} disabled={!bulkText.trim() || saving}>
                    {saving ? 'Salvando...' : 'Adicionar todas'}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
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
