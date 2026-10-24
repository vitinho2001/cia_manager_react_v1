const fs = require('fs')
const page = `import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CircleDollarSign, Percent, TrendingDown, Wallet } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { getCurrentOrganizationId } from '../services/organization'
import { listSales } from '../services/sales'
import { listOperatingCosts } from '../services/costs'
import { listIngredients, listPurchases } from '../services/ingredients'
import { listMenuComponents } from '../services/menu'
import { listRecipes, listRecipeItems } from '../services/recipes'
import { computeStock, listStockAdjustments } from '../services/stock'
import type { OperatingCost } from '../types/costs'
import type { Sale } from '../types/sales'
import type { StockLine } from '../types/stock'

const CHANNELS: { value: string; label: string }[] = [
  { value: 'counter', label: 'Balcao' },
  { value: 'ifood', label: 'iFood' },
  { value: 'bysell', label: 'BySell' },
  { value: 'other', label: 'Outro' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pctFmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
const fmtInt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR')

function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function firstOfMonth() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01' }
function monthIdx(d: string) { const parts = d.split('-'); return (Number(parts[0]) || 0) * 12 + (Number(parts[1]) || 0) - 1 }

type DreRow = { label: string; value: string; pct: string; indent?: boolean; strong?: boolean; color?: string }

const warnBox: CSSProperties = { margin: '10px 0', fontSize: 13, color: '#9a5d13', background: '#fff4df', border: '1px solid #f0dcae', borderRadius: 10, padding: '8px 12px' }

export function DrePage() {
  const [from, setFrom] = useState(() => localStorage.getItem('dre_from') || firstOfMonth())
  const [to, setTo] = useState(() => localStorage.getItem('dre_to') || today())
  const [sales, setSales] = useState<Sale[]>([])
  const [costs, setCosts] = useState<OperatingCost[]>([])
  const [lines, setLines] = useState<StockLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const organizationId = await getCurrentOrganizationId()
      const [salesRows, costRows, ingRows, purRows, compRows, recRows, recItemRows, adjRows] = await Promise.all([
        listSales(organizationId, from, to),
        listOperatingCosts(organizationId),
        listIngredients(organizationId).catch(() => []),
        listPurchases(organizationId, undefined, to).catch(() => []),
        listMenuComponents(organizationId).catch(() => []),
        listRecipes(organizationId).catch(() => []),
        listRecipeItems(organizationId).catch(() => []),
        listStockAdjustments(organizationId).catch(() => []),
      ])
      setSales(salesRows)
      setCosts(costRows)
      setLines(computeStock(ingRows, purRows, compRows, recItemRows, salesRows, adjRows, recRows))
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar o DRE.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [from, to])

  const dre = useMemo(() => {
    const revenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0)
    const qtySold = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
    const revenueByChannel = new Map<string, number>()
    for (const s of sales) revenueByChannel.set(s.channel, (revenueByChannel.get(s.channel) ?? 0) + (Number(s.total_amount) || 0))
    const cmvCost = lines.reduce((sum, l) => sum + l.consumed * l.avgCost, 0)

    const variableRows = costs.filter((c) => c.cost_type === 'variable')
    const variableCalc = variableRows.map((c) => {
      let value = 0
      let label = c.description
      if (c.calc_type === 'percent') {
        const base = revenueByChannel.get(c.channel ?? '') ?? 0
        value = (base * (Number(c.percent) || 0)) / 100
        label = c.description + ' - ' + brl(base) + ' x ' + String(Number(c.percent) || 0) + '%'
      } else {
        value = qtySold * (Number(c.unit_price) || 0)
        label = c.description + ' - ' + fmtInt(qtySold) + ' un x ' + brl(Number(c.unit_price) || 0)
      }
      return { id: c.id, label, value }
    })
    const variableTotal = variableCalc.reduce((sum, r) => sum + r.value, 0)

    const fixedRows = costs.filter((c) => c.cost_type === 'fixed' && monthIdx(c.expense_date) >= monthIdx(from) && monthIdx(c.expense_date) <= monthIdx(to))
    const fixedMap = new Map<string, { value: number; count: number }>()
    for (const c of fixedRows) {
      const cur = fixedMap.get(c.category) ?? { value: 0, count: 0 }
      cur.value += Number(c.amount) || 0
      cur.count += 1
      fixedMap.set(c.category, cur)
    }
    const fixedByCategory = [...fixedMap.entries()].map(([category, v]) => ({ category, value: v.value, count: v.count })).sort((a, b) => b.value - a.value)
    const fixedTotal = fixedByCategory.reduce((sum, f) => sum + f.value, 0)

    const margin = revenue - cmvCost - variableTotal
    const result = margin - fixedTotal
    const totalCosts = cmvCost + variableTotal + fixedTotal

    const pctOf = (v: number) => (revenue > 0 ? pctFmt((v / revenue) * 100) : '-')
    const rows: DreRow[] = []
    rows.push({ label: 'Receita bruta de vendas', value: brl(revenue), pct: pctOf(revenue), strong: true })
    for (const c of CHANNELS) {
      const v = revenueByChannel.get(c.value) ?? 0
      if (v > 0) rows.push({ label: c.label, value: brl(v), pct: pctOf(v), indent: true })
    }
    if (cmvCost > 0) rows.push({ label: '(-) CMV - insumos consumidos', value: brl(cmvCost), pct: pctOf(cmvCost) })
    if (variableCalc.length > 0) {
      rows.push({ label: '(-) Custos variaveis', value: brl(variableTotal), pct: pctOf(variableTotal) })
      for (const r of variableCalc) rows.push({ label: r.label, value: brl(r.value), pct: pctOf(r.value), indent: true })
    }
    rows.push({ label: '= Margem de contribuicao', value: brl(margin), pct: pctOf(margin), strong: true })
    if (fixedByCategory.length > 0) {
      rows.push({ label: '(-) Custos fixos', value: brl(fixedTotal), pct: pctOf(fixedTotal) })
      for (const f of fixedByCategory) rows.push({ label: f.category + ' (' + f.count + ' lancamento(s))', value: brl(f.value), pct: pctOf(f.value), indent: true })
    }
    rows.push({ label: '= Resultado do periodo', value: brl(result), pct: pctOf(result), strong: true, color: result >= 0 ? '#067647' : '#b42318' })
    rows.push({ label: 'Margem liquida sobre a receita', value: revenue > 0 ? pctFmt((result / revenue) * 100) : '-', pct: '' })

    return { revenue, cmvCost, variableTotal, fixedTotal, margin, result, totalCosts, rows, hasVariable: variableCalc.length > 0, hasFixed: fixedByCategory.length > 0, hasData: revenue > 0 || costs.length > 0 }
  }, [sales, costs, lines, from, to])

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Financeiro"
        title="DRE"
        description="Demonstrativo de resultado do periodo, calculado a partir das vendas, CMV e custos."
        actions={
          <>
            <label className="range-label">De<input type="date" className="select-control" value={from} onChange={(e) => { setFrom(e.target.value); localStorage.setItem('dre_from', e.target.value) }} /></label>
            <label className="range-label">Ate<input type="date" className="select-control" value={to} onChange={(e) => { setTo(e.target.value); localStorage.setItem('dre_to', e.target.value) }} /></label>
          </>
        }
      />
      {error && <p style={{ margin: '10px 0', fontSize: 13, color: '#b42318', background: '#fef3f2', border: '1px solid #fecdca', borderRadius: 10, padding: '8px 12px' }}>{error}</p>}
      {loading && <p style={{ margin: '8px 0', fontSize: 13, color: '#68746e' }}>Calculando o DRE...</p>}
      {!dre.hasFixed && !loading && <p style={warnBox}>Nenhum custo fixo lancado neste periodo - o resultado ainda nao reflete aluguel, pessoal e demais custos. Complete em <Link to="/custos">Custos</Link>.</p>}
      {!dre.hasVariable && !loading && <p style={warnBox}>Nenhuma regra de custo variavel cadastrada - embalagens e taxas de delivery nao estao sendo descontadas. Complete em <Link to="/custos">Custos</Link>.</p>}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <StatCard label="Receita bruta" value={brl(dre.revenue)} detail="Vendas no periodo" icon={<CircleDollarSign size={19} />} />
        <StatCard label="Custos totais" value={brl(dre.totalCosts)} detail="CMV + variaveis + fixos" icon={<TrendingDown size={19} />} />
        <StatCard label="Margem de contribuicao" value={brl(dre.margin)} detail={dre.revenue > 0 ? pctFmt((dre.margin / dre.revenue) * 100) + ' da receita' : '-'} icon={<Percent size={19} />} />
        <StatCard label="Resultado do periodo" value={brl(dre.result)} detail={dre.revenue > 0 ? pctFmt((dre.result / dre.revenue) * 100) + ' da receita' : '-'} icon={<Wallet size={19} />} />
      </section>

      <section className="panel">
        <h2>Demonstrativo de resultado</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Conta</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>% da receita</th></tr></thead>
            <tbody>
              {dre.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: r.indent ? 26 : 8, fontWeight: r.strong ? 700 : 400 }}>{r.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: r.strong ? 700 : 400, color: r.color }}>{r.value}</td>
                  <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{r.pct}</td>
                </tr>
              ))}
              {!dre.hasData && (
                <tr><td colSpan={3}><div className="empty-state"><h2>Sem dados no periodo</h2><p>Lance vendas e custos para o DRE ser calculado automaticamente.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
`
fs.writeFileSync('src/pages/DrePage.tsx', page, 'utf8')
console.log('OK: src/pages/DrePage.tsx criado (' + page.length + ' caracteres)')

