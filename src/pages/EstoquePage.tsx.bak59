import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Coins, Package, PackageSearch, Plus, RefreshCw, TrendingUp, X } from 'lucide-react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { getCurrentOrganizationId } from '../services/organization'
import { listIngredients, listPurchases } from '../services/ingredients'
import { listMenuItems, listMenuComponents } from '../services/menu'
import { listRecipes, listRecipeItems } from '../services/recipes'
import { listSales } from '../services/sales'
import { computeStock, createStockAdjustment, deleteStockAdjustment, listStockAdjustments } from '../services/stock'
import type { Ingredient, IngredientPurchase } from '../types/ingredients'
import type { MenuItem, MenuItemComponent } from '../types/menu'
import type { Recipe, RecipeItem } from '../types/recipes'
import type { Sale } from '../types/sales'
import type { StockAdjustment, StockAdjustmentType } from '../types/stock'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year'
type Period = { type: PeriodType; key: string }
const periodTypeLabel: Record<PeriodType, string> = { week: 'Semana', month: 'Mês', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano' }
const pad2 = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function periodBounds(p: Period): { start: string; end: string } {
  if (p.type === 'week') {
    const monday = startOfWeek(new Date(p.key + 'T00:00:00'))
    return { start: iso(monday), end: iso(addDays(monday, 6)) }
  }
  if (p.type === 'month') {
    const [y, m] = p.key.split('-').map(Number)
    return { start: p.key + '-01', end: p.key + '-' + pad2(new Date(y, m, 0).getDate()) }
  }
  if (p.type === 'quarter') {
    const [y, q] = p.key.split('-').map(Number)
    const sm = (q - 1) * 3
    return { start: y + '-' + pad2(sm + 1) + '-01', end: y + '-' + pad2(sm + 3) + '-' + pad2(new Date(y, sm + 3, 0).getDate()) }
  }
  if (p.type === 'semester') {
    const [y, s] = p.key.split('-').map(Number)
    const sm = (s - 1) * 6
    return { start: y + '-' + pad2(sm + 1) + '-01', end: y + '-' + pad2(sm + 6) + '-' + pad2(new Date(y, sm + 6, 0).getDate()) }
  }
  const y = Number(p.key)
  return { start: y + '-01-01', end: y + '-12-31' }
}
function periodKey(type: PeriodType, d: Date): string {
  if (type === 'week') return iso(startOfWeek(d))
  if (type === 'month') return d.getFullYear() + '-' + pad2(d.getMonth() + 1)
  if (type === 'quarter') return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1)
  if (type === 'semester') return d.getFullYear() + '-S' + (d.getMonth() < 6 ? 1 : 2)
  return String(d.getFullYear())
}
function periodLabel(p: Period): string {
  if (p.type === 'week') return 'Semana de ' + new Date(p.key + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (p.type === 'month') return new Date(Number(p.key.slice(0, 4)), Number(p.key.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  if (p.type === 'quarter') { const [y, q] = p.key.split('-').map(Number); return y + ' · ' + (q === 1 ? '1º trim' : q === 2 ? '2º trim' : q === 3 ? '3º trim' : '4º trim') }
  if (p.type === 'semester') { const [y, s] = p.key.split('-').map(Number); return y + ' · ' + (s === 1 ? '1º sem' : '2º sem') }
  return 'Ano de ' + p.key
}
function periodOptions(type: PeriodType): Period[] {
  const out: Period[] = []
  const now = new Date()
  if (type === 'week') { for (let i = 0; i < 12; i++) { const d = addDays(startOfWeek(now), -7 * i); out.push({ type, key: periodKey(type, d) }) } }
  else if (type === 'month') { for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push({ type, key: periodKey(type, d) }) } }
  else if (type === 'quarter') { for (let i = 0; i < 8; i++) { const d = new Date(now.getFullYear(), now.getMonth() - 3 * i, 1); out.push({ type, key: periodKey(type, d) }) } }
  else if (type === 'semester') { for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - 6 * i, 1); out.push({ type, key: periodKey(type, d) }) } }
  else { for (let i = 0; i < 5; i++) { out.push({ type, key: String(now.getFullYear() - i) }) } }
  return out
}
const currentPeriod: Period = { type: 'month', key: periodKey('month', new Date()) }


