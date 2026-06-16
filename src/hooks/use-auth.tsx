import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface UsuarioDados {
  id: string
  email: string
  nome: string | null
  restaurante_id: number | null
  cargo: string | null
  onboarding_completo: boolean | null
  configuracoes?: any
}

interface AuthContextType {
  user: User | null
  session: Session | null
  usuario: UsuarioDados | null
  login: (email: string, password: string) => Promise<{ error: any }>
  cadastro: (nome: string, email: string, password: string) => Promise<{ error: any }>
  logout: () => Promise<{ error: any }>
  recuperarSenha: (email: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<UsuarioDados | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsuario = (userId: string) => {
      supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }) => {
          if (data) setUsuario(data as UsuarioDados)
          else if (error) console.error('Erro ao buscar usuário:', error)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUsuario(session.user.id)
      } else {
        setUsuario(null)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUsuario(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const cadastro = async (nome: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
      },
    })

    if (error) return { error }

    if (data.user) {
      const { error: insertError } = await supabase.from('usuarios').insert({
        id: data.user.id,
        email: email,
        nome: nome,
        onboarding_completo: false,
        cargo: 'gerente',
      })

      if (insertError) {
        console.error('Erro ao criar perfil na tabela usuarios:', insertError)
        return { error: insertError }
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()
      if (userData) {
        setUsuario(userData as UsuarioDados)
      }
    }

    return { error: null }
  }

  const logout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setUsuario(null)
    setUser(null)
    setSession(null)
    setLoading(false)
    return { error }
  }

  const recuperarSenha = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, usuario, login, cadastro, logout, recuperarSenha, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
