import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'

// Pages
import Index from './pages/Index'
import Feedbacks from './pages/Feedbacks'
import Insights from './pages/Insights'
import Actions from './pages/Actions'
import Reports from './pages/Reports'
import QRCodes from './pages/QRCodes'
import Settings from './pages/Settings'
import Login from './pages/auth/Login'
import Cadastro from './pages/auth/Cadastro'
import RecuperarSenha from './pages/auth/RecuperarSenha'
import Onboarding from './pages/auth/Onboarding'
import OnboardingMembro from './pages/auth/OnboardingMembro'
import MyAccount from './pages/MyAccount'
import Notifications from './pages/Notifications'
import { RotaProtegida } from './components/RotaProtegida'
import { RotaPermitida } from './components/RotaPermitida'

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />

          <Route element={<RotaProtegida />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding-membro" element={<OnboardingMembro />} />
            <Route path="/minha-conta" element={<MyAccount />} />
            <Route
              path="/configuracoes"
              element={
                <RotaPermitida modulo="configuracoes">
                  <Settings />
                </RotaPermitida>
              }
            />
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <RotaPermitida modulo="visao_geral">
                    <Index />
                  </RotaPermitida>
                }
              />
              <Route
                path="/feedbacks"
                element={
                  <RotaPermitida modulo="feedbacks">
                    <Feedbacks />
                  </RotaPermitida>
                }
              />
              <Route
                path="/insights"
                element={
                  <RotaPermitida modulo="insights">
                    <Insights />
                  </RotaPermitida>
                }
              />
              <Route
                path="/acoes"
                element={
                  <RotaPermitida modulo="acoes">
                    <Actions />
                  </RotaPermitida>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <RotaPermitida modulo="relatorios">
                    <Reports />
                  </RotaPermitida>
                }
              />
              <Route
                path="/qrcode"
                element={
                  <RotaPermitida modulo="qrcodes">
                    <QRCodes />
                  </RotaPermitida>
                }
              />
              <Route path="/notificacoes" element={<Notifications />} />
            </Route>
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
