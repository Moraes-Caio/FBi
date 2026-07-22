import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Renderiza o PDF por conta própria, com pdfjs, desenhando cada página num
 * canvas.
 *
 * Por que não <iframe>/<object>: o navegador só exibe inline quando o servidor
 * manda os cabeçalhos certos. Arquivos gravados sem content-type (ou com
 * content-disposition de download) viram tela em branco ou caixa de "salvar".
 * Desenhando aqui, o resultado não depende de como o arquivo foi armazenado.
 */
export function VisualizadorPdf({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    const container = containerRef.current
    if (!container) return

    const desenhar = async () => {
      setCarregando(true)
      setErro(null)
      container.innerHTML = ''
      try {
        const pdfjs: any = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = (
          await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ).default

        const resposta = await fetch(url)
        if (!resposta.ok) throw new Error(`não consegui baixar o arquivo (${resposta.status})`)
        const dados = await resposta.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: dados }).promise
        if (cancelado) return

        const largura = container.clientWidth || 340
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelado) return
          const pagina = await pdf.getPage(i)
          const base = pagina.getViewport({ scale: 1 })
          // Ajusta a página à largura disponível e dobra a resolução do canvas
          // para não ficar borrado em telas retina
          const escala = (largura / base.width) * (window.devicePixelRatio || 1)
          const viewport = pagina.getViewport({ scale: escala })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.className = 'rounded-md shadow-sm bg-white mb-3'
          container.appendChild(canvas)

          await pagina.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
        }
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || 'não foi possível abrir este PDF')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    desenhar()
    return () => {
      cancelado = true
    }
  }, [url])

  return (
    <div className="h-full w-full overflow-y-auto sem-barra p-3">
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Abrindo o PDF…
        </div>
      )}
      {erro && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {erro}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline ml-1"
          >
            Abrir em nova aba
          </a>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}
