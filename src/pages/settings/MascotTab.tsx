import { useState, useEffect } from 'react'
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { MASCOT_NAMES, MASCOT_PERSONALITIES, MASCOT_AVATARS } from '@/lib/mascote-config'

export function MascotTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [mascoteConfig, setMascoteConfig] = useState({
    nome: 'Chef Pepê',
    personalidade: 'profissional_amigavel',
  })

  const [configInsights, setConfigInsights] = useState({
    feedbacks_por_analise: 10,
    horas_entre_analises: 24,
    max_importantes: 5,
    max_observacoes: 3,
    max_sugestoes_acoes_por_ciclo: 3,
  })

  useEffect(() => {
    if (!restauranteId) return
    const fetchData = async () => {
      const { data } = await supabase
        .from('config_restaurantes')
        .select('mascote_config, config_insights')
        .eq('id', restauranteId)
        .single()

      if (data) {
        if (data.mascote_config) setMascoteConfig(data.mascote_config as any)
        if (data.config_insights) setConfigInsights(data.config_insights as any)
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
        mascote_config: mascoteConfig,
        config_insights: configInsights,
      })
      .eq('id', restauranteId)

    setSaving(false)
    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações da IA.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de IA e mascote atualizadas.' })
    }
  }

  if (loading) return <Skeleton className="h-96 w-full animate-fade-in" />

  const avatarUrl = MASCOT_AVATARS[mascoteConfig.nome] || MASCOT_AVATARS['Chef Pepê']

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader>
        <CardTitle>Mascote e IA</CardTitle>
        <CardDescription>
          Personalize a identidade do seu assistente virtual e as regras de análise da inteligência
          artificial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="space-y-3 flex-shrink-0">
            <Label>Pré-visualização</Label>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted/50 shadow-sm bg-muted">
              <img src={avatarUrl} alt="Avatar do Mascote" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 space-y-5 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mascot-name">Nome do Mascote</Label>
                <Select
                  value={mascoteConfig.nome}
                  onValueChange={(v) => setMascoteConfig({ ...mascoteConfig, nome: v })}
                >
                  <SelectTrigger id="mascot-name">
                    <SelectValue placeholder="Selecione o mascote" />
                  </SelectTrigger>
                  <SelectContent>
                    {MASCOT_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personality">Personalidade</Label>
                <Select
                  value={mascoteConfig.personalidade}
                  onValueChange={(v) => setMascoteConfig({ ...mascoteConfig, personalidade: v })}
                >
                  <SelectTrigger id="personality">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MASCOT_PERSONALITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full mt-6 border rounded-lg bg-card">
          <AccordionItem value="avancadas" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium px-4 hover:no-underline hover:bg-muted/50 rounded-lg">
              Configurações Avançadas de IA
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="feedbacks_por_analise">Feedbacks por análise</Label>
                  <Input
                    id="feedbacks_por_analise"
                    type="number"
                    value={configInsights.feedbacks_por_analise}
                    onChange={(e) =>
                      setConfigInsights({
                        ...configInsights,
                        feedbacks_por_analise: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horas_entre_analises">Horas entre análises</Label>
                  <Input
                    id="horas_entre_analises"
                    type="number"
                    value={configInsights.horas_entre_analises}
                    onChange={(e) =>
                      setConfigInsights({
                        ...configInsights,
                        horas_entre_analises: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_importantes">Máximo de Insights Importantes</Label>
                  <Input
                    id="max_importantes"
                    type="number"
                    value={configInsights.max_importantes}
                    onChange={(e) =>
                      setConfigInsights({
                        ...configInsights,
                        max_importantes: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_observacoes">Máximo de Observações</Label>
                  <Input
                    id="max_observacoes"
                    type="number"
                    value={configInsights.max_observacoes}
                    onChange={(e) =>
                      setConfigInsights({
                        ...configInsights,
                        max_observacoes: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2 md:max-w-[50%] md:pr-3">
                  <Label htmlFor="max_sugestoes_acoes_por_ciclo">
                    Máximo de Sugestões de Ações (Por Ciclo)
                  </Label>
                  <Input
                    id="max_sugestoes_acoes_por_ciclo"
                    type="number"
                    value={configInsights.max_sugestoes_acoes_por_ciclo}
                    onChange={(e) =>
                      setConfigInsights({
                        ...configInsights,
                        max_sugestoes_acoes_por_ciclo: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 px-6 py-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </CardFooter>
    </Card>
  )
}
