import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CircleDollarSign, Percent, Target, TrendingDown, Wallet } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { getCurrentOrganizationId } from '../services/organization'
import { CHANNEL_LABELS, computeDre, loadDreContext } from '../services/dre'
import type { DreContext, DreData } from '../services/dre'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pctFmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function firstOfMonth() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01' }
function monthKey(d: Date) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
function monthLabel(m: string) {
  const parts = m.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}
function monthStart(m: string) { return m + '-01' }
function monthEnd(m: string) { const parts = m.split('-').map(Number); const last = new Date(parts[0], parts[1], 0).getDate(); return m + '-' + String(last).padStart(2, '0') }
function lastMonths(n: number): string[] {
  const out: string[] = []
  const base = new Date()
  base.setDate(1)
  for (let i = n - 1; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); out.push(monthKey(d)) }
  return out
}

type DreRow = { label: string; value: string; pct: string; indent?: boolean; strong?: boolean; color?: string }

const warnBox: CSSProperties = { margin: '10px 0', fontSize: 13, color: '#9a5d13', background: '#fff4df', border: '1px solid #f0dcae', borderRadius: 10, padding: '8px 12px' }

function buildRows(d: DreData): DreRow[] {
  const pctOf = (v: number) => (d.revenue > 0 ? pctFmt((v / d.revenue) * 100) : '-')
  const rows: DreRow[] = []
  rows.push({ label: 'Receita bruta de vendas', value: brl(d.revenue), pct: pctOf(d.revenue), strong: true })
  for (const [channel, v] of d.revenueByChannel) {
    if (v > 0) rows.push({ label: CHANNEL_LABELS[channel] ?? channel, value: brl(v), pct: pctOf(v), indent: true })
  }
  if (d.cmvCost > 0) rows.push({ label: '(-) CMV - insumos consumidos', value: brl(d.cmvCost), pct: pctOf(d.cmvCost) })
  if (d.variableCalc.length > 0) {
    rows.push({ label: '(-) Custos variaveis', value: brl(d.variableTotal), pct: pctOf(d.variableTotal) })
    for (const r of d.variableCalc) rows.push({ label: r.label, value: brl(r.value), pct: pctOf(r.value), indent: true })
  }
  rows.push({ label: '= Margem de contribuicao', value: brl(d.margin), pct: pctOf(d.margin), strong: true })
  if (d.fixedByCategory.length > 0) {
    rows.push({ label: '(-) Custos fixos', value: brl(d.fixedTotal), pct: pctOf(d.fixedTotal) })
    for (const f of d.fixedByCategory) rows.push({ label: f.category + ' (' + f.count + ')', value: brl(f.value), pct: pctOf(f.value), indent: true })
  }
  rows.push({ label: '= Resultado do periodo', value: brl(d.result), pct: pctOf(d.result), strong: true, color: d.result >= 0 ? '#067647' : '#b42318' })
  rows.push({ label: 'Margem liquida sobre a receita', value: d.revenue > 0 ? pctFmt((d.result / d.revenue) * 100) : '-', pct: '' })
  return rows
}

