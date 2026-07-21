import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormularioIA, CampoFormulario } from '@/lib/queries/agente-ia'

/**
 * Formulário que ocupa o lugar do campo de digitação, uma pergunta por vez.
 * Perguntas com opções viram botões; sem opções, cai direto num campo de texto.
 */
export function FormularioInline({
  formulario,
  onEnviar,
  onCancelar,
}: {
  formulario: FormularioIA
  onEnviar: (respostas: Record<string, string>) => void
  onCancelar: () => void
}) {
  const [passo, setPasso] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [escrevendo, setEscrevendo] = useState(false)
  const [texto, setTexto] = useState('')

  const campo: CampoFormulario | undefined = formulario.campos[passo]
  const ultimo = passo === formulario.campos.length - 1
  if (!campo) return null

  const temOpcoes = (campo.tipo === 'escolha' || campo.tipo === 'multipla') && !!campo.opcoes?.length
  // Sem opções, já começa no campo aberto — não faz sentido pedir para "escrever"
  const modoTexto = !temOpcoes || escrevendo

  const avancar = (valor: string) => {
    const novas = { ...respostas, [campo.nome]: valor }
    setRespostas(novas)
    setTexto('')
    setEscrevendo(false)
    if (ultimo) onEnviar(novas)
    else setPasso((p) => p + 1)
  }

  const pular = () => {
    if (ultimo) onEnviar(respostas)
    else setPasso((p) => p + 1)
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] overflow-hidden">
      <div className="flex items-start gap-2 px-3 pt-2.5">
        <div className="min-w-0 flex-1">
          {passo === 0 && (
            <p className="text-[11px] font-semibold text-primary leading-snug">{formulario.titulo}</p>
          )}
          <p className="text-sm text-foreground mt-0.5">{campo.label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {formulario.campos.length > 1 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {passo + 1}/{formulario.campos.length}
            </span>
          )}
          <button
            onClick={onCancelar}
            title="Cancelar"
            className="h-5 w-5 rounded-full text-gray-400 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2.5 pt-2 space-y-2">
        {temOpcoes && !escrevendo && (
          <div className="flex flex-wrap gap-1.5">
            {campo.opcoes!.map((o) => (
              <button
                key={o}
                onClick={() => avancar(o)}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {o}
              </button>
            ))}
            <button
              onClick={() => setEscrevendo(true)}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Escrever…
            </button>
          </div>
        )}

        {modoTexto && (
          <div className="flex items-end gap-2">
            {campo.tipo === 'numero' || campo.tipo === 'data' ? (
              <Input
                autoFocus
                type={campo.tipo === 'numero' ? 'number' : 'date'}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && texto.trim()) avancar(texto.trim())
                }}
                className="h-9 text-sm bg-white"
              />
            ) : (
              <Textarea
                autoFocus
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && texto.trim()) {
                    e.preventDefault()
                    avancar(texto.trim())
                  }
                }}
                placeholder="Sua resposta"
                className="resize-none text-sm bg-white min-h-[38px]"
              />
            )}
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg bg-[#1D4ED8] hover:bg-blue-800"
              disabled={!texto.trim()}
              onClick={() => avancar(texto.trim())}
            >
              {ultimo ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {!campo.obrigatorio && (
          <button
            onClick={pular}
            className={cn('text-[11px] text-muted-foreground hover:text-foreground transition-colors')}
          >
            {ultimo ? 'Pular e criar' : 'Pular esta'}
          </button>
        )}
      </div>
    </div>
  )
}
