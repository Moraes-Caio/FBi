import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Camera, Mail, AtSign, UserIcon, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

export default function MyAccount() {
  const { usuario } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    nome: '',
    username: '',
    cargo: '',
  })

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome || '',
        username: '',
        cargo: usuario.cargo || '',
      })

      const fetchProfile = async () => {
        const { data } = await supabase.from('usuarios').select('*').eq('id', usuario.id).single()

        if (data) {
          if (data.avatar_url) setAvatarUrl(data.avatar_url)
          if ((data as any).username) {
            setFormData((prev) => ({ ...prev, username: (data as any).username }))
          }
        }
      }
      fetchProfile()
    }
  }, [usuario])

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !usuario?.id) return
    const file = event.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${usuario.id}-${Math.random()}.${fileExt}`

    setUploadingAvatar(true)
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) {
      toast({ title: 'Erro', description: 'Falha no upload da imagem', variant: 'destructive' })
      setUploadingAvatar(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ avatar_url: publicUrl })
      .eq('id', usuario.id)

    if (updateError) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar a imagem no perfil',
        variant: 'destructive',
      })
    } else {
      setAvatarUrl(publicUrl)
      toast({ title: 'Sucesso', description: 'Foto de perfil atualizada.' })
    }
    setUploadingAvatar(false)
  }

  const handleRemoveAvatar = async () => {
    if (!usuario?.id) return
    setUploadingAvatar(true)
    await supabase.from('usuarios').update({ avatar_url: null }).eq('id', usuario.id)
    setAvatarUrl('')
    setUploadingAvatar(false)
    toast({ title: 'Removida', description: 'Foto de perfil removida com sucesso.' })
  }

  const handleSave = async () => {
    if (!usuario?.id) return
    setLoading(true)

    const finalUsername = formData.username.trim() === '' ? null : formData.username.trim()

    if (finalUsername) {
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', finalUsername)
        .neq('id', usuario.id)
        .maybeSingle()

      if (existingUser) {
        toast({
          title: 'Username indisponível',
          description: 'Este username já está sendo usado por outra pessoa.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: formData.nome,
        username: finalUsername,
        cargo: formData.cargo,
      } as any)
      .eq('id', usuario.id)

    setLoading(false)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Seu perfil foi atualizado com sucesso.' })
    }
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full max-w-2xl mx-auto rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary p-2 rounded-md transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Perfil Pessoal</h1>
      </header>

      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Configurações de Perfil
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Gerencie suas informações pessoais e credenciais de acesso.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/75 shadow-subtle overflow-hidden">
            <div className="p-6 sm:p-10 space-y-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="h-28 w-28 border border-gray-200 shadow-sm transition-transform group-hover:scale-[1.02]">
                    <AvatarImage
                      src={avatarUrl || `https://img.usecurling.com/ppl/large?seed=${usuario.id}`}
                    />
                    <AvatarFallback className="text-3xl bg-gray-50 text-gray-400">
                      {usuario.nome?.substring(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 p-2 bg-white text-gray-600 rounded-full shadow-md border border-gray-100 hover:text-primary hover:border-primary/30 transition-colors">
                    <Camera className="h-4 w-4" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleUploadAvatar}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-medium text-gray-900 text-base">Foto de Perfil</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Recomendamos uma imagem quadrada. Formatos suportados: JPG, PNG ou GIF (Máx.
                    2MB).
                  </p>
                  <div className="flex gap-3 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? 'Enviando...' : 'Fazer upload'}
                    </Button>
                    {avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 border-t border-gray-100 pt-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="nome" className="text-sm font-medium flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      Como prefere ser chamado
                    </Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Seu nome ou apelido"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <AtSign className="h-4 w-4 text-gray-400" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="seu_username"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="cargo" className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    Cargo / Função
                  </Label>
                  <Select
                    value={formData.cargo}
                    onValueChange={(v) => setFormData({ ...formData, cargo: v })}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Selecione seu cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="visualizador">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium flex items-center gap-2 text-gray-700"
                  >
                    <Mail className="h-4 w-4 text-gray-400" />
                    Endereço de E-mail
                  </Label>
                  <Input
                    id="email"
                    value={usuario.email || ''}
                    readOnly
                    className="max-w-md bg-gray-50/50 text-gray-500 cursor-not-allowed shadow-none"
                  />
                  <p className="text-[13px] text-muted-foreground mt-1">
                    O e-mail é utilizado para login e notificações de segurança.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSave} disabled={loading} className="min-w-[140px]">
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
