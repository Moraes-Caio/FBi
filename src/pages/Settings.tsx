import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RestaurantTab } from './settings/RestaurantTab'
import { MascotTab } from './settings/MascotTab'
import { CategoriesTab } from './settings/CategoriesTab'
import { WaitersTab } from './settings/WaitersTab'
import { WhatsAppTab } from './settings/WhatsAppTab'
import { useUserProfile } from '@/hooks/use-user-profile'
import { cn } from '@/lib/utils'

export default function Settings() {
  const { profile, loading } = useUserProfile()
  const [activeSection, setActiveSection] = useState('restaurante')
  const isManualScroll = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -40% 0px', threshold: [0.2, 0.5, 0.8] },
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach((s) => observer.observe(s))

    return () => observer.disconnect()
  }, [loading])

  const scrollTo = (id: string) => {
    isManualScroll.current = true
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      // Precise offset for the sticky header
      const y = element.getBoundingClientRect().top + window.scrollY - 100
      window.scrollTo({ top: y, behavior: 'smooth' })
      setTimeout(() => {
        isManualScroll.current = false
      }, 800)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <div className="p-2 rounded-md bg-gray-100 h-9 w-9" />
          <div className="h-6 w-32 bg-gray-100 rounded" />
        </header>
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <div className="flex gap-10">
              <Skeleton className="h-[400px] w-64 hidden md:block rounded-xl" />
              <Skeleton className="h-[600px] w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) return null

  const navItems = [
    { id: 'restaurante', label: 'Restaurante' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'mascote', label: 'Assistente de IA' },
    { id: 'categorias', label: 'Categorias de Feedback' },
    { id: 'garcons', label: 'Garçons' },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary p-2 rounded-md transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Configurações do Restaurante</h1>
      </header>

      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Configurações</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Gerencie o perfil do seu restaurante, mascote, integrações e permissões da equipe.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-start relative">
            <nav className="hidden md:flex flex-col w-64 flex-shrink-0 sticky top-28 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    'text-left px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 space-y-16 pb-32 w-full min-w-0">
              <section id="restaurante" className="scroll-mt-28">
                <RestaurantTab restauranteId={profile.restaurante_id} />
              </section>
              <section id="whatsapp" className="scroll-mt-28">
                <WhatsAppTab restauranteId={profile.restaurante_id} />
              </section>
              <section id="mascote" className="scroll-mt-28">
                <MascotTab restauranteId={profile.restaurante_id} />
              </section>
              <section id="categorias" className="scroll-mt-28">
                <CategoriesTab restauranteId={profile.restaurante_id} />
              </section>
              <section id="garcons" className="scroll-mt-28">
                <WaitersTab restauranteId={profile.restaurante_id} />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
