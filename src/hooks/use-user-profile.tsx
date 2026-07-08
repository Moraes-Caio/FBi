import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface UserProfile {
  id: string
  nome: string | null
  email: string
  cargo: string | null
  restaurante_id: number | null
  avatar_url: string | null
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchProfile() {
      if (!user) {
        if (mounted) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (mounted) {
        setProfile(
          data
            ? {
                id: user.id,
                email: data.email,
                nome: data.nome,
                restaurante_id: data.id,
                cargo: data.cargo,
                avatar_url: data.avatar_url,
              }
            : null,
        )
        setLoading(false)
      }
    }

    fetchProfile()
    return () => {
      mounted = false
    }
  }, [user])

  return { profile, loading }
}
