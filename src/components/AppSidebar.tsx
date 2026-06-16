import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  Zap,
  FileBarChart,
  UtensilsCrossed,
  QrCode,
  Settings as SettingsIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navigation = [
  { name: 'Visão Geral', href: '/', icon: LayoutDashboard },
  { name: 'Feedbacks', href: '/feedbacks', icon: MessageSquare },
  { name: 'Insights', href: '/insights', icon: Lightbulb },
  { name: 'Ações', href: '/acoes', icon: Zap },
  { name: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { name: 'QR Code', href: '/qrcode', icon: QrCode },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar className="border-r border-border bg-white text-sidebar-foreground">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              Restaurante da Vila
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Feedback Intelligence
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={
                    isActive
                      ? 'h-10 text-[15px] font-medium transition-colors bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]'
                      : 'h-10 text-[15px] font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                >
                  <Link to={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
