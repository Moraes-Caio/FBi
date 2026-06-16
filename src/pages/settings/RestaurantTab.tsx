import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Upload, Store, MessageCircle, Link as LinkIcon } from 'lucide-react'

export function RestaurantTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    nome_restaurante: '',
    detalhes: '',
    logo_url: '',
    numero_whatsapp: '',
    texto_banner: '',
    whatsapp_instancia: '',
    whatsapp_token: '',
  })

  useEffect(() => {
    if (!restauranteId) return
    const fetchData = async () => {
      const { data } = await supabase
        .from('config_restaurantes')
        .select('*')
        .eq('id', restauranteId)
        .single()

      if (data) {
        setFormData({
          nome_restaurante: data.nome_restaurante || '',
          detalhes: (data as any).detalhes || '',
          logo_url: (data as any).logo_url || '',
          numero_whatsapp: data.numero_whatsapp || '',
          texto_banner: data.texto_banner || '',
          whatsapp_instancia: data.whatsapp_instancia || '',
          whatsapp_token: data.whatsapp_token || '',
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [restauranteId])

  const handleSave = async () => {
    if (!restauranteId) return
    setSaving(true)
    const { error } = await supabase
      .from('config_restaurantes')
      .update({
        nome_restaurante: formData.nome_restaurante,
        detalhes: formData.detalhes,
        logo_url: formData.logo_url,
        numero_whatsapp: formData.numero_whatsapp,
        texto_banner: formData.texto_banner,
        whatsapp_instancia: formData.whatsapp_instancia,
        whatsapp_token: formData.whatsapp_token,
      } as any)
      .eq('id', restauranteId)

    setSaving(false)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Dados do restaurante atualizados.' })
    }
  }

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !restauranteId) return
    const file = event.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `logo-${restauranteId}-${Math.random()}.${fileExt}`

    setUploadingLogo(true)
    const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file)

    if (uploadError) {
      toast({ title: 'Erro', description: 'Falha no upload do logotipo.', variant: 'destructive' })
      setUploadingLogo(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('logos').getPublicUrl(filePath)

    setFormData((prev) => ({ ...prev, logo_url: publicUrl }))

    const { error: updateError } = await supabase
      .from('config_restaurantes')
      .update({ logo_url: publicUrl } as any)
      .eq('id', restauranteId)

    if (updateError) {
      toast({
        title: 'Erro',
        description: 'Logotipo carregado, mas erro ao salvar.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Logotipo atualizado com sucesso.' })
    }

    setUploadingLogo(false)
  }

  if (loading) return <Skeleton className="h-[500px] w-full animate-fade-in rounded-xl" />

  return (
    <Card className="shadow-subtle border-gray-200/75 rounded-xl overflow-hidden">
      <CardHeader className="bg-white pb-6 border-b border-gray-100">
        <CardTitle className="text-xl">Perfil do Restaurante</CardTitle>
        <CardDescription className="text-sm mt-1">
          Gerencie a identidade visual, informações principais e credenciais de conexão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10 p-6 sm:p-8 bg-white">
        {/* Identidade do Restaurante */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">Identidade da Marca</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="space-y-3 shrink-0">
              <Label className="text-gray-700">Logotipo</Label>
              <div
                className="flex flex-col items-center justify-center w-36 h-36 border border-gray-200 rounded-xl bg-gray-50 relative overflow-hidden group cursor-pointer hover:border-primary/50 hover:bg-gray-100 transition-all duration-200"
                onClick={() => !uploadingLogo && fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Upload className="w-5 h-5 text-white mb-1.5" />
                  <span className="text-[11px] text-white font-medium tracking-wide">
                    Trocar Logo
                  </span>
                </div>
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo do Restaurante"
                    className="w-full h-full object-contain p-2 bg-white"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Nenhuma logo</span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
                    <span className="text-xs font-medium text-primary animate-pulse">
                      Enviando...
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleUploadLogo}
                  disabled={uploadingLogo}
                />
              </div>
            </div>

            <div className="flex-1 space-y-5 w-full">
              <div className="space-y-2">
                <Label htmlFor="nome_restaurante" className="text-gray-700">
                  Nome do Restaurante
                </Label>
                <Input
                  id="nome_restaurante"
                  value={formData.nome_restaurante}
                  onChange={(e) => setFormData({ ...formData, nome_restaurante: e.target.value })}
                  placeholder="Nome público do seu restaurante"
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detalhes" className="text-gray-700">
                  Detalhes & Especialidade
                </Label>
                <Textarea
                  id="detalhes"
                  value={formData.detalhes}
                  onChange={(e) => setFormData({ ...formData, detalhes: e.target.value })}
                  placeholder="Conte um pouco sobre a especialidade, história ou diferenciais do restaurante..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gray-100" />

        {/* Integrações e Sistema */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">Integrações e Comunicação</h3>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="numero_whatsapp" className="text-gray-700 flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Número do WhatsApp
                </Label>
                <Input
                  id="numero_whatsapp"
                  value={formData.numero_whatsapp}
                  onChange={(e) => setFormData({ ...formData, numero_whatsapp: e.target.value })}
                  placeholder="Ex: 5511999999999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="texto_banner" className="text-gray-700">
                  Texto do Banner de Relatórios
                </Label>
                <Input
                  id="texto_banner"
                  value={formData.texto_banner}
                  onChange={(e) => setFormData({ ...formData, texto_banner: e.target.value })}
                  placeholder="Texto dinâmico no topo do dashboard"
                />
              </div>
            </div>

            <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200/60">
              <h4 className="text-[13px] font-medium text-gray-900 mb-4">
                Credenciais da API do WhatsApp
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_instancia" className="text-gray-600 text-xs">
                    ID da Instância
                  </Label>
                  <Input
                    id="whatsapp_instancia"
                    value={formData.whatsapp_instancia}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp_instancia: e.target.value })
                    }
                    placeholder="Identificador da instância"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_token" className="text-gray-600 text-xs">
                    Token de Acesso
                  </Label>
                  <Input
                    id="whatsapp_token"
                    type="password"
                    value={formData.whatsapp_token}
                    onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                    placeholder="Token da API"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </CardContent>
      <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 sm:px-8 py-5 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </CardFooter>
    </Card>
  )
}
