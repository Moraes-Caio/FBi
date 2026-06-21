import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { setRememberMe } from '@/lib/supabase/auth-storage'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import {
  AuthLayout,
  BrandMark,
  WhatsAppIcon,
  authInputStyle,
  authInputFocus,
  authInputBlur,
} from '@/components/auth/AuthLayout'

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

    // Define onde a sessão será salva ANTES de autenticar
    setRememberMe(rememberMe)

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

  return (
    <AuthLayout>
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
              required disabled={isLoading} style={authInputStyle}
              onFocus={authInputFocus} onBlur={authInputBlur}
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
                style={{ ...authInputStyle, paddingRight: '46px' }}
                onFocus={authInputFocus} onBlur={authInputBlur}
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
    </AuthLayout>
  )
}
