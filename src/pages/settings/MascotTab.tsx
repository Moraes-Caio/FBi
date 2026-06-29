import { useState, useEffect, useRef } from 'react'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRestauranteConfig } from '@/hooks/use-restaurante-config'
import { ASSISTANT_PERSONALITIES } from '@/lib/mascote-config'
import { Bot, Upload, X } from 'lucide-react'

export function MascotTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const { refetch: refetchConfig } = useRestauranteConfig()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [assistente, setAssistente] = useState({
    nome: '',
    personalidade: 'direto_objetivo',
    foto_url: '',
  })

  useEffect(() => {
    if (!restauranteId) {
      setLoading(false)
      return
    }
    const fetchData = async () => {
      const { data } = await supabase
        .from('config_restaurantes')
        .select('mascote_config')
        .eq('id', restauranteId)
        .single()

      if (data?.mascote_config) {
        const cfg = data.mascote_config as any
        setAssistente({
          nome: cfg.nome || '',
          personalidade: cfg.personalidade || 'direto_objetivo',
          foto_url: cfg.foto_url || '',
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [restauranteId])

  const handleUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !restauranteId) return
    const file = event.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `assistente-${restauranteId}-${Date.now()}.${fileExt}`

    setUploadingFoto(true)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' })
      setUploadingFoto(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setAssistente((prev) => ({ ...prev, foto_url: publicUrl }))
    setUploadingFoto(false)
    toast({ title: 'Foto enviada', description: 'Salve as alterações para confirmar.' })
  }

  const handleRemoveFoto = () => {
    setAssistente((prev) => ({ ...prev, foto_url: '' }))
  }

  const handleSave = async () => {
    if (!restauranteId) return
    setSaving(true)
    const { error } = await supabase
      .from('config_restaurantes')
      .update({ mascote_config: assistente } as any)
      .eq('id', restauranteId)

    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } else {
      refetchConfig()
      toast({ title: 'Sucesso', description: 'Configurações do assistente atualizadas.' })
    }
  }

  if (loading) return <Skeleton className="h-96 w-full animate-fade-in" />

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader>
        <CardTitle>Assistente de IA</CardTitle>
        <CardDescription>
          Configure a identidade e personalidade do assistente virtual que analisa os feedbacks do
          seu restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="space-y-3 shrink-0">
            <Label>Foto do Assistente</Label>
            <div className="relative w-28 h-28">
              <div
                className="w-28 h-28 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 hover:bg-gray-100 transition-all group"
                onClick={() => !uploadingFoto && fileInputRef.current?.click()}
              >
                {assistente.foto_url ? (
                  <img
                    src={assistente.foto_url}
                    alt="Foto do assistente"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-primary transition-colors">
                    <Bot className="w-8 h-8" />
                    <span className="text-[10px] font-medium">Adicionar foto</span>
                  </div>
                )}
                {uploadingFoto && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full">
                    <span className="text-xs text-primary animate-pulse">Enviando...</span>
                  </div>
                )}
              </div>
              {assistente.foto_url && (
                <button
                  onClick={handleRemoveFoto}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleUploadFoto}
                disabled={uploadingFoto}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-28 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {uploadingFoto ? 'Enviando...' : 'Fazer upload'}
            </Button>
          </div>

          <div className="flex-1 space-y-5 w-full">
            <div className="space-y-2">
              <Label htmlFor="assistente-nome">Nome do Assistente</Label>
              <Input
                id="assistente-nome"
                value={assistente.nome}
                onChange={(e) => setAssistente({ ...assistente, nome: e.target.value })}
                placeholder="Ex: Ana, Max, Aria..."
                className="max-w-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistente-personalidade">Personalidade</Label>
              <Select
                value={assistente.personalidade}
                onValueChange={(v) => setAssistente({ ...assistente, personalidade: v })}
              >
                <SelectTrigger id="assistente-personalidade" className="max-w-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ASSISTANT_PERSONALITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {assistente.personalidade === 'direto_objetivo' &&
                  'Respostas curtas e focadas no que o gestor precisa agir imediatamente.'}
                {assistente.personalidade === 'detalhado_analitico' &&
                  'Análises aprofundadas com padrões, tendências e correlações dos dados.'}
                {assistente.personalidade === 'motivador_positivo' &&
                  'Apresenta dados de forma construtiva, destacando oportunidades de melhoria.'}
                {assistente.personalidade === 'formal_profissional' &&
                  'Linguagem técnica e estruturada para comunicações executivas.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 px-6 py-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </CardFooter>
    </Card>
  )
}