export function DrePage() {
  const [from, setFrom] = useState(() => localStorage.getItem('dre_from') || firstOfMonth())
  const [to, setTo] = useState(() => localStorage.getItem('dre_to') || today())
  const [windowSize, setWindowSize] = useState(() => Number(localStorage.getItem('dre_window')) || 6)
  const [context, setContext] = useState<DreContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const organizationId = await getCurrentOrganizationId()
      const ctx = await loadDreContext(organizationId, from, to)
      setContext(ctx)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar o DRE.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [from, to])

  const dre = useMemo(() => (context ? computeDre(context, from, to) : null), [context, from, to])
  const rows = useMemo(() => (dre ? buildRows(dre) : []), [dre])

  const comparison = useMemo(() => {
    if (!context) return []
    return lastMonths(windowSize).map((m) => {
      const s = monthStart(m), e = monthEnd(m)
      const monthSales = context.sales.filter((x) => (x.sale_date || '') >= s && (x.sale_date || '') <= e)
      const d = computeDre({ ...context, sales: monthSales }, s, e)
      return { month: m, data: d }
    })
  }, [context, windowSize])

  const breakeven = useMemo(() => {
    if (!dre || dre.revenue <= 0) return null
    const marginPct = dre.margin / dre.revenue
    if (marginPct <= 0) return { marginPct, needed: null as number | null, progress: 0, reachable: false }
    const needed = dre.fixedTotal / marginPct
    const progress = needed > 0 ? Math.min(100, (dre.revenue / needed) * 100) : 100
    return { marginPct, needed, progress, reachable: dre.revenue >= needed }
  }, [dre])
  function delta(current: number, previous: number) {
    if (previous === 0) return { text: current === 0 ? '0%' : 'novo', color: '#6b7280' }
    const diff = ((current - previous) / Math.abs(previous)) * 100
    return { text: (diff >= 0 ? '+' : '') + diff.toFixed(0) + '%', color: diff >= 0 ? '#067647' : '#b42318' }
  }

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
      {dre && !dre.fixedByCategory.length && !loading && <p style={warnBox}>Nenhum custo fixo lancado neste periodo - o resultado ainda nao reflete aluguel, pessoal e demais custos. Complete em <Link to="/custos">Custos</Link>.</p>}
      {dre && !dre.variableCalc.length && !loading && <p style={warnBox}>Nenhuma regra de custo variavel cadastrada - embalagens e taxas de delivery nao estao sendo descontadas. Complete em <Link to="/custos">Custos</Link>.</p>}
      {dre && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <StatCard label="Receita bruta" value={brl(dre.revenue)} detail="Vendas no periodo" icon={<CircleDollarSign size={19} />} />
          <StatCard label="Custos totais" value={brl(dre.totalCosts)} detail="CMV + variaveis + fixos" icon={<TrendingDown size={19} />} />
          <StatCard label="Margem de contribuicao" value={brl(dre.margin)} detail={dre.revenue > 0 ? pctFmt((dre.margin / dre.revenue) * 100) + ' da receita' : '-'} icon={<Percent size={19} />} />
          <StatCard label="Resultado do periodo" value={brl(dre.result)} detail={dre.revenue > 0 ? pctFmt((dre.result / dre.revenue) * 100) + ' da receita' : '-'} icon={<Wallet size={19} />} />
        </section>
      )}

      <section className="panel">
        <h2>Demonstrativo de resultado</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Conta</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>% da receita</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: r.indent ? 26 : 8, fontWeight: r.strong ? 700 : 400 }}>{r.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: r.strong ? 700 : 400, color: r.color }}>{r.value}</td>
                  <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{r.pct}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={3}><div className="empty-state"><h2>Sem dados no periodo</h2><p>Lance vendas e custos para o DRE ser calculado automaticamente.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Ponto de equilibrio</h2>
        {!breakeven && <div className="empty-state"><h2>Sem receita no periodo</h2><p className="x">O ponto de equilibrio e calculado a partir da receita e da margem de contribuicao do periodo.</p></div>}
        {breakeven && breakeven.needed === null && <div className="empty-state"><h2>Margem de contribuicao negativa</h2><p>O CMV e os custos variaveis consomem toda a receita. Cada venda adicional aumenta o prejuizo — revise precos e custos antes de calcular o equilíbrio.</p></div>}
        {breakeven && breakeven.needed !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Custos fixos a cobrir</span>
                <strong style={{ display: 'block', fontSize: 18, color: '#111827' }}>{brl(dre!.fixedTotal)}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Margem de contribuicao</span>
                <strong style={{ display: 'block', fontSize: 18, color: '#111827' }}>{pctFmt(breakeven.marginPct * 100)}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Receita necessaria para empatar</span>
                <strong style={{ display: 'block', fontSize: 18, color: '#111827' }}>{brl(breakeven.needed)}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Falta faturar</span>
                <strong style={{ display: 'block', fontSize: 18, color: breakeven.reachable ? '#067647' : '#b42318' }}>{breakeven.reachable ? 'Meta atingida' : brl(breakeven.needed - dre!.revenue)}</strong>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                <span>{brl(dre!.revenue)} faturado</span>
                <span>{brl(breakeven.needed)} necessario</span>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: breakeven.progress + '%', background: breakeven.reachable ? '#067647' : '#2563eb', borderRadius: 999, transition: 'width .3s ease' }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                {breakeven.reachable ? 'O periodo cobriu os custos fixos — cada real adicional e lucro.' : pctFmt(breakeven.progress) + ' do caminho percorrido ate o equilibrio.'}
              </p>
            </div>
          </div>
        )}
      </section>
      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2>Comparativo mensal</h2>
          <label className="range-label">Janela
            <select className="select-control" value={windowSize} onChange={(e) => { const v = Number(e.target.value); setWindowSize(v); localStorage.setItem('dre_window', String(v)) }}>
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conta</th>
                {comparison.map((c) => <th key={c.month} style={{ textAlign: 'right' }}>{monthLabel(c.month)}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700 }}>Receita</td>
                {comparison.map((c, i) => {
                  const d = i > 0 ? delta(c.data.revenue, comparison[i - 1].data.revenue) : null
                  return <td key={c.month} style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600 }}>{brl(c.data.revenue)}</span>
                    {d && <small style={{ display: 'block', fontSize: 11, color: d.color }}>{d.text}</small>}
                  </td>
                })}
              </tr>
              <tr>
                <td>CMV</td>
                {comparison.map((c) => <td key={c.month} style={{ textAlign: 'right' }}>{brl(c.data.cmvCost)}</td>)}
              </tr>
              <tr>
                <td>Custos variaveis</td>
                {comparison.map((c) => <td key={c.month} style={{ textAlign: 'right' }}>{brl(c.data.variableTotal)}</td>)}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Margem de contribuicao</td>
                {comparison.map((c, i) => {
                  const d = i > 0 ? delta(c.data.margin, comparison[i - 1].data.margin) : null
                  return <td key={c.month} style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600 }}>{brl(c.data.margin)}</span>
                    {d && <small style={{ display: 'block', fontSize: 11, color: d.color }}>{d.text}</small>}
                  </td>
                })}
              </tr>
              <tr>
                <td>Custos fixos</td>
                {comparison.map((c) => <td key={c.month} style={{ textAlign: 'right' }}>{brl(c.data.fixedTotal)}</td>)}
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Resultado</td>
                {comparison.map((c, i) => {
                  const d = i > 0 ? delta(c.data.result, comparison[i - 1].data.result) : null
                  return <td key={c.month} style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: c.data.result >= 0 ? '#067647' : '#b42318' }}>{brl(c.data.result)}</span>
                    {d && <small style={{ display: 'block', fontSize: 11, color: d.color }}>{d.text}</small>}
                  </td>
                })}
              </tr>
              <tr>
                <td>Margem liquida</td>
                {comparison.map((c) => <td key={c.month} style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{c.data.revenue > 0 ? pctFmt((c.data.result / c.data.revenue) * 100) : '-'}</td>)}
              </tr>
              <tr>
                <td>Itens vendidos</td>
                {comparison.map((c) => <td key={c.month} style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{c.data.qtySold.toLocaleString('pt-BR')}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6b7280' }}>As variacoes percentuais comparam cada mes com o mes imediatamente anterior da tabela.</p>
      </section>
    </div>
  )
}
