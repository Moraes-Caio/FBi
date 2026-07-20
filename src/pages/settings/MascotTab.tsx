import { useState, useRef } from 'react'
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
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { ASSISTANT_PERSONALITIES } from '@/lib/mascote-config'
import { Bot, X, Loader2, Camera } from 'lucide-react'

export interface MascoteForm {
  nome: string
  personalidade: string
  foto_url: string
}

export function MascotTab({
  restauranteId,
  value,
  onChange,
  onUploadingChange,
}: {
  restauranteId: number | null
  value: MascoteForm
  onChange: (v: MascoteForm) => void
  onUploadingChange?: (v: boolean) => void
}) {
  const { toast } = useToast()
  const [enviando, setEnviando] = useState(false)
  // Preview local: mostra a imagem escolhida na hora, sem esperar o upload/CDN
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fotoMostrada = preview || value.foto_url

  const handleUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !restauranteId) return

    const objetoUrl = URL.createObjectURL(file)
    setPreview(objetoUrl) // aparece imediatamente
    setEnviando(true)
    onUploadingChange?.(true)

    try {
      const ext = file.name.split('.').pop()
      const caminho = `assistente-${restauranteId}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(caminho, file, { upsert: true })
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(caminho)
      onChange({ ...value, foto_url: publicUrl })

      // só troca o preview pela URL real depois que ela estiver carregada (sem piscar)
      const img = new Image()
      img.onload = () => {
        setPreview(null)
        URL.revokeObjectURL(objetoUrl)
      }
      img.onerror = () => setPreview(null)
      img.src = publicUrl
    } catch (err: any) {
      setPreview(null)
      URL.revokeObjectURL(objetoUrl)
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' })
    } finally {
      setEnviando(false)
      onUploadingChange?.(false)
    }
  }

  const handleRemoveFoto = (e: React.MouseEvent) => {
    e.stopPropagation() // não abrir o seletor de arquivo
    setPreview(null)
    onChange({ ...value, foto_url: '' })
  }

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader>
        <CardTitle>Assistente de IA</CardTitle>
        <CardDescription>
          Configure a identidade e personalidade do assistente virtual que analisa os feedbacks do
          seu restaurante. O nome, a foto e a personalidade aparecem no chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="space-y-3 shrink-0">
            <Label>Foto do Assistente</Label>
            <div
              className="group relative w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => !enviando && fileInputRef.current?.click()}
            >
              {fotoMostrada ? (
                <img src={fotoMostrada} alt="Foto do assistente" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-primary transition-colors">
                  <Bot className="w-8 h-8" />
                  <span className="text-[10px] font-medium">Adicionar foto</span>
                </div>
              )}

              {/* Hover: escurece a foto e mostra as ações sobre ela */}
              {fotoMostrada && !enviando && (
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[10px] text-white font-medium">Trocar</span>
                  <button
                    type="button"
                    onClick={handleRemoveFoto}
                    title="Remover foto"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 text-red-600 flex items-center justify-center hover:bg-white hover:scale-105 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {enviando && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground w-28 leading-snug">
              Clique para trocar. Passe o mouse para remover.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/gif, image/webp"
              onChange={handleUploadFoto}
              disabled={enviando}
            />
          </div>

          <div className="flex-1 space-y-5 w-full">
            <div className="space-y-2">
              <Label htmlFor="assistente-nome">Nome do Assistente</Label>
              <Input
                id="assistente-nome"
                value={value.nome}
                onChange={(e) => onChange({ ...value, nome: e.target.value })}
                placeholder="Ex: Ana, Max, Aria..."
                className="max-w-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistente-personalidade">Personalidade</Label>
              <Select
                value={value.personalidade}
                onValueChange={(v) => onChange({ ...value, personalidade: v })}
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
                {value.personalidade === 'direto_objetivo' &&
                  'Respostas curtas e focadas no que o gestor precisa agir imediatamente.'}
                {value.personalidade === 'detalhado_analitico' &&
                  'Análises aprofundadas com padrões, tendências e correlações dos dados.'}
                {value.personalidade === 'motivador_positivo' &&
                  'Apresenta dados de forma construtiva, destacando oportunidades de melhoria.'}
                {value.personalidade === 'formal_profissional' &&
                  'Linguagem técnica e estruturada para comunicações executivas.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
