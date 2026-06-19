import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export interface UserProfile {
  id: string
  email: string
  nome: string | null
  restaurante_id: number | null
  cargo: string | null
  avatar_url?: string | null
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single()

      setProfile(data)
      setLoading(false)
    }

    fetchProfile()
  }, [user])

  return { profile, loading }
}
