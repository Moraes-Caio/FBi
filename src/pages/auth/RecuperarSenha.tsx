import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { UtensilsCrossed, Loader2, ArrowLeft } from 'lucide-react'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const { recuperarSenha } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
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
      toast({
        title: 'Link enviado!',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D4ED8] text-white shadow-sm mb-4">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Recuperar Senha
        </h2>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md shadow-md border-0 ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite seu email e enviaremos um link para você redefinir sua senha.
          </CardDescription>
        </CardHeader>
        {!isSent ? (
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
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Email enviado com sucesso</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Enviamos as instruções de recuperação para <strong>{email}</strong>.
                    </p>
                  </div>
                </div>
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
      </Card>
    </div>
  )
}
