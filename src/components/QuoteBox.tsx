import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuoteInfo {
  autorLabel: string
  texto: string
}

/** Caixinha de citação (responder mensagem), estilo WhatsApp. */
export function QuoteBox({ quote, onRemove, onClick, className }: {
  quote: QuoteInfo
  onRemove?: () => void
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-stretch gap-2 rounded-lg bg-black/[0.06] overflow-hidden text-left',
        onClick ? 'cursor-pointer' : '',
        className,
      )}
      onClick={onClick}
    >
      <div className="w-1 shrink-0 bg-[#128C7E]" />
      <div className="py-1 pr-2 min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[#128C7E] truncate">{quote.autorLabel}</p>
        <p className="text-[12px] text-gray-600 truncate">{quote.texto || 'mensagem'}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="px-2 flex items-center text-gray-400 hover:text-gray-600 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
