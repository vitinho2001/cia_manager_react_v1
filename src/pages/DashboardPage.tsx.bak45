import { ArrowRight, CircleDollarSign, Database, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../contexts/AuthContext'

const activity = [
  ['Compra registrada','Batata — 25 kg','Hoje, 10:42'],
  ['Receita atualizada','Caldo Verde — 10 porções','Ontem, 18:20'],
  ['Custo importado','Energia elétrica','Ontem, 14:05'],
]
export function DashboardPage(){const{configured}=useAuth();return <div className="page-container">
  <PageHeader eyebrow="Visão geral" title="Bom dia, Ana" description="Acompanhe os principais indicadores da Cia. do Caldinho." actions={<select className="select-control" defaultValue="2026-08"><option value="2026-08">Agosto de 2026</option></select>}/>
  <section className="stats-grid">
    <StatCard label="Faturamento" value="R$ 0,00" detail="Mês selecionado" icon={<CircleDollarSign size={19}/>} trend="0%"/>
    <StatCard label="CMV estimado" value="0,0%" detail="Baseado nas vendas" icon={<TrendingUp size={19}/>} />
    <StatCard label="Itens vendidos" value="0" detail="Todos os canais" icon={<ShoppingBag size={19}/>} />
    <StatCard label="Banco de dados" value={configured?'Conectado':'A configurar'} detail="Supabase PostgreSQL" icon={<Database size={19}/>} />
  </section>
  <div className="dashboard-grid">
    <section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Desempenho</span><h2>Resultado mensal</h2></div><button className="text-button">Ver DRE <ArrowRight size={15}/></button></div><div className="chart-empty"><div className="chart-bars"><i style={{height:'32%'}}/><i style={{height:'48%'}}/><i style={{height:'41%'}}/><i style={{height:'62%'}}/><i style={{height:'54%'}}/><i style={{height:'76%'}}/><i style={{height:'68%'}}/></div><p>Os gráficos serão preenchidos após o lançamento das primeiras vendas.</p></div></section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Atalhos</span><h2>Ações rápidas</h2></div></div><div className="quick-actions"><Link to="/insumos"><PackageCheck/>Nova compra<span>Registrar entrada de insumo</span></Link><Link to="/receitas"><UtensilsIcon/>Nova receita<span>Montar ficha técnica</span></Link><Link to="/custos"><CircleDollarSign/>Novo custo<span>Lançar despesa mensal</span></Link></div></section>
  </div>
  <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Movimentações</span><h2>Atividade recente</h2></div><button className="text-button">Ver tudo <ArrowRight size={15}/></button></div><div className="activity-list">{activity.map(([a,b,c])=><div className="activity-row" key={a+b}><div className="activity-dot"/><div><strong>{a}</strong><span>{b}</span></div><time>{c}</time></div>)}</div></section>
</div>}
function UtensilsIcon(){return <span className="quick-icon">🍲</span>}
