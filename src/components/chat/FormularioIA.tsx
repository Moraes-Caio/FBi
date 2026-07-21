import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FormularioIA as Formulario, CampoFormulario } from '@/lib/queries/agente-ia'

const OUTRO = '__outro__'

/**
 * Formulário que a própria IA monta quando falta informação.
 * Toda escolha tem a opção "outro" para o dono escrever do jeito dele.
 */
export function FormularioIA({
  formulario,
  onEnviar,
  onCancelar,
}: {
  formulario: Formulario
  onEnviar: (respostas: Record<string, string>) => void
  onCancelar: () => void
}) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [outros, setOutros] = useState<Record<string, string>>({})

  const set = (nome: string, v: string) => setValores((p) => ({ ...p, [nome]: v }))

  const valorFinal = (c: CampoFormulario) =>
    valores[c.nome] === OUTRO ? (outros[c.nome] || '') : (valores[c.nome] || '')

  const faltando = formulario.campos.some((c) => c.obrigatorio && !valorFinal(c).trim())

  const enviar = () => {
    const r: Record<string, string> = {}
    for (const c of formulario.campos) {
      const v = valorFinal(c).trim()
      if (v) r[c.nome] = v
    }
    onEnviar(r)
  }

  const renderCampo = (c: CampoFormulario) => {
    if (c.tipo === 'escolha' || c.tipo === 'multipla') {
      const opcoes = [...(c.opcoes || [])]
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => set(c.nome, o)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  valores[c.nome] === o
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted-foreground border-gray-200 hover:border-primary/40',
                )}
              >
                {o}
              </button>
            ))}
            <button
              type="button"
              onClick={() => set(c.nome, OUTRO)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                valores[c.nome] === OUTRO
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-foreground border-gray-200 hover:border-primary/40',
              )}
            >
              Outro…
            </button>
          </div>
          {valores[c.nome] === OUTRO && (
            <Input
              autoFocus
              value={outros[c.nome] || ''}
              onChange={(e) => setOutros((p) => ({ ...p, [c.nome]: e.target.value }))}
              placeholder="Escreva do seu jeito"
            />
          )}
        </div>
      )
    }

    if (c.tipo === 'numero' || c.tipo === 'data') {
      return (
        <Input
          type={c.tipo === 'numero' ? 'number' : 'date'}
          value={valores[c.nome] || ''}
          onChange={(e) => set(c.nome, e.target.value)}
        />
      )
    }

    return (
      <Textarea
        rows={3}
        className="resize-none"
        value={valores[c.nome] || ''}
        onChange={(e) => set(c.nome, e.target.value)}
        placeholder="Sua resposta"
      />
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancelar() }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{formulario.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          {formulario.campos.map((c) => (
            <div key={c.nome} className="space-y-2">
              <Label>
                {c.label}
                {c.obrigatorio && <span className="text-rose-500 ml-0.5">*</span>}
              </Label>
              {renderCampo(c)}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancelar}>Agora não</Button>
          <Button onClick={enviar} disabled={faltando}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
