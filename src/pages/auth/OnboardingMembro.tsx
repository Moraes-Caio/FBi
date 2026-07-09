import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Eye, EyeOff, LogOut, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingMembro() {
  const { usuario, logout } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState(usuario?.nome || '')
  const [username, setUsername] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !usuario?.id) return
    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const path = `${usuario.id}-${Date.now()}.${ext}`

    setUploadingAvatar(true)
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(publicUrl)
    setUploadingAvatar(false)
  }

  const handleConcluir = async () => {
    if (!usuario?.id) return

    if (!nome.trim()) {
      toast({ title: 'Atenção', description: 'Informe seu nome.', variant: 'destructive' })
      return
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      toast({ title: 'Atenção', description: 'As senhas não conferem.', variant: 'destructive' })
      return
    }

    if (novaSenha && novaSenha.length < 6) {
      toast({ title: 'Atenção', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' })
      return
    }

    setSalvando(true)

    try {
      // Atualizar senha (se informada)
      if (novaSenha) {
        const { error: senhaError } = await supabase.auth.updateUser({ password: novaSenha })
        if (senhaError) throw senhaError
      }

      // Atualizar perfil
      const updates: Record<string, any> = {
        nome: nome.trim(),
        onboarding_completo: true,
      }
      if (avatarUrl) updates.avatar_url = avatarUrl
      if (username.trim()) updates.username = username.trim()

      const { error: profileError } = await supabase
        .from('restaurantes')
        .update(updates as any)
        .eq('auth_user_id', usuario.id)

      if (profileError) throw profileError

      toast({ title: 'Bem-vindo!', description: 'Seu perfil foi configurado com sucesso.' })
      window.location.href = '/'
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Tente novamente.', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#1D4ED8]">Feedback Inteligente</h1>
        <Button variant="ghost" size="sm" onClick={() => logout()} className="text-gray-500">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-lg border-0 ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Configure seu perfil</CardTitle>
          <CardDescription>
            Você foi convidado para fazer parte da equipe. Configure seu acesso antes de continuar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 py-4">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-24 w-24 border-2 border-gray-200">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-gray-100 text-gray-400">
                  {nome?.substring(0, 2).toUpperCase() || 'EU'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow border border-gray-100 hover:text-primary transition-colors">
                <Camera className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={handleUploadAvatar}
                disabled={uploadingAvatar}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadingAvatar ? 'Enviando...' : 'Clique para adicionar foto'}
            </p>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Como você quer ser chamado? *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome ou apelido"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu_username (opcional)"
            />
          </div>

          {/* Nova senha */}
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
            <Input
              id="confirmar-senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleConcluir}
            disabled={salvando || !nome.trim()}
          >
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Concluir e entrar'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
