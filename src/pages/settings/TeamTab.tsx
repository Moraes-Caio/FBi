import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MailPlus, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Permissoes {
  ver: boolean
  editar: boolean
}

interface Funcao {
  id: string
  nome: string
  permissoes: Record<string, Permissoes>
}

interface Membro {
  id: string
  nome: string | null
  email: string
  configuracoes?: { funcao_id?: string } | null
}

// ── Módulos do sistema ────────────────────────────────────────────────────────

const MODULOS = [
  { key: 'visao_geral', label: 'Visão Geral' },
  { key: 'feedbacks', label: 'Feedbacks' },
  { key: 'insights', label: 'Insights' },
  { key: 'acoes', label: 'Ações' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'qrcodes', label: 'QR Codes' },
  { key: 'configuracoes', label: 'Configurações' },
]

const defaultPermissoes = (): Record<string, Permissoes> =>
  Object.fromEntries(MODULOS.map((m) => [m.key, { ver: false, editar: false }]))

// ── Componente principal ──────────────────────────────────────────────────────

export function TeamTab({ restauranteId }: { restauranteId: number | null }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  // Funções (roles)
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [editingFuncao, setEditingFuncao] = useState<Funcao | null>(null)
  const [funcaoDialogOpen, setFuncaoDialogOpen] = useState(false)
  const [savingFuncao, setSavingFuncao] = useState(false)

  // Membros
  const [membros, setMembros] = useState<Membro[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFuncaoId, setInviteFuncaoId] = useState('')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [savingInvite, setSavingInvite] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!restauranteId) {
      setLoading(false)
      return
    }
    const fetch = async () => {
      const [configRes, membrosRes] = await Promise.all([
        supabase
          .from('restaurantes')
          .select('funcoes_config')
          .eq('id', restauranteId)
          .single(),
        supabase
          .from('usuarios')
          .select('id, nome, email, configuracoes')
          .eq('restaurante_id', restauranteId)
          .order('created_at' as any),
      ])

      if (configRes.data?.funcoes_config) {
        setFuncoes((configRes.data.funcoes_config as any) || [])
      }
      if (membrosRes.data) setMembros(membrosRes.data as Membro[])
      setLoading(false)
    }
    fetch()
  }, [restauranteId])

  // ── Salvar funções no banco ───────────────────────────────────────────────

  const saveFuncoes = async (novasFuncoes: Funcao[]): Promise<boolean> => {
    if (!restauranteId) {
      toast({ title: 'Erro', description: 'Restaurante não identificado.', variant: 'destructive' })
      return false
    }
    const { error } = await supabase
      .from('restaurantes')
      .update({ funcoes_config: novasFuncoes } as any)
      .eq('id', restauranteId)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      return false
    }
    return true
  }

  // ── CRUD Funções ──────────────────────────────────────────────────────────

  const openNewFuncao = () => {
    setEditingFuncao({
      id: crypto.randomUUID(),
      nome: '',
      permissoes: defaultPermissoes(),
    })
    setFuncaoDialogOpen(true)
  }

  const openEditFuncao = (f: Funcao) => {
    const permissoes = { ...defaultPermissoes(), ...f.permissoes }
    setEditingFuncao({ ...f, permissoes })
    setFuncaoDialogOpen(true)
  }

  const handleSaveFuncao = async () => {
    if (!editingFuncao || !editingFuncao.nome.trim()) return
    setSavingFuncao(true)

    const exists = funcoes.find((f) => f.id === editingFuncao.id)
    const novasFuncoes = exists
      ? funcoes.map((f) => (f.id === editingFuncao.id ? editingFuncao : f))
      : [...funcoes, editingFuncao]

    const ok = await saveFuncoes(novasFuncoes)
    setSavingFuncao(false)
    if (!ok) return

    setFuncoes(novasFuncoes)
    setFuncaoDialogOpen(false)
    toast({ title: 'Sucesso', description: exists ? 'Função atualizada.' : 'Função criada.' })
  }

  const handleDeleteFuncao = async (id: string) => {
    if (!confirm('Remover esta função? Os membros com ela perderão o vínculo.')) return
    const novasFuncoes = funcoes.filter((f) => f.id !== id)
    const ok = await saveFuncoes(novasFuncoes)
    if (!ok) return
    setFuncoes(novasFuncoes)
    toast({ title: 'Função removida.' })
  }

  const togglePermissao = (modulo: string, tipo: 'ver' | 'editar', value: boolean) => {
    if (!editingFuncao) return
    const permissoes = { ...editingFuncao.permissoes }
    permissoes[modulo] = { ...permissoes[modulo], [tipo]: value }
    // Editar implica ver
    if (tipo === 'editar' && value) permissoes[modulo].ver = true
    // Tirar ver tira editar também
    if (tipo === 'ver' && !value) permissoes[modulo].editar = false
    setEditingFuncao({ ...editingFuncao, permissoes })
  }

  // ── CRUD Membros ──────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !restauranteId) {
      toast({ title: 'Atenção', description: 'Informe um e-mail válido.', variant: 'destructive' })
      return
    }
    setSavingInvite(true)

    const { data, error } = await supabase.functions.invoke('convidar-membro', {
      body: {
        email: inviteEmail.trim(),
        restaurante_id: restauranteId,
        funcao_id: inviteFuncaoId || null,
      },
    })

    setSavingInvite(false)

    if (error || data?.error) {
      toast({
        title: 'Erro ao convidar',
        description: data?.error || error?.message || 'Tente novamente.',
        variant: 'destructive',
      })
      return
    }

    const novoMembro: Membro = {
      id: data.userId,
      email: inviteEmail.trim(),
      nome: inviteEmail.split('@')[0],
      configuracoes: inviteFuncaoId ? { funcao_id: inviteFuncaoId } : null,
    }
    setMembros((prev) => [...prev, novoMembro])
    toast({
      title: 'Convite enviado!',
      description: `Um e-mail de convite foi enviado para ${inviteEmail}.`,
    })

    setInviteEmail('')
    setInviteFuncaoId('')
    setInviteDialogOpen(false)
  }

  const handleChangeFuncaoMembro = async (membroId: string, funcaoId: string) => {
    const cfg = funcaoId ? { funcao_id: funcaoId } : {}
    const { error } = await supabase
      .from('usuarios')
      .update({ configuracoes: cfg } as any)
      .eq('id', membroId)

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
      return
    }
    setMembros((prev) =>
      prev.map((m) =>
        m.id === membroId ? { ...m, configuracoes: cfg } : m,
      ),
    )
  }

  const getFuncaoNome = (m: Membro) => {
    const fid = m.configuracoes?.funcao_id
    if (!fid) return null
    return funcoes.find((f) => f.id === fid)?.nome ?? null
  }

  if (loading) return <Skeleton className="h-64 w-full animate-fade-in" />

  return (
    <Card className="shadow-subtle animate-fade-in-up">
      <CardHeader>
        <CardTitle>Equipe de Acesso</CardTitle>
        <CardDescription>
          Gerencie os membros e defina as funções com suas respectivas permissões.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="membros">
          <TabsList className="mb-6">
            <TabsTrigger value="membros">Membros</TabsTrigger>
            <TabsTrigger value="funcoes">Funções e Permissões</TabsTrigger>
          </TabsList>

          {/* ── ABA MEMBROS ─────────────────────────────────────────────── */}
          <TabsContent value="membros" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                <MailPlus className="w-4 h-4 mr-2" />
                Convidar membro
              </Button>
            </div>
            <div className="space-y-3">
              {membros.map((m) => {
                const funcaoNome = getFuncaoNome(m)
                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border bg-muted">
                        <AvatarFallback className="bg-primary/5 text-primary text-sm">
                          {(m.nome || m.email).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{m.nome || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {funcaoNome && (
                        <Badge variant="secondary" className="text-xs">
                          {funcaoNome}
                        </Badge>
                      )}
                      <Select
                        value={m.configuracoes?.funcao_id || 'sem_funcao'}
                        onValueChange={(v) =>
                          handleChangeFuncaoMembro(m.id, v === 'sem_funcao' ? '' : v)
                        }
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="Sem função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sem_funcao">Sem função</SelectItem>
                          {funcoes.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
              {membros.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Nenhum membro encontrado.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── ABA FUNÇÕES ─────────────────────────────────────────────── */}
          <TabsContent value="funcoes" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openNewFuncao}>
                <Plus className="w-4 h-4 mr-2" />
                Nova função
              </Button>
            </div>
            <div className="space-y-3">
              {funcoes.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary/60" />
                    <div>
                      <p className="font-medium text-sm">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {MODULOS.filter((m) => f.permissoes?.[m.key]?.ver).map((m) => m.label).join(', ') || 'Sem acesso'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFuncao(f)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteFuncao(f.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {funcoes.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma função criada. Crie uma para atribuir aos membros.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* ── Dialog: Criar/Editar Função ──────────────────────────────────── */}
      <Dialog open={funcaoDialogOpen} onOpenChange={setFuncaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {funcoes.find((f) => f.id === editingFuncao?.id) ? 'Editar Função' : 'Nova Função'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome e as permissões de acesso para esta função.
            </DialogDescription>
          </DialogHeader>

          {editingFuncao && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Nome da Função</Label>
                <Input
                  value={editingFuncao.nome}
                  onChange={(e) => setEditingFuncao({ ...editingFuncao, nome: e.target.value })}
                  placeholder="Ex: Gerente, Caixa, Supervisor..."
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Label>Permissões por módulo</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_80px] bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                    <span>Módulo</span>
                    <span className="text-center">Visualizar</span>
                    <span className="text-center">Editar</span>
                  </div>
                  {MODULOS.map((modulo, i) => (
                    <div
                      key={modulo.key}
                      className={`grid grid-cols-[1fr_80px_80px] items-center px-4 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}
                    >
                      <span className="font-medium">{modulo.label}</span>
                      <div className="flex justify-center">
                        <Switch
                          checked={editingFuncao.permissoes[modulo.key]?.ver ?? false}
                          onCheckedChange={(v) => togglePermissao(modulo.key, 'ver', v)}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={editingFuncao.permissoes[modulo.key]?.editar ?? false}
                          onCheckedChange={(v) => togglePermissao(modulo.key, 'editar', v)}
                          disabled={!editingFuncao.permissoes[modulo.key]?.ver}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ativar "Editar" ativa "Visualizar" automaticamente.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFuncaoDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveFuncao}
              disabled={!editingFuncao?.nome.trim() || savingFuncao}
            >
              {savingFuncao ? 'Salvando...' : 'Salvar Função'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Convidar Membro ───────────────────────────────────────── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Informe o e-mail e a função do novo colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@exemplo.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-funcao">Função</Label>
              <Select value={inviteFuncaoId} onValueChange={setInviteFuncaoId}>
                <SelectTrigger id="invite-funcao">
                  <SelectValue placeholder="Selecione uma função..." />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                  {funcoes.length === 0 && (
                    <SelectItem value="_none" disabled>
                      Crie uma função primeiro
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || savingInvite}>
              {savingInvite ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
