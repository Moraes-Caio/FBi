import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export function RotaProtegida() {
  const { session, usuario, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D4ED8]" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Carregando...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (usuario && usuario.onboarding_completo === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (usuario && usuario.onboarding_completo === true && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
