const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1. Tipo ganha 'day'
const tOld = "type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year'"
const tNew = "type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'"
if (s.includes(tOld)) { s = s.split(tOld).join(tNew); ok('tipo day') } else warn('tipo day')

// 2. Rotulo
const lOld = "const periodTypeLabel: Record<PeriodType, string> = { week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano' }"
const lNew = "const periodTypeLabel: Record<PeriodType, string> = { day: 'Dia', week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano' }"
if (s.includes(lOld)) { s = s.split(lOld).join(lNew); ok('rotulo Dia') } else warn('rotulo Dia')

// 3. periodBounds: caso day
const bOld = "  if (p.type === 'week') {"
const bNew = "  if (p.type === 'day') { return { start: p.key, end: p.key } }\n  if (p.type === 'week') {"
if (s.includes(bOld)) { s = s.split(bOld).join(bNew); ok('bounds para dia') } else warn('bounds para dia')

// 4. periodKey: day
const kOld = "  if (type === 'week') return iso(startOfWeek(d))"
const kNew = "  if (type === 'day') return iso(d)\n  if (type === 'week') return iso(startOfWeek(d))"
if (s.includes(kOld)) { s = s.split(kOld).join(kNew); ok('periodKey para dia') } else warn('periodKey para dia')

// 5. periodLabel: day
const lbOld = "  if (p.type === 'week') return 'Semana de '"
const lbNew = "  if (p.type === 'day') return new Date(Number(p.key.slice(0,4)), Number(p.key.slice(5,7))-1, Number(p.key.slice(8,10))).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })\n  if (p.type === 'week') return 'Semana de '"
if (s.includes(lbOld)) { s = s.split(lbOld).join(lbNew); ok('label para dia') } else warn('label para dia')

// 6. periodOptions: day (ultimos 30 dias)
const oOld = "  if (type === 'week') { for (let i = 0; i < 12; i++)"
const oNew = "  if (type === 'day') { for (let i = 0; i < 30; i++) { const d = addDays(now, -i); out.push({ type, key: periodKey(type, d) }) } }\n  else if (type === 'week') { for (let i = 0; i < 12; i++)"
if (s.includes(oOld)) { s = s.split(oOld).join(oNew); ok('options para dia') } else warn('options para dia')

// 7. Lista de tipos no select
const selOld = "{(['week','month','quarter','semester','year'] as PeriodType[]).map((t) =>"
const selNew = "{(['day','week','month','quarter','semester','year'] as PeriodType[]).map((t) =>"
if (s.includes(selOld)) { s = s.split(selOld).join(selNew); ok('select com Dia') } else warn('select com Dia')

fs.writeFileSync(p + '.bak59', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')