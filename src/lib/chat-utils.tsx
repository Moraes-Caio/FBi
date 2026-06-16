import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function parseInline(text: string): ReactNode[] {
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
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1D4ED8] font-medium underline hover:text-blue-800 transition-colors"
        >
          {label}
        </a>
      )
    }
    return <span key={i}>{part}</span>
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
