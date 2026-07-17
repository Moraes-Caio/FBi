import { Sparkles } from 'lucide-react'
import { getTema, getFiltro } from '@/lib/qr-temas'
import { WhatsappIcon } from '@/components/WhatsappIcon'

export interface LandingViewProps {
  restauranteNome: string
  garcomNome?: string | null
  modo: string
  imagem?: string | null
  estilo: string
  filtro: string
  mensagem?: string | null
  whatsapp?: string | null
  preview?: boolean // no preview o botão não navega
}

// Textura de fundo com emojis da culinária
function FundoEmojis({ emojis }: { emojis: string[] }) {
  const itens = Array.from({ length: 60 }, (_, i) => emojis[i % emojis.length])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]">
      <div className="flex flex-wrap gap-8 p-6 -rotate-[18deg] scale-150">
        {itens.map((e, i) => (
          <span key={i} className="text-5xl leading-none select-none">{e}</span>
        ))}
      </div>
    </div>
  )
}

export function LandingView({
  restauranteNome, garcomNome, modo, imagem, estilo, filtro, mensagem, whatsapp, preview,
}: LandingViewProps) {
  const tema = getTema(estilo)
  const f = getFiltro(filtro)
  const usaImagem = modo === 'upload' && !!imagem
  const waLink = whatsapp ? `https://wa.me/${whatsapp}` : null

  const Marca = (
    <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-70">
      <Sparkles className="h-3 w-3" />
      <span>Feedback Inteligente · IAMAI</span>
    </div>
  )

  const botaoClasses =
    'inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-lg font-bold shadow-xl transition-transform active:scale-[0.97]'
  const botaoStyle = { background: tema.botao, color: tema.botaoTexto }
  const Botao =
    !whatsapp ? (
      <p className="text-sm opacity-70">WhatsApp ainda não configurado.</p>
    ) : preview || !waLink ? (
      <div className={botaoClasses} style={botaoStyle}>
        <WhatsappIcon className="h-6 w-6" /> Dar meu feedback
      </div>
    ) : (
      <a href={waLink} className={botaoClasses} style={botaoStyle}>
        <WhatsappIcon className="h-6 w-6" /> Dar meu feedback
      </a>
    )

  if (usaImagem) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <img
          src={imagem!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: f.css === 'none' ? undefined : f.css }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="relative z-10 h-full flex flex-col items-center justify-end gap-4 px-5 pb-10 text-white">
          {garcomNome && <p className="text-sm font-medium drop-shadow">Atendimento de {garcomNome}</p>}
          <div className="w-full max-w-xs">{Botao}</div>
          <div className="text-white">{Marca}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full flex flex-col items-center justify-center px-6 py-10 overflow-hidden"
      style={{ background: tema.bg, color: tema.texto }}
    >
      <FundoEmojis emojis={tema.emojis} />
      {f.overlay !== 'transparent' && (
        <div className="pointer-events-none absolute inset-0" style={{ background: f.overlay }} />
      )}

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center gap-5">
        <div className="flex items-center gap-2 text-3xl drop-shadow-sm">
          {tema.emojis.slice(0, 5).map((e, i) => <span key={i}>{e}</span>)}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">Restaurante</p>
          <h1 className="text-3xl font-bold leading-tight">{restauranteNome}</h1>
          {garcomNome && <p className="mt-1 text-sm opacity-85">Atendimento de {garcomNome}</p>}
        </div>
        <p className="text-base opacity-95">
          {mensagem?.trim() || 'É rapidinho! Conte como foi sua experiência com a gente. 💬'}
        </p>
        <div className="mt-1 w-full">{Botao}</div>
        <div className="mt-6">{Marca}</div>
      </div>
    </div>
  )
}
