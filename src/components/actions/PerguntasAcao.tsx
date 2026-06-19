import { useState, useEffect } from 'react'
import { buscarPerguntasAcao, atualizarPergunta, criarPergunta } from '@/lib/queries/acoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, MessageCircleQuestion, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface PerguntasAcaoProps {
  acaoId: number
  isConcluido?: boolean
}

export function PerguntasAcao({ acaoId, isConcluido }: PerguntasAcaoProps) {
  const [perguntas, setPerguntas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [novaPergunta, setNovaPergunta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [gerandoComIA, setGerandoComIA] = useState(false)

  const carregar = async () => {
    try {
      setLoading(true)
      const data = await buscarPerguntasAcao(acaoId)
      setPerguntas(data || [])
    } catch (err) {
      toast.error('Erro ao carregar perguntas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (acaoId) carregar()
  }, [acaoId])

  const handleToggle = async (id: string, ativa: boolean) => {
    try {
      await atualizarPergunta(id, { ativa })
      setPerguntas((prev) => prev.map((p) => (p.id === id ? { ...p, ativa } : p)))
      toast.success(ativa ? 'Pergunta ativada' : 'Pergunta desativada')
    } catch (err) {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleUpdateText = async (id: string, pergunta: string) => {
    try {
      await atualizarPergunta(id, { pergunta })
      toast.success('Pergunta atualizada')
    } catch (err) {
      toast.error('Erro ao atualizar pergunta')
    }
  }

  const handleAdd = async () => {
    if (!novaPergunta.trim()) return
    try {
      setSalvando(true)
      const data = await criarPergunta({
        acao_id: acaoId,
        pergunta: novaPergunta.trim(),
        ativa: true,
      })
      setPerguntas((prev) => [...prev, data])
      setNovaPergunta('')
      toast.success('Pergunta adicionada')
    } catch (err) {
      toast.error('Erro ao adicionar pergunta')
    } finally {
      setSalvando(false)
    }
  }

  const handleGerarComIA = async () => {
    try {
      setGerandoComIA(true)
      toast.info('Gerando perguntas com IA...')
      const { data, error } = await supabase.functions.invoke('gerar-perguntas-direcionadas', {
        body: { acao_id: acaoId },
      })
      if (error) throw error
      toast.success('Perguntas geradas com sucesso!')
      await carregar()
    } catch (err: any) {
      toast.error('Erro ao gerar perguntas: ' + (err.message || 'tente novamente'))
    } finally {
      setGerandoComIA(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2" onClick={(e) => e.stopPropagation()}>
      {isConcluido && (
        <div className="text-xs bg-slate-100 p-3 rounded-md text-slate-600 mb-4 border border-slate-200">
          Ação concluída. As perguntas de validação foram desativadas automaticamente.
        </div>
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {perguntas.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
          >
            <div className="flex-1 space-y-3">
              <Input
                defaultValue={p.pergunta}
                onBlur={(e) => {
                  if (e.target.value !== p.pergunta && e.target.value.trim()) {
                    handleUpdateText(p.id, e.target.value)
                  }
                }}
                disabled={isConcluido}
                className="bg-white text-sm"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.ativa}
                  onCheckedChange={(v) => handleToggle(p.id, v)}
                  disabled={isConcluido}
                  id={`switch-${p.id}`}
                />
                <Label
                  htmlFor={`switch-${p.id}`}
                  className="text-xs text-muted-foreground font-medium cursor-pointer"
                >
                  {p.ativa ? 'Ativa no n8n' : 'Inativa'}
                </Label>
              </div>
            </div>
          </div>
        ))}

        {perguntas.length === 0 && (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
            <MessageCircleQuestion className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhuma pergunta gerada ainda.</p>
            {!isConcluido && (
              <Button
                size="sm"
                onClick={handleGerarComIA}
                disabled={gerandoComIA}
                variant="outline"
                className="mx-auto"
              >
                {gerandoComIA ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar com IA
              </Button>
            )}
          </div>
        )}
      </div>

      {!isConcluido && (
        <div className="flex items-center gap-2 pt-3 mt-4 border-t">
          <Input
            placeholder="Adicionar nova pergunta manualmente..."
            value={novaPergunta}
            onChange={(e) => setNovaPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={salvando || !novaPergunta.trim()}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
