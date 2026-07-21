import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { AcaoAgente, ACOES_DESTRUTIVAS, CAMPOS_CONFIG } from '@/lib/queries/agente-ia'

const ROTULO_TIPO: Record<string, string> = {
  criar_acao: 'Criar ação',
  editar_acao: 'Editar ação',
  excluir_acao: 'Excluir ação',
  criar_insight: 'Criar insight',
  editar_insight: 'Editar insight',
  excluir_insight: 'Arquivar insight',
  atualizar_config: 'Alterar configuração',
  criar_anotacao: 'Guardar anotação',
  excluir_anotacao: 'Apagar anotação',
}

/** Mostra os dados da alteração de forma legível, sem JSON cru. */
function Detalhes({ acao }: { acao: AcaoAgente }) {
  const d = acao.dados || {}

  if (acao.tipo === 'atualizar_config') {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="text-xs text-muted-foreground">{CAMPOS_CONFIG[d.campo] || d.campo}</p>
        <p className="font-medium text-foreground mt-0.5">{String(d.valor)}</p>
      </div>
    )
  }

  const linhas = Object.entries(d).filter(([k, v]) => k !== 'id' && String(v ?? '').trim())
  if (!linhas.length) return null

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      {linhas.map(([k, v]) => (
        <div key={k}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {k.replace(/_/g, ' ')}
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{String(v)}</p>
        </div>
      ))}
    </div>
  )
}

export function ConfirmacaoAcao({
  acao,
  onConfirmar,
  onCancelar,
}: {
  acao: AcaoAgente
  onConfirmar: () => Promise<void>
  onCancelar: () => void
}) {
  const [salvando, setSalvando] = useState(false)
  const destrutiva = ACOES_DESTRUTIVAS.includes(acao.tipo)

  const confirmar = async () => {
    setSalvando(true)
    try {
      await onConfirmar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !salvando) onCancelar() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destrutiva && <AlertTriangle className="h-4 w-4 text-rose-500" />}
            {ROTULO_TIPO[acao.tipo] || 'Confirmar alteração'}
          </DialogTitle>
          <DialogDescription>{acao.descricao}</DialogDescription>
        </DialogHeader>

        <Detalhes acao={acao} />

        {destrutiva && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            Essa alteração remove um item. Você poderá desfazer depois, mas confira antes.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={salvando}
            className={destrutiva ? 'bg-rose-600 hover:bg-rose-700' : ''}
          >
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {salvando ? 'Aplicando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
