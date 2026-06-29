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

  // Session existe mas usuario ainda nulo (raro — fetchUsuario em andamento)
  if (!usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D4ED8]" />
      </div>
    )
  }

  if (usuario && usuario.onboarding_completo === false) {
    // Membro convidado = tem restaurante vinculado E cargo visualizador
    // Dono via pagamento = tem restaurante vinculado E cargo gerente/admin → vai pro onboarding normal
    const isMembro =
      usuario.restaurante_id !== null &&
      usuario.restaurante_id !== undefined &&
      usuario.cargo === 'visualizador'

    if (isMembro && location.pathname !== '/onboarding-membro') {
      return <Navigate to="/onboarding-membro" replace />
    }

    if (!isMembro && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
  }

  if (usuario && usuario.onboarding_completo === true) {
    if (location.pathname === '/onboarding' || location.pathname === '/onboarding-membro') {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}
