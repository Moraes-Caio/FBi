import type { ReactNode } from 'react'
import { usePermissoes } from '@/hooks/use-permissoes'
import { SemAcesso } from '@/components/SemAcesso'
import { Skeleton } from '@/components/ui/skeleton'

interface RotaPermitidaProps {
  modulo: string
  children: ReactNode
}

export function RotaPermitida({ modulo, children }: RotaPermitidaProps) {
  const { podeVer, carregando } = usePermissoes()

  if (carregando) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!podeVer(modulo)) return <SemAcesso />

  return <>{children}</>
}
