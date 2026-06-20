import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Loader2, TrendingUp, Star, Brain, ArrowUpRight, Sparkles } from 'lucide-react'

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="12" fill="#2563EB" />
      <path
        d="M10 28 L17 19 L23 22.5 L30 12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.45"
      />
      <circle cx="30" cy="12" r="3.5" fill="white" />
      <circle cx="17" cy="19" r="2.5" fill="white" fillOpacity="0.6" />
    </svg>
  )
}

function WhatsAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) return

    setIsLoading(true)
    const { error } = await login(email, senha)
    setIsLoading(false)

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description:
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message,
        variant: 'destructive',
      })
    } else {
      navigate(from, { replace: true })
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: '52px',
    padding: '0 16px',
    fontSize: '14px',
    backgroundColor: '#F8FAFC',
    border: '1.5px solid #E9EEF5',
    borderRadius: '12px',
    color: '#0F172A',
    outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.025)',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#2563EB'
    e.target.style.backgroundColor = '#FFFFFF'
    e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.10)'
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#E9EEF5'
    e.target.style.backgroundColor = '#F8FAFC'
    e.target.style.boxShadow = 'inset 0 1px 2px rgba(15,23,42,0.025)'
  }

  const cardHoverIn = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = `${el.dataset.rot || ''} translateY(-4px)`
  }
  const cardHoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = `${el.dataset.rot || ''}`
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FFFFFF' }}>

      {/* ─── PAINEL ESQUERDO: peça visual clara ─── */}
      <div
        className="hidden lg:block"
        style={{
          width: '54%',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #F5F9FF 0%, #EEF6FF 50%, #F0FBFF 100%)',
          flexShrink: 0,
        }}
      >
        {/* blur orbs */}
        <div style={{ position: 'absolute', top: '-100px', left: '-60px', width: '460px', height: '460px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', bottom: '-120px', right: '-40px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', top: '45%', left: '30%', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.13) 0%, transparent 65%)', filter: 'blur(24px)' }} />

        <div style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', flexDirection: 'column', padding: '48px 52px' }}>

          {/* Marca topo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrandMark size={34} />
            <span style={{ color: '#0F172A', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
              Feedback Inteligente
            </span>
          </div>

          {/* Headline */}
          <div style={{ marginTop: '44px', maxWidth: '440px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.13, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: '16px' }}>
              Inteligência operacional para{' '}
              <span style={{ background: 'linear-gradient(95deg, #3B82F6 0%, #8B5CF6 55%, #14B8A6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                restaurantes que crescem.
              </span>
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7 }}>
              Cada feedback do WhatsApp vira decisão. A IA lê, classifica e sugere ações antes que um cliente insatisfeito vire uma avaliação negativa.
            </p>
          </div>

          {/* composição flutuante */}
          <div style={{ position: 'relative', flex: 1, marginTop: '36px' }}>

            {/* Mockup principal inclinado */}
            <div
              data-rot="rotate(-6deg)"
              onMouseEnter={cardHoverIn}
              onMouseLeave={cardHoverOut}
              style={{
                position: 'absolute', top: '20px', left: '8px', width: '340px',
                transform: 'rotate(-6deg)',
                background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.9)', borderRadius: '18px',
                boxShadow: '0 24px 60px rgba(37,99,235,0.14), 0 2px 8px rgba(15,23,42,0.04)',
                padding: '20px', transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Satisfação · 7 dias</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>
                  <ArrowUpRight className="h-3 w-3" /> +12%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px', height: '72px' }}>
                {[40, 55, 48, 68, 60, 82, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 2px 2px', background: i === 6 ? 'linear-gradient(180deg, #3B82F6, #14B8A6)' : 'linear-gradient(180deg, #BFDBFE, #DBEAFE)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>4.8</span>
                <div style={{ display: 'flex', gap: '1px', color: '#F59E0B' }}>
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3" fill="currentColor" />)}
                </div>
              </div>
            </div>

            {/* Card insight IA — pulsação suave */}
            <div
              data-rot="rotate(4deg)"
              onMouseEnter={cardHoverIn}
              onMouseLeave={cardHoverOut}
              className="animate-pulse-soft"
              style={{
                position: 'absolute', top: '0px', right: '14px', width: '264px',
                transform: 'rotate(4deg)',
                background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.9)', borderRadius: '16px',
                boxShadow: '0 20px 48px rgba(139,92,246,0.14)', padding: '16px 18px',
                transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Brain className="h-3.5 w-3.5" />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B5CF6' }}>
                  Insight da IA
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.55 }}>
                "Aumento de reclamações sobre <strong style={{ color: '#0F172A' }}>tempo de espera</strong> no jantar — sugerir reforço no turno."
              </p>
            </div>

            {/* Pílula 12 min */}
            <div
              data-rot="rotate(-3deg)"
              onMouseEnter={cardHoverIn}
              onMouseLeave={cardHoverOut}
              style={{
                position: 'absolute', top: '188px', right: '54px',
                transform: 'rotate(-3deg)',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.9)', borderRadius: '14px',
                boxShadow: '0 16px 40px rgba(20,184,166,0.16)', padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: '11px',
                transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488' }}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>12 min</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Tempo médio de resposta</div>
              </div>
            </div>

            {/* Pílula 12.845 */}
            <div
              data-rot="rotate(3deg)"
              onMouseEnter={cardHoverIn}
              onMouseLeave={cardHoverOut}
              style={{
                position: 'absolute', top: '264px', left: '40px',
                transform: 'rotate(3deg)',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.9)', borderRadius: '14px',
                boxShadow: '0 16px 40px rgba(37,99,235,0.14)', padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: '11px',
                transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#14B8A6' }} />
                <span style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', backgroundColor: 'rgba(20,184,166,0.3)' }} className="animate-ping" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>12.845</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Feedbacks analisados por IA</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PAINEL DIREITO: Auth ─── */}
      <div className="flex-1 flex items-center justify-center" style={{ position: 'relative', padding: '32px 24px', background: 'linear-gradient(155deg, #EAF1FF 0%, #F0F4FF 40%, #EAF7FB 100%)', overflow: 'hidden' }}>

        {/* Blur orbs ambientais — preenchem o espaço com tons variados */}
        <div style={{ position: 'absolute', top: '-80px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 65%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-70px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 65%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '12%', left: '8%', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 68%)', filter: 'blur(26px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '14%', right: '6%', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 68%)', filter: 'blur(24px)', pointerEvents: 'none' }} />

        {/* Grid translúcido sutil */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 78%)', WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 78%)' }} />

        {/* Wrapper do login com halo de destaque */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px' }}>
          {/* Halo gradiente difuso atrás do card (destaque) */}
          <div style={{ position: 'absolute', inset: '-30px', borderRadius: '44px', background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(139,92,246,0.09) 45%, transparent 72%)', filter: 'blur(22px)', pointerEvents: 'none' }} />

          {/* Superfície de login — branca, contorno fino, destaque forte */}
          <div
            className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.9)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 70px rgba(37,99,235,0.16), 0 12px 28px rgba(15,23,42,0.08), 0 0 0 1px rgba(37,99,235,0.06)',
            }}
          >
          <div style={{ maxWidth: '340px', margin: '0 auto' }}>

          {/* Marca — só ícone */}
          <div style={{ marginBottom: '24px' }}>
            <BrandMark size={36} />
          </div>

          {/* Cabeçalho */}
          <div style={{ marginBottom: '14px' }}>
            <h1 style={{ fontSize: '23px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Bem-vindo de volta
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B' }}>
              Acesse o painel de gestão do seu restaurante
            </p>
          </div>

          {/* Micro-badge de prova */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', border: '1px solid #E9EEF5', borderRadius: '999px', padding: '4px 11px', marginBottom: '28px' }}>
            <Sparkles className="h-3 w-3" style={{ color: '#8B5CF6' }} />
            <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748B' }}>
              +12.000 feedbacks analisados por IA
            </span>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Email</label>
                <input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required disabled={isLoading} style={inputBase}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>

              {/* Senha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="senha" style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Senha</label>
                  <Link
                    to="/recuperar-senha"
                    style={{ fontSize: '13px', fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1D4ED8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#2563EB')}
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="senha" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={senha} onChange={(e) => setSenha(e.target.value)}
                    required disabled={isLoading}
                    style={{ ...inputBase, paddingRight: '46px' }}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)} disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8', display: 'flex', alignItems: 'center', lineHeight: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#64748B')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Lembrar-me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <button
                  type="button" role="checkbox" aria-checked={rememberMe}
                  onClick={() => setRememberMe((v) => !v)} disabled={isLoading}
                  style={{ width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${rememberMe ? '#2563EB' : '#CBD5E1'}`, backgroundColor: rememberMe ? '#2563EB' : 'transparent', cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s', padding: 0 }}
                >
                  {rememberMe && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  style={{ fontSize: '13px', color: '#64748B', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => !isLoading && setRememberMe((v) => !v)}
                >
                  Lembrar-me
                </span>
              </div>

              {/* Botão entrar — gradiente premium */}
              <button
                type="submit"
                disabled={isLoading || !email || !senha}
                style={{
                  width: '100%', height: '52px', fontSize: '14px', fontWeight: 600, color: 'white',
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  border: 'none', borderRadius: '12px',
                  cursor: isLoading || !email || !senha ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: isLoading || !email || !senha ? 0.6 : 1, marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.18)',
                }}
                onMouseEnter={(e) => { if (!isLoading && email && senha) { e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(79,70,229,0.25)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.18)' }}
                onMouseDown={(e) => { if (!isLoading && email && senha) e.currentTarget.style.transform = 'scale(0.99)' }}
                onMouseUp={(e) => { if (!isLoading && email && senha) e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>

              {/* WhatsApp — precisa de ajuda */}
              <a
                href="https://wa.me/5511952138636"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', fontWeight: 500, color: '#25D366', textDecoration: 'none', marginTop: '8px', transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <WhatsAppIcon size={15} />
                Precisa de ajuda?
              </a>
            </div>
          </form>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
