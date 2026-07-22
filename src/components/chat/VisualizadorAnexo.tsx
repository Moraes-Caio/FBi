import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'
import { VisualizadorPdf } from '@/components/chat/VisualizadorPdf'

export interface AnexoVisivel {
  nome: string
  tipo: 'imagem' | 'pdf' | 'texto'
  url?: string
  texto?: string
}

/**
 * Ocupa o lugar do chat para mostrar o anexo em tamanho cheio.
 * Imagem e PDF são renderizados pelo próprio navegador; texto é exibido direto.
 */
export function VisualizadorAnexo({ anexo, onVoltar }: { anexo: AnexoVisivel; onVoltar: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 p-3 border-b shrink-0">
        <button
          onClick={onVoltar}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 shrink-0"
          title="Voltar ao chat"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium truncate flex-1">{anexo.nome}</p>
        {anexo.url && (
          <>
            <a
              href={anexo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={anexo.url}
              download={anexo.nome}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              title="Baixar"
            >
              <Download className="h-4 w-4" />
            </a>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto sem-barra bg-gray-50">
        {anexo.tipo === 'imagem' && anexo.url && (
          <div className="h-full w-full flex items-center justify-center p-3">
            <img src={anexo.url} alt={anexo.nome} className="max-h-full max-w-full object-contain" />
          </div>
        )}

        {anexo.tipo === 'pdf' && anexo.url && <VisualizadorPdf url={anexo.url} />}

        {anexo.tipo === 'texto' && (
          <pre className="p-4 text-xs whitespace-pre-wrap break-words text-gray-800 font-mono">
            {anexo.texto}
          </pre>
        )}
      </div>
    </div>
  )
}
