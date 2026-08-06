import { BarChart3, BookOpen, BrainCircuit, ClipboardList, LayoutDashboard, LogOut, Menu, PackageOpen, ReceiptText, Search, ShoppingCart, UtensilsCrossed, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/receitas', label: 'Receitas', icon: BookOpen },
  { to: '/insumos', label: 'Insumos', icon: PackageOpen },
  { to: '/custos', label: 'Custos', icon: ReceiptText },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/dre', label: 'DRE', icon: ClipboardList },
  { to: '/comparativo', label: 'Comparativo', icon: BarChart3 },
  { to: '/inteligencia', label: 'Inteligência', icon: BrainCircuit },
]

export function AppLayout() {
  const { user, signOut } = useAuth(); const [open, setOpen] = useState(false)
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={20}/></button>
      <div className="brand-block"><img src="/logo-cia-do-caldinho.png" alt="Cia. do Caldinho"/><span>Gestão financeira</span></div>
      <nav>{navigation.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/' } onClick={()=>setOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><div className="user-chip"><div className="avatar">{(user?.email?.[0] ?? 'C').toUpperCase()}</div><div><strong>{user?.email?.split('@')[0] ?? 'Modo local'}</strong><small>{user?.email ?? 'Supabase não configurado'}</small></div></div>{user && <button onClick={()=>void signOut()}><LogOut size={16}/> Sair</button>}</div>
    </aside>
    {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={()=>setOpen(false)}/>} 
    <section className="workspace">
      <header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></button><div className="search-box"><Search size={17}/><input placeholder="Buscar no sistema"/></div><div className="topbar-badge">Cia. do Caldinho</div></header>
      <main className="main-area"><Outlet/></main>
    </section>
  </div>
}
