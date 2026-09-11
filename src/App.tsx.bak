import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LegacyPage } from './pages/LegacyPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { IngredientsPage } from './pages/IngredientsPage'
import { RecipesPage } from './pages/RecipesPage'
import { MenuPage } from './pages/MenuPage'

function RoutedApp() {
  const { user, loading, configured } = useAuth()
  if (loading) return <div className="app-loading">Carregando…</div>
  if (configured && !user) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="cardapio" element={<MenuPage />} />
        <Route path="receitas" element={<RecipesPage />} />
        <Route path="insumos" element={<IngredientsPage />} />
        <Route path="custos" element={<PlaceholderPage title="Custos" description="Custos fixos, variáveis e importação de planilhas." />} />
        <Route path="vendas" element={<PlaceholderPage title="Vendas" description="Vendas por produto, canal e período." />} />
        <Route path="dre" element={<PlaceholderPage title="DRE" description="Demonstrativo calculado automaticamente." />} />
        <Route path="comparativo" element={<PlaceholderPage title="Comparativo" description="Análises mensais, trimestrais, semestrais e anuais." />} />
        <Route path="inteligencia" element={<PlaceholderPage title="Inteligência" description="Alertas, rankings e simulações." />} />
        <Route path="sistema-atual" element={<LegacyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AuthProvider><RoutedApp /></AuthProvider>
}
