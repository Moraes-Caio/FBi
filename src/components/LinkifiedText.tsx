import { Fragment } from 'react'

// Detecta URLs (http/https ou começando com www.)
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

/**
 * Renderiza texto preservando quebras de linha e transformando URLs em links clicáveis.
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE)
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (!part) return null
        if (/^(https?:\/\/|www\.)/i.test(part)) {
          // Separa pontuação final que não faz parte do link (ex: "veja x.com.")
          const trailing = part.match(/[.,;:!?)\]}'"]+$/)?.[0] ?? ''
          const url = trailing ? part.slice(0, part.length - trailing.length) : part
          const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url
          return (
            <Fragment key={i}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
              {trailing}
            </Fragment>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </p>
  )
}
