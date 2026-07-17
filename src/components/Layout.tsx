import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { TopHeader } from './TopHeader'
import { ChatFab } from './ChatFab'

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex flex-1 flex-col w-full min-w-0 min-h-0">
          <TopHeader />
          <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
        <ChatFab />
      </div>
    </SidebarProvider>
  )
}
