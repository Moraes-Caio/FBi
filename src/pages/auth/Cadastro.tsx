import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { cadastro } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (senha !== confirmarSenha) {
      toast({
        title: 'Senhas não conferem',
        description: 'A senha e a confirmação de senha devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    if (senha.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const { error } = await cadastro(nome, email, senha)
    setIsLoading(false)

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao Feedback Inteligente.',
      })
      navigate('/onboarding', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D4ED8] text-white shadow-sm mb-4">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">Criar Conta</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Junte-se ao Feedback Inteligente</p>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md shadow-md border-0 ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">Cadastro</CardTitle>
          <CardDescription>Preencha seus dados para começar.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-[#1D4ED8]"
              />
            </div>
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
              <Label htmlFor="senha">Senha</Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
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
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
            <div className="text-sm text-center text-gray-500">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-medium text-[#1D4ED8] hover:text-blue-800">
                Entrar
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
