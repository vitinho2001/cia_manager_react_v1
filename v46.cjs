const fs = require('fs')
const raw = fs.readFileSync(__filename, 'utf8')
const start = raw.indexOf('/*CONTENT_START*/')
const end = raw.indexOf('/*CONTENT_END*/')
if (start === -1 || end === -1) { console.log('ERRO: marcadores nao encontrados'); process.exit(1) }
const content = raw.slice(start + '/*CONTENT_START*/'.length, end)
fs.writeFileSync('src/pages/DashboardPage.tsx', content, 'utf8')
console.log('OK: DashboardPage.tsx substituido pela versao conectada')
/*CONTENT_START*/
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CircleDollarSign, Database, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentOrganizationId } from '../services/organization'
import { listSales } from '../services/sales'
import { listIngredients, listPurchases } from '../services/ingredients'
import { listMenuItems, listMenuComponents } from '../services/menu'
import { listRecipes, listRecipeItems } from '../services/recipes'
import { computeStock, listStockAdjustments } from '../services/stock'
import type { Sale } from '../types/sales'
import type { IngredientPurchase } from '../types/ingredients'
import type { StockLine } from '../types/stock'

const pad2 = (n: number) => String(n).padStart(2, '0')
const monthKey = (d: Date) => d.getFullYear() + '-' + pad2(d.getMonth() + 1)
const currentMonth = monthKey(new Date())
const monthOptions: string[] = []
for (let i = 11; i >= 0; i--) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - i)
  monthOptions.push(monthKey(d))
}
const monthLabel = (m: string) => new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { start: month + '-01', end: month + '-' + pad2(new Date(y, m, 0).getDate()) }
}
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

export function DashboardPage() {
  const { configured } = useAuth()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [month, setMonth] = useState(currentMonth)
  const [sales, setSales] = useState<Sale[]>([])
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([])
  const [lines, setLines] = useState<StockLine[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const orgId = organizationId ?? await getCurrentOrganizationId()
      setOrganizationId(orgId)
      const bounds = monthBounds(month)
      const [saleRows, allSaleRows, ingRows, purRows, menuRows, compRows, recRows, recItemRows, adjRows] = await Promise.all([
        listSales(orgId, bounds.start, bounds.end).catch(() => []),
        listSales(orgId).catch(() => []),
        listIngredients(orgId).catch(() => []),
        listPurchases(orgId, undefined, bounds.end).catch(() => []),
        listMenuItems(orgId).catch(() => []),
        listMenuComponents(orgId).catch(() => []),
        listRecipes(orgId).catch(() => []),
        listRecipeItems(orgId).catch(() => []),
        listStockAdjustments(orgId).catch(() => []),
      ])
      setSales(saleRows)
      setAllSales(allSaleRows)
      setPurchases(purRows)
      setLines(computeStock(ingRows, purRows, compRows, recItemRows, saleRows, adjRows, recRows))
    } catch (err) {
      // mantem estado atual
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [month])

  const revenue = useMemo(() => sales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0), [sales])
  const itemsSold = useMemo(() => sales.reduce((s, x) => s + (Number(x.quantity) || 0), 0), [sales])
  const cmvCost = useMemo(() => lines.reduce((s, l) => s + l.consumed * l.avgCost, 0), [lines])
  const cmvPct = revenue > 0 ? (cmvCost / revenue) * 100 : 0

  const monthly = useMemo(() => {
    const last6 = monthOptions.slice(0, 6).reverse()
    return last6.map((m) => {
      const total = allSales.filter((s) => (s.sale_date || '').startsWith(m)).reduce((s, x) => s + (Number(x.total_amount) || 0), 0)
      return { m, total }
    })
  }, [allSales])
  const maxMonthly = Math.max(1, ...monthly.map((x) => x.total))

  const recent = useMemo(() => {
    const items: { a: string; b: string; c: string }[] = []
    for (const s of allSales.slice(0, 5)) {
      items.push({ a: 'Venda', b: (s.menu_item?.name ?? 'Item') + ' - ' + s.quantity + ' un', c: s.sale_date })
    }
    for (const p of purchases.slice(0, 5)) {
      items.push({ a: 'Compra', b: p.quantity + ' ' + p.purchase_unit, c: p.purchase_date })
    }
    return items.slice(0, 6)
  }, [allSales, purchases])

  return (
    <div className="page-container">
      <PageHeader eyebrow="Visão geral" title="Dashboard" description="Acompanhe os principais indicadores em tempo real." actions={<select className="select-control" value={month} onChange={(e) => setMonth(e.target.value)} title="Mes do dashboard">{monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>} />
      <section className="stats-grid">
        <StatCard label="Faturamento" value={brl(revenue)} detail="Mes selecionado" icon={<CircleDollarSign size={19}/>} trend={revenue > 0 ? 'ativo' : '0%'} />
        <StatCard label="CMV estimado" value={pct(cmvPct)} detail="Custo dos insumos / vendas" icon={<TrendingUp size={19}/>} />
        <StatCard label="Itens vendidos" value={String(itemsSold)} detail="Todos os canais" icon={<ShoppingBag size={19}/>} />
        <StatCard label="Banco de dados" value={configured ? 'Conectado' : 'A configurar'} detail="Supabase PostgreSQL" icon={<Database size={19}/>} />
      </section>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><span className="eyebrow">Desempenho</span><h2>Resultado mensal</h2></div></div>
          <div className="chart-empty">
            <div className="chart-bars">
              {monthly.map((x) => <i key={x.m} style={{ height: Math.max(4, (x.total / maxMonthly) * 100) + '%' }} title={monthLabel(x.m) + ': ' + brl(x.total)} />)}
            </div>
            {allSales.length === 0 && <p>Os graficos serao preenchidos apos o lancamento das primeiras vendas.</p>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Atalhos</span><h2>Acoes rapidas</h2></div></div>
          <div className="quick-actions">
            <Link to="/insumos"><PackageCheck/>Nova compra<span>Registrar entrada de insumo</span></Link>
            <Link to="/receitas"><UtensilsIcon/>Nova receita<span>Montar ficha tecnica</span></Link>
            <Link to="/custos"><CircleDollarSign/>Novo custo<span>Lancar despesa mensal</span></Link>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Movimentacoes</span><h2>Atividade recente</h2></div></div>
        <div className="activity-list">
          {recent.length === 0 && <p className="empty-state compact">Sem movimentacoes ainda.</p>}
          {recent.map((r) => <div className="activity-row" key={r.a + r.b + r.c}><div className="activity-dot"/><div><strong>{r.a}</strong><span>{r.b}</span></div><time>{r.c}</time></div>)}
        </div>
      </section>
    </div>
  )
}
function UtensilsIcon() { return <span className="quick-icon">🍲</span> }
/*CONTENT_END*/