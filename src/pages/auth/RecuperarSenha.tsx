import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { UtensilsCrossed, Loader2, ArrowLeft } from 'lucide-react'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [modoRedefinir, setModoRedefinir] = useState(false)

  const { recuperarSenha } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setModoRedefinir(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleEnviarLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await recuperarSenha(email)
    setIsLoading(false)

    if (error) {
      toast({
        title: 'Erro ao enviar link',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } else {
      setIsSent(true)
    }
  }

  const handleRedefinir = async (e: React.FormEvent) => {
    e.preventDefault()

    if (novaSenha !== confirmarSenha) {
      toast({
        title: 'Senhas não conferem',
        description: 'A senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    if (novaSenha.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setIsLoading(false)

    if (error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso.',
      })
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D4ED8] text-white shadow-sm mb-4">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          {modoRedefinir ? 'Nova Senha' : 'Recuperar Senha'}
        </h2>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md shadow-md border-0 ring-1 ring-gray-200">
        {modoRedefinir ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Redefinir senha</CardTitle>
              <CardDescription>Digite sua nova senha abaixo.</CardDescription>
            </CardHeader>
            <form onSubmit={handleRedefinir}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    disabled={isLoading}
                    className="focus-visible:ring-[#1D4ED8]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                  <Input
                    id="confirmar-senha"
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    disabled={isLoading}
                    className="focus-visible:ring-[#1D4ED8]"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-[#1D4ED8] hover:bg-blue-800 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar nova senha'
                  )}
                </Button>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
              <CardDescription>
                Digite seu email e enviaremos um link para você redefinir sua senha.
              </CardDescription>
            </CardHeader>
            {!isSent ? (
              <form onSubmit={handleEnviarLink}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="focus-visible:ring-[#1D4ED8]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-[#1D4ED8] hover:bg-blue-800 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar link de recuperação'
                    )}
                  </Button>
                  <div className="text-sm text-center">
                    <Link
                      to="/login"
                      className="flex items-center justify-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar para o login
                    </Link>
                  </div>
                </CardFooter>
              </form>
            ) : (
              <CardContent className="py-6">
                <div className="rounded-md bg-blue-50 p-4 mb-6">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Email enviado com sucesso</h3>
                    <p className="mt-2 text-sm text-blue-700">
                      Enviamos as instruções para <strong>{email}</strong>. Verifique sua caixa de
                      entrada e clique no link.
                    </p>
                  </div>
                </div>
                <div className="text-sm text-center">
                  <Link
                    to="/login"
                    className="flex items-center justify-center font-medium text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o login
                  </Link>
                </div>
              </CardContent>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
