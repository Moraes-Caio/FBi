import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Link em fundo claro (respostas da IA). */
const LINK_CLARO =
  'text-[#1D4ED8] font-medium underline underline-offset-2 break-all hover:text-blue-800 transition-colors'
/** Link em fundo escuro (bolha azul do usuário) — precisa de contraste alto. */
export const LINK_ESCURO =
  'text-white font-semibold underline underline-offset-2 decoration-white/70 break-all hover:decoration-white transition-colors'

/** URL solta no texto (sem markdown), com ou sem http:// na frente. */
const URL_SOLTA = /((?:https?:\/\/|www\.)[^\s<>()[\]{}"']+[^\s<>()[\]{}"'.,;:!?])/gi

export function parseInline(text: string, classeLink: string = LINK_CLARO): ReactNode[] {
  const CLASSE_LINK = classeLink
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
    if (linkMatch) {
      const url = linkMatch[2]
      const label = linkMatch[1]
      if (url.startsWith('/')) {
        return (
          <Link
            key={i}
            to={url}
            className="text-[#1D4ED8] font-medium underline hover:text-blue-800 transition-colors"
          >
            {label}
          </Link>
        )
      }
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={CLASSE_LINK}>
          {label}
        </a>
      )
    }

    // Texto comum: transforma URLs soltas em links clicáveis
    const pedacos = part.split(URL_SOLTA)
    if (pedacos.length === 1) return <span key={i}>{part}</span>
    return (
      <span key={i}>
        {pedacos.map((p, j) => {
          if (!p) return null
          if (!URL_SOLTA.test(p)) {
            URL_SOLTA.lastIndex = 0
            return <span key={j}>{p}</span>
          }
          URL_SOLTA.lastIndex = 0
          const href = p.startsWith('http') ? p : `https://${p}`
          return (
            <a key={j} href={href} target="_blank" rel="noopener noreferrer" className={CLASSE_LINK}>
              {p}
            </a>
          )
        })}
      </span>
    )
  })
}

export function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.trim().startsWith('- ')) {
          return (
            <li key={i} className="ml-5 list-disc marker:text-gray-400">
              {parseInline(line.substring(2))}
            </li>
          )
        }
        if (line.trim().match(/^\d+\.\s/)) {
          const content = line.trim().replace(/^\d+\.\s/, '')
          return (
            <li key={i} className="ml-5 list-decimal marker:text-gray-400">
              {parseInline(content)}
            </li>
          )
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1" />
        }
        return (
          <p key={i} className="leading-relaxed">
            {parseInline(line)}
          </p>
        )
      })}
    </div>
  )
}
