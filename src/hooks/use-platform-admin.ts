import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function usePlatformAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) { setLoading(false); return }
      supabase
        .from('platform_admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()
        .then(({ data }) => {
          setIsAdmin(!!data)
          setLoading(false)
        })
    })
  }, [])

  return { isAdmin, loading }
}
