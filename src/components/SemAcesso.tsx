import { ShieldOff } from 'lucide-react'

export function SemAcesso() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Você não tem permissão para visualizar esta página. Entre em contato com o administrador do
        restaurante.
      </p>
    </div>
  )
}
