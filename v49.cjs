const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (name) => { count++; console.log('OK: ' + name) }
const warn = (name) => console.log('ATENCAO: ' + name)

// 1. Helpers de periodo (antes do componente)
const anchor = 'export function SalesPage()'
const helpers = `type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year'
type Period = { type: PeriodType; key: string }
const periodTypeLabel: Record<PeriodType, string> = { week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano' }
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
    const [y, s2] = p.key.split('-').map(Number)
    const sm = (s2 - 1) * 6
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
  if (p.type === 'week') return 'Semana de ' + new Date(Number(p.key.slice(0,4)), Number(p.key.slice(5,7))-1, Number(p.key.slice(8,10))).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (p.type === 'month') return new Date(Number(p.key.slice(0,4)), Number(p.key.slice(5,7))-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  if (p.type === 'quarter') { const [y, q] = p.key.split('-').map(Number); return y + ' · ' + (q === 1 ? '1o trim' : q === 2 ? '2o trim' : q === 3 ? '3o trim' : '4o trim') }
  if (p.type === 'semester') { const [y, s2] = p.key.split('-').map(Number); return y + ' · ' + (s2 === 1 ? '1o sem' : '2o sem') }
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
export function SalesPage()`
if (s.includes(anchor)) { s = s.split(anchor).join(helpers); ok('helpers de periodo') }
else warn('helpers de periodo (SalesPage nao encontrado)')

// 2. Estado period
const stOld = 'const [date, setDate] = useState(today())'
const stNew = 'const [date, setDate] = useState(today())\n  const [period, setPeriod] = useState<Period>(currentPeriod)'
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado period') }
else warn('estado period (useState date nao encontrado)')

// 3. load filtra por periodo
const ldOld = 'const res = await Promise.all([listSales(organizationId, date, date), listMenuItems(organizationId)])'
const ldNew = 'const bounds = periodBounds(period)\n      const res = await Promise.all([listSales(organizationId, bounds.start, bounds.end), listMenuItems(organizationId)])'
if (s.includes(ldOld)) { s = s.split(ldOld).join(ldNew); ok('load filtra por periodo') }
else warn('load filtra por periodo (listSales nao encontrado)')

// 4. dependencias do load
const depOld = '}, [organizationId, date])'
const depNew = '}, [organizationId, period])'
if (s.includes(depOld)) { s = s.split(depOld).join(depNew); ok('dependencias do load') }
else warn('dependencias do load ([organizationId, date] nao encontrado)')

// 5. Seletores de periodo + dia na toolbar (CRASE para evitar conflito de aspas)
const inpOld = '<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />'
const inpNew = `<select className="select-control" value={period.type} onChange={(e) => { const t = e.target.value as PeriodType; setPeriod({ type: t, key: periodKey(t, new Date()) }) }} title="Tipo de periodo">{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) => <option key={t} value={t}>{periodTypeLabel[t]}</option>)}</select><select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select><input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Dia para lancar/importar" />`
if (s.includes(inpOld)) { s = s.split(inpOld).join(inpNew); ok('seletores de periodo + dia na toolbar') }
else warn('seletores de periodo (input date nao encontrado)')

fs.writeFileSync(p + '.bak49', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas (backup em SalesPage.tsx.bak49)')