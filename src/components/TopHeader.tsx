import { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Settings as SettingsIcon, User as UserIcon, CheckCircle } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile } from '@/hooks/use-user-profile'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const routeTitles: Record<string, string> = {
  '/': 'Visão Geral',
  '/feedbacks': 'Feedbacks',
  '/insights': 'Insights',
  '/acoes': 'Ações',
  '/relatorios': 'Relatórios',
}

interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  created_at: string
}

export function TopHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { profile } = useUserProfile()
  const title = routeTitles[location.pathname] || 'Dashboard'

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const unreadCount = notificacoes.filter((n) => !n.lida).length

  useEffect(() => {
    if (profile?.restaurante_id) {
      const fetchNotificacoes = async () => {
        const { data } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('restaurante_id', profile.restaurante_id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (data) setNotificacoes(data)
      }
      fetchNotificacoes()
    }
  }, [profile?.restaurante_id])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }

  const handleMarkAllAsRead = async () => {
    if (profile?.restaurante_id) {
      await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('restaurante_id', profile.restaurante_id)
        .eq('lida', false)
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-2 md:hidden" />
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/notificacoes"
            className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 border border-border cursor-pointer hover:opacity-80 transition-opacity ring-offset-2 hover:ring-2 ring-primary/20">
                <AvatarImage
                  src={profile?.avatar_url || undefined}
                  alt={usuario?.nome || 'Usuário'}
                />
                <AvatarFallback>
                  {usuario?.nome?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[260px] mt-1.5 p-0 border-border/60 shadow-lg rounded-xl overflow-hidden"
              align="end"
              sideOffset={8}
            >
              <div className="p-3 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {usuario?.nome?.substring(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 overflow-hidden">
                    <p className="text-sm font-semibold leading-none text-foreground truncate">
                      {usuario?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {usuario?.email || 'email@exemplo.com'}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="m-0" />
              <DropdownMenuGroup className="p-1.5">
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer py-2 px-3 text-[13px] font-medium rounded-md transition-colors focus:bg-secondary"
                >
                  <Link to="/minha-conta">
                    <UserIcon className="mr-2.5 h-[15px] w-[15px] text-muted-foreground" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer py-2 px-3 text-[13px] font-medium rounded-md transition-colors focus:bg-secondary"
                >
                  <Link to="/configuracoes">
                    <SettingsIcon className="mr-2.5 h-[15px] w-[15px] text-muted-foreground" />
                    <span>Seu Restaurante</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="m-0" />
              <div className="p-1.5 bg-secondary/5">
                <DropdownMenuItem
                  className="cursor-pointer py-2 px-3 text-[13px] font-medium text-red-600 focus:text-red-700 focus:bg-red-50/80 rounded-md transition-colors"
                  onSelect={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="mr-2.5 h-[15px] w-[15px]" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              Você precisará fazer login novamente para acessar o painel de insights e feedbacks do
              seu restaurante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
            >
              Sair da conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
