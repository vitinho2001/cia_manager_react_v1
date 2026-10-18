import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { CircleDollarSign, Pencil, Percent, Plus, ReceiptText, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { getCurrentOrganizationId } from '../services/organization'
import { listSales } from '../services/sales'
import { listIngredients, listPurchases } from '../services/ingredients'
import { listMenuComponents } from '../services/menu'
import { listRecipes, listRecipeItems } from '../services/recipes'
import { computeStock, listStockAdjustments } from '../services/stock'
import type { StockLine } from '../types/stock'
import { createOperatingCost, createOperatingCosts, deleteOperatingCost, listOperatingCosts, updateOperatingCost } from '../services/costs'
import type { OperatingCost } from '../types/costs'
import type { Sale } from '../types/sales'


const CHANNELS = [
  { value: 'counter', label: 'Balcao' },
  { value: 'ifood', label: 'iFood' },
  { value: 'bysell', label: 'BySell' },
  { value: 'other', label: 'Outro' },
]
const CATEGORIES = ['Estrutura', 'Pessoal', 'Utilidades', 'Servicos', 'Financeiro', 'Operacao']

function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function firstOfMonth() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01' }
function monthIdx(d: string) { const parts = d.split('-'); return (Number(parts[0]) || 0) * 12 + (Number(parts[1]) || 0) - 1 }
function fmtInt(n: number) { return (Number(n) || 0).toLocaleString('pt-BR') }
function pctFmt(v: number) { return (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' }
function brl(v: number) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export function CostsPage() {
  const [from, setFrom] = useState(() => localStorage.getItem('costs_from') || firstOfMonth())
  const [to, setTo] = useState(() => localStorage.getItem('costs_to') || today())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [costs, setCosts] = useState<OperatingCost[]>([])
  const [lines, setLines] = useState<StockLine[]>([])
  const [fDate, setFDate] = useState(firstOfMonth())
  const [fName, setFName] = useState('')
  const [fCategory, setFCategory] = useState(CATEGORIES[0])
  const [fAmount, setFAmount] = useState('')
  const [vName, setVName] = useState('')
  const [vCalc, setVCalc] = useState<'unit' | 'percent'>('unit')
  const [vValue, setVValue] = useState('')
  const [vChannel, setVChannel] = useState('ifood')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const labelCol: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#475569' }
  const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }

  const revenue = useMemo(() => sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0), [sales])
  const qtySold = useMemo(() => sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0), [sales])
  const revenueByChannel = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sales) map.set(s.channel, (map.get(s.channel) ?? 0) + (Number(s.total_amount) || 0))
    return map
  }, [sales])
  const fixedRows = useMemo(() => costs.filter((c) => c.cost_type === 'fixed' && monthIdx(c.expense_date) >= monthIdx(from) && monthIdx(c.expense_date) <= monthIdx(to)), [costs, from, to])
  const variableRows = useMemo(() => costs.filter((c) => c.cost_type === 'variable'), [costs])
  const fixedTotal = useMemo(() => fixedRows.reduce((sum, c) => sum + (Number(c.amount) || 0), 0), [fixedRows])
  function calcVariable(c: OperatingCost): number {
    if (c.calc_type === 'percent') return ((revenueByChannel.get(c.channel ?? '') ?? 0) * (Number(c.percent) || 0)) / 100
    return qtySold * (Number(c.unit_price) || 0)
  }
  const variableTotal = useMemo(() => variableRows.reduce((sum, c) => sum + calcVariable(c), 0), [variableRows, qtySold, revenueByChannel])
  const cmvCost = useMemo(() => lines.reduce((sum, l) => sum + l.consumed * l.avgCost, 0), [lines])
  const cmvPct = revenue > 0 ? (cmvCost / revenue) * 100 : 0
  const profit = revenue - fixedTotal - variableTotal - cmvCost

  function channelLabel(v: string) { const hit = CHANNELS.find((c) => c.value === v); return hit ? hit.label : v }
  function calcLabel(c: OperatingCost) {
    if (c.calc_type === 'percent') return String(Number(c.percent) || 0) + '% do canal ' + channelLabel(c.channel ?? '')
    return brl(Number(c.unit_price) || 0) + ' por unidade vendida'
  }
  function calcDetail(c: OperatingCost) {
    if (c.calc_type === 'percent') { const base = revenueByChannel.get(c.channel ?? '') ?? 0; return brl(base) + ' x ' + String(Number(c.percent) || 0) + '%' }
    return fmtInt(qtySold) + ' un x ' + brl(Number(c.unit_price) || 0)
  }

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
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar custos.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [from, to])

  async function submitFixed(e: FormEvent) {
    e.preventDefault()
    const amount = parseFloat(fAmount)
    if (!fName.trim() || !(amount >= 0)) { setMsg('Preencha nome e valor do custo fixo.'); return }
    setSaving(true)
    try {
      const organizationId = await getCurrentOrganizationId()
      if (editingId) {
        await updateOperatingCost(editingId, { expense_date: fDate, description: fName.trim(), amount, category: fCategory })
        await load(); setMsg('Custo fixo atualizado.')
      } else {
        await createOperatingCost({ organization_id: organizationId, expense_date: fDate, description: fName.trim(), amount, cost_type: 'fixed', category: fCategory })
        await load(); setMsg('Custo fixo adicionado.')
      }
      setEditingId(null); setFName(''); setFAmount('')
    } catch (e2) { setError(e2 instanceof Error ? e2.message : 'Falha ao salvar custo fixo.') }
    finally { setSaving(false) }
  }

  async function submitVariable(e: FormEvent) {
    e.preventDefault()
    const value = parseFloat(vValue)
    if (!vName.trim() || !(value >= 0)) { setMsg('Preencha nome e valor do custo variavel.'); return }
    if (vCalc === 'percent' && !vChannel) { setMsg('Escolha o canal do percentual.'); return }
    setSaving(true)
    try {
      const organizationId = await getCurrentOrganizationId()
      const payload = { description: vName.trim(), calc_type: vCalc, unit_price: vCalc === 'unit' ? value : null, percent: vCalc === 'percent' ? value : null, channel: vCalc === 'percent' ? vChannel : null }
      if (editingId) {
        await updateOperatingCost(editingId, payload)
        await load(); setMsg('Custo variavel atualizado.')
      } else {
        await createOperatingCost({ organization_id: organizationId, expense_date: from, amount: 0, cost_type: 'variable', category: 'Variaveis', ...payload })
        await load(); setMsg('Custo variavel adicionado.')
      }
      setEditingId(null); setVName(''); setVValue('')
    } catch (e2) { setError(e2 instanceof Error ? e2.message : 'Falha ao salvar custo variavel.') }
    finally { setSaving(false) }
  }

  function startEdit(c: OperatingCost) {
    setEditingId(c.id)
    if (c.cost_type === 'fixed') {
      setFDate(c.expense_date); setFName(c.description); setFCategory(c.category); setFAmount(String(c.amount))
    } else {
      setVName(c.description)
      setVCalc(c.calc_type === 'percent' ? 'percent' : 'unit')
      setVValue(c.calc_type === 'percent' ? String(c.percent ?? 0) : String(c.unit_price ?? 0))
      setVChannel(c.channel ?? 'ifood')
    }
  }

  async function removeRow(c: OperatingCost) {
    if (!window.confirm('Excluir "' + c.description + '"? Esta acao nao pode ser desfeita.')) return
    try { await deleteOperatingCost(c.id); await load(); setMsg('Custo excluido.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao excluir.') }
  }

  async function copyPrevMonth() {
    setSaving(true)
    try {
      const organizationId = await getCurrentOrganizationId()
      const base = new Date(from + 'T00:00:00Z')
      const prevStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
      const prevEnd = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 0)).toISOString().slice(0, 10)
      const prevRows = (await listOperatingCosts(organizationId, prevStart, prevEnd)).filter((c) => c.cost_type === 'fixed')
      if (!prevRows.length) { setMsg('Nenhum custo fixo no mes anterior para copiar.'); return }
      const lastTargetDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
      const inputs = prevRows.map((c) => {
        const day = Math.min(Number(c.expense_date.slice(8, 10)) || 1, lastTargetDay)
        const date = from.slice(0, 7) + '-' + String(day).padStart(2, '0')
        return { organization_id: organizationId, expense_date: date, description: c.description, amount: c.amount, cost_type: 'fixed' as const, category: c.category }
      })
      await createOperatingCosts(inputs)
      await load()
      setMsg(prevRows.length + ' custo(s) fixo(s) copiado(s) do mes anterior.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao copiar mes anterior.') }
    finally { setSaving(false) }
  }

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Financeiro"
        title="Custos"
        description="Custos fixos e variáveis do período, com lucro estimado."
        actions={
          <>
            <label className="range-label">De<input type="date" className="select-control" value={from} onChange={(e) => { setFrom(e.target.value); localStorage.setItem('costs_from', e.target.value) }} /></label>
            <label className="range-label">Até<input type="date" className="select-control" value={to} onChange={(e) => { setTo(e.target.value); localStorage.setItem('costs_to', e.target.value) }} /></label>
          </>
        }
      />
      {error && <p style={{ margin: '10px 0', fontSize: 13, color: '#b42318', background: '#fef3f2', border: '1px solid #fecdca', borderRadius: 10, padding: '8px 12px' }}>{error}</p>}
      {msg && <p style={{ margin: '10px 0', fontSize: 13, color: '#067647', background: '#ecfdf3', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px' }}>{msg}</p>}
      {loading && <p style={{ margin: '8px 0', fontSize: 13, color: '#68746e' }}>Carregando custos...</p>}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <StatCard label="Receita" value={brl(revenue)} detail="Vendas no período" icon={<CircleDollarSign size={19} />} />
        <StatCard label="Custos fixos" value={brl(fixedTotal)} detail={fixedRows.length + ' lançamento(s)'} icon={<ReceiptText size={19} />} />
        <StatCard label="Custos variáveis" value={brl(variableTotal)} detail={variableRows.length + ' regra(s) aplicada(s)'} icon={<Percent size={19} />} />
        <StatCard label="CMV (insumos)" value={brl(cmvCost)} detail={pctFmt(cmvPct) + ' da receita'} icon={<TrendingUp size={19} />} />
        <StatCard label="Lucro estimado" value={brl(profit)} detail="Receita - fixos - variáveis - CMV" icon={<Wallet size={19} />} />
      </section>

      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2>Custos fixos</h2>
          <Button variant="secondary" onClick={() => void copyPrevMonth()} disabled={saving}>Copiar mês anterior</Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {fixedRows.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><h2>Nenhum custo fixo no período</h2><p>Cadastre aluguel, salários, freelancers, luz, água, gás e demais custos mensais no formulário abaixo.</p></div></td></tr>
              ) : fixedRows.map((c) => (
                <tr key={c.id}>
                  <td>{c.expense_date}</td>
                  <td>{c.description}</td>
                  <td>{c.category}</td>
                  <td>{brl(c.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="icon-btn" title="Editar" onClick={() => startEdit(c)}><Pencil size={16} /></button>
                      <button type="button" className="icon-btn" title="Excluir" onClick={() => void removeRow(c)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={(e) => void submitFixed(e)} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 14 }}>
          <label style={{ ...labelCol, maxWidth: 180 }}>Data<input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} style={inputStyle} /></label>
          <label style={{ ...labelCol, flex: '1 1 220px' }}>Nome<input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex.: Aluguel, Freelancer..." style={inputStyle} /></label>
          <label style={{ ...labelCol, maxWidth: 180 }}>Categoria<select className="select-control" value={fCategory} onChange={(e) => setFCategory(e.target.value)} style={inputStyle}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label style={{ ...labelCol, maxWidth: 150 }}>Valor (R$)<input type="number" min="0" step="any" value={fAmount} onChange={(e) => setFAmount(e.target.value)} style={inputStyle} /></label>
          {editingId && <Button variant="secondary" onClick={() => setEditingId(null)}>Cancelar edição</Button>}
          <Button icon={<Plus size={16} />} disabled={saving}>{editingId ? 'Salvar alterações' : 'Adicionar custo fixo'}</Button>
        </form>
      </section>

      <section className="panel">
        <h2>Custos variáveis</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#4b5563' }}>Regras calculadas sobre as vendas do período: valor por unidade vendida ou percentual sobre um canal.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Cálculo</th><th>Calculado no período</th><th></th></tr></thead>
            <tbody>
              {variableRows.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><h2>Nenhuma regra de custo variável</h2><p>Ex.: embalagem por unidade, taxa do iFood, taxa da maquininha no Balcão.</p></div></td></tr>
              ) : variableRows.map((c) => (
                <tr key={c.id}>
                  <td>{c.description}</td>
                  <td>{calcLabel(c)}</td>
                  <td>{brl(calcVariable(c))}<small style={{ display: 'block', fontSize: 11, color: '#6b7280' }}>{calcDetail(c)}</small></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="icon-btn" title="Editar" onClick={() => startEdit(c)}><Pencil size={16} /></button>
                      <button type="button" className="icon-btn" title="Excluir" onClick={() => void removeRow(c)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={(e) => void submitVariable(e)} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 14 }}>
          <label style={{ ...labelCol, flex: '1 1 200px' }}>Nome<input type="text" value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Ex.: Embalagem marmita" style={inputStyle} /></label>
          <label style={{ ...labelCol, maxWidth: 220 }}>Tipo de cálculo
            <select className="select-control" value={vCalc} onChange={(e) => setVCalc(e.target.value as 'unit' | 'percent')} style={inputStyle}>
              <option value="unit">Por unidade vendida</option>
              <option value="percent">Percentual por canal</option>
            </select>
          </label>
          <label style={{ ...labelCol, maxWidth: 180 }}>{vCalc === 'unit' ? 'Valor por unidade (R$)' : 'Percentual (%)'}
            <input type="number" min="0" step="any" value={vValue} onChange={(e) => setVValue(e.target.value)} style={inputStyle} />
          </label>
          {vCalc === 'percent' && (
            <label style={{ ...labelCol, maxWidth: 160 }}>Canal
              <select className="select-control" value={vChannel} onChange={(e) => setVChannel(e.target.value)} style={inputStyle}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          )}
          {editingId && <Button variant="secondary" onClick={() => setEditingId(null)}>Cancelar edição</Button>}
          <Button icon={<Plus size={16} />} disabled={saving}>{editingId ? 'Salvar alterações' : 'Adicionar custo variável'}</Button>
        </form>
      </section>
    </div>
  )
}