export function EstoquePage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuComponents, setMenuComponents] = useState<MenuItemComponent[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>(currentPeriod)
  const [modal, setModal] = useState(false)
  const [adjIngredient, setAdjIngredient] = useState('')
  const [adjType, setAdjType] = useState<StockAdjustmentType>('loss')
  const [adjQty, setAdjQty] = useState('')
  const [adjDate, setAdjDate] = useState(new Date().toISOString().slice(0, 10))
  const [adjReason, setAdjReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true); setError(null)
    try {
      const orgId = organizationId ?? await getCurrentOrganizationId()
      setOrganizationId(orgId)
      const bounds = periodBounds(period)
      const [ingRows, purRows, menuRows, compRows, recRows, recItemRows, saleRows, adjRows] = await Promise.all([
        listIngredients(orgId).catch((e) => { console.error('ingredientes', e); return [] }),
        listPurchases(orgId, undefined, bounds.end).catch((e) => { console.error('compras', e); return [] }),
        listMenuItems(orgId).catch((e) => { console.error('cardapio', e); return [] }),
        listMenuComponents(orgId).catch((e) => { console.error('componentes', e); return [] }),
        listRecipes(orgId).catch((e) => { console.error('receitas', e); return [] }),
        listRecipeItems(orgId).catch((e) => { console.error('itens receita', e); return [] }),
        listSales(orgId, undefined, bounds.end).catch((e) => { console.error('vendas', e); return [] }),
        listStockAdjustments(orgId).catch((e) => { console.error('ajustes', e); return [] }),
      ])
      setIngredients(ingRows); setPurchases(purRows); setMenuItems(menuRows); setMenuComponents(compRows)
      setRecipes(recRows); setRecipeItems(recItemRows); setSales(saleRows); setAdjustments(adjRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o estoque.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [period])

const lines = useMemo(() => computeStock(ingredients, purchases, menuComponents, recipeItems, sales, adjustments, recipes), [ingredients, purchases, menuComponents, recipeItems, sales, adjustments, recipes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((l) => l.name.toLowerCase().includes(q) || (l.category ?? '').toLowerCase().includes(q))
  }, [lines, search])

  const totalValue = lines.reduce((s, l) => s + l.value, 0)
  const withoutRecipe = lines.filter((l) => !l.hasRecipe).length
  const lowStock = lines.filter((l) => l.balance <= 0).length

  async function submitAdjustment() {
    if (!organizationId || !adjIngredient) { setError('Escolha o insumo.'); return }
    const qty = parseFloat(adjQty)
    if (!adjDate || !(qty > 0)) { setError('Informe data e quantidade validas.'); return }
    setSaving(true); setError(null)
    try {
      await createStockAdjustment({
        organization_id: organizationId,
        ingredient_id: adjIngredient,
        adjustment_date: adjDate,
        adjustment_type: adjType,
        quantity: qty,
        unit: ingredients.find((i) => i.id === adjIngredient)?.purchase_unit ?? '',
        reason: adjReason.trim() || undefined,
      })
      setSuccess('Ajuste registrado.'); setModal(false); setAdjQty(''); setAdjReason(''); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Nao foi possivel registrar o ajuste.') }
    finally { setSaving(false) }
  }

  async function removeAdjustment(id: string) {
    if (!window.confirm('Excluir este ajuste?')) return
    try { await deleteStockAdjustment(id); setSuccess('Ajuste excluido.'); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Nao foi possivel excluir o ajuste.') }
  }

  return (
    <div className="page-container">
      <PageHeader  title="Estoque" description="Saldo por insumo = compras - consumo (vendas x receita) e ajustes, valendo pelo custo medio acumulado." actions={<><select className="select-control" value={period.type} onChange={(e) => { const t = e.target.value as PeriodType; setPeriod({ type: t, key: periodKey(t, new Date()) }) }} title="Tipo de periodo">{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) => <option key={t} value={t}>{periodTypeLabel[t]}</option>)}</select><select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select><Button onClick={() => setModal(true)}><Plus size={16}/> Ajuste de estoque</Button></>} />

      <div className="stat-grid">
        <StatCard icon={<Package size={20}/>} label="Insumos" value={String(lines.length)} detail="cadastrados" />
        <StatCard icon={<Coins size={20}/>} label="Valor em estoque" value={brl(totalValue)} detail="saldo x custo medio" />
        <StatCard icon={<TrendingUp size={20}/>} label="Sem receita" value={String(withoutRecipe)} detail="nao baixam estoque" />
        <StatCard icon={<AlertTriangle size={20}/>} label="Saldo zero/negativo" value={String(lowStock)} detail="atencao" />
      </div>

      <div className="table-toolbar">
        <div className="search-box table-search"><PackageSearch size={17}/><input placeholder="Buscar insumo..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      {error && <div style={{ color: '#b3261e', margin: '10px 0' }}>{error}</div>}
      {success && <div style={{ color: '#1e7d46', margin: '10px 0' }}>{success}</div>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th>Categoria</th><th>Comprado</th><th>Consumido</th><th>Ajustado</th><th>Saldo</th><th>Custo medio</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state compact"><Package size={32}/><h2>Sem insumos</h2><p>Cadastre insumos na aba Insumos para ver o estoque.</p></div></td></tr>
            ) : filtered.map((l) => (
              <tr key={l.ingredientId}>
                <td><strong>{l.name}</strong></td>
                <td>{l.category ?? '-'}</td>
                <td>{num(l.purchased)} {l.unit}</td>
                <td>{num(l.consumed)} {l.unit}</td>
                <td>{num(l.adjusted)} {l.unit}</td>
                <td><strong>{num(l.balance)} {l.unit}</strong></td>
                <td>{brl(l.avgCost)}</td>
                <td>{brl(l.value)}</td>
                <td>{l.hasRecipe ? <span>Em uso</span> : <span className="status-warning">Sem receita</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide">
            <div className="modal-header"><h2>Registrar ajuste de estoque</h2><button className="modal-close" type="button" onClick={() => setModal(false)}><X size={18} /></button></div>
            <p className="modal-description">Perda e quebra reduzem o saldo; sobra aumenta. O ajuste entra no calculo do estoque sem virar compra ou venda.</p>
            <div className="form-grid">
              <label className="form-span">Insumo
                <select className="select-control" value={adjIngredient} onChange={(e) => setAdjIngredient(e.target.value)}>
                  <option value="">Selecione...</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </label>
              <label>Tipo
                <select className="select-control" value={adjType} onChange={(e) => setAdjType(e.target.value as StockAdjustmentType)}>
                  <option value="loss">Perda</option>
                  <option value="waste">Quebra</option>
                  <option value="surplus">Sobra</option>
                </select>
              </label>
              <label>Data
                <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
              </label>
              <label>Quantidade
                <input type="number" min="0" step="any" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
              </label>
              <label className="form-span">Motivo (opcional)
                <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Ex.: vazou, venceu, sobra do dia" />
              </label>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={() => void submitAdjustment()} disabled={saving || !adjIngredient}>{saving ? 'Salvando...' : 'Registrar ajuste'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
