import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfile } from '@/hooks/use-user-profile'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  created_at: string
}

export default function Notifications() {
  const { profile } = useUserProfile()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.restaurante_id) return
    const fetchNotificacoes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('restaurante_id', profile.restaurante_id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotificacoes(data)
      setLoading(false)
    }
    fetchNotificacoes()
  }, [profile?.restaurante_id])

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }

  const handleMarkAllAsRead = async () => {
    if (!profile?.restaurante_id) return
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('restaurante_id', profile.restaurante_id)
      .eq('lida', false)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('notificacoes').delete().eq('id', id)
    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  const unreadCount = notificacoes.filter((n) => !n.lida).length

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os alertas e atualizações importantes.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} className="shadow-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notificacoes.length > 0 ? (
          notificacoes.map((notif) => (
            <Card
              key={notif.id}
              className={cn(
                'transition-all duration-200 overflow-hidden',
                !notif.lida
                  ? 'border-primary/40 shadow-sm bg-primary/[0.02]'
                  : 'bg-white opacity-80 hover:opacity-100',
              )}
            >
              <CardContent className="p-5 flex gap-4 sm:gap-6 items-start">
                <div className="mt-1 flex-shrink-0">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full mt-1.5',
                      !notif.lida ? 'bg-primary' : 'bg-gray-300',
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h3
                      className={cn(
                        'text-base font-medium',
                        !notif.lida ? 'text-gray-900' : 'text-gray-700',
                      )}
                    >
                      {notif.titulo}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mt-2">{notif.mensagem}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0 pt-1">
                  {!notif.lida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="h-8 px-2 text-xs"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" /> Lida
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(notif.id)}
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Excluir notificação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-500 flex flex-col items-center">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Você não tem notificações</h3>
            <p className="text-sm mt-1">Tudo está tranquilo por aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
