import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
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
import { UtensilsCrossed, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D4ED8] text-white shadow-sm mb-4">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Feedback Inteligente
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Acesse o painel de gestão do seu restaurante
        </p>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md shadow-md border-0 ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Digite suas credenciais para acessar sua conta.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  to="/recuperar-senha"
                  className="text-sm font-medium text-[#1D4ED8] hover:text-blue-800"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            <div className="text-sm text-center text-gray-500">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="font-medium text-[#1D4ED8] hover:text-blue-800">
                Criar conta
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