const p = 'src/App.tsx'
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original

if (s.includes("import { DrePage } from './pages/DrePage'")) console.log('OK: import ja existia')
else if (s.includes("import { CostsPage } from './pages/CostsPage'")) {
  s = s.replace("import { CostsPage } from './pages/CostsPage'", "import { CostsPage } from './pages/CostsPage'" + eol + "import { DrePage } from './pages/DrePage'")
  console.log('OK: import da DrePage')
} else if (s.includes("import { SalesPage } from './pages/SalesPage'")) {
  s = s.replace("import { SalesPage } from './pages/SalesPage'", "import { SalesPage } from './pages/SalesPage'" + eol + "import { DrePage } from './pages/DrePage'")
  console.log('OK: import da DrePage (ancora SalesPage)')
} else console.log('ATENCAO: nenhuma ancora de import encontrada')

const routeRe = /element=\{<PlaceholderPage title="DRE"[^{}]*\}/
if (s.includes('<DrePage />')) console.log('OK: rota ja apontava para DrePage')
else if (routeRe.test(s)) { s = s.replace(routeRe, 'element={<DrePage />}'); console.log('OK: rota /dre aponta para a pagina real') }
else console.log('ATENCAO: rota do placeholder DRE nao encontrada')

if (s !== original) { fs.writeFileSync(p + '.bak93', original, 'utf8'); fs.writeFileSync(p, s, 'utf8') }
console.log('Concluido')