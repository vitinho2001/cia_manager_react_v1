const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (name) => { count++; console.log('OK: ' + name) }
const warn = (name) => console.log('ATENCAO: ' + name)

const newHelpers = `type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year'
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
  if (p.type === 'month') return new Date(p.key + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
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
const currentPeriod: Period = { type: 'month', key: periodKey('month', new Date()) }`

const startAnchor = 'const monthKey = (d: Date) =>'
const endAnchor = "const monthLabel = (m: string) => new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })"
const si = s.indexOf(startAnchor)
const ei = s.indexOf(endAnchor)
if (si !== -1 && ei !== -1) {
  const end = ei + endAnchor.length
  s = s.slice(0, si) + newHelpers + s.slice(end)
  ok('helpers de periodo (semana/mes/trimestre/semestre/ano)')
} else {
  warn('helpers de periodo (bloco monthKey..monthLabel nao encontrado)')
}

const stOld = 'const [month, setMonth] = useState(currentMonth)'
const stNew = 'const [period, setPeriod] = useState<Period>(currentPeriod)'
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado period') }
else warn('estado period (useState month nao encontrado)')

const bOld = 'const bounds = monthBounds(month)'
const bNew = 'const bounds = periodBounds(period)'
if (s.includes(bOld)) { s = s.split(bOld).join(bNew); ok('bounds por periodo') }
else warn('bounds por periodo (monthBounds nao encontrado)')

const eOld = 'useEffect(() => { void load() }, [month])'
const eNew = 'useEffect(() => { void load() }, [period])'
if (s.includes(eOld)) { s = s.split(eOld).join(eNew); ok('useEffect depende do periodo') }
else warn('useEffect nao encontrado')

const hOld = `actions={<><select className="select-control" value={month} onChange={(e) => setMonth(e.target.value)} title="Mes do estoque">{monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><Button onClick={() => setModal(true)}><Plus size={16}/> Ajuste de estoque</Button></>}`
const hNew = `actions={<><select className="select-control" value={period.type} onChange={(e) => { const t = e.target.value as PeriodType; setPeriod({ type: t, key: periodKey(t, new Date()) }) }} title="Tipo de periodo">{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) => <option key={t} value={t}>{periodTypeLabel[t]}</option>)}</select><select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select><Button onClick={() => setModal(true)}><Plus size={16}/> Ajuste de estoque</Button></>}`
if (s.includes(hOld)) { s = s.split(hOld).join(hNew); ok('seletores de periodo no cabecalho') }
else warn('seletores de periodo (PageHeader nao encontrado)')

fs.writeFileSync(p + '.bak44', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas (backup em EstoquePage.tsx.bak44)')