const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1. Tipo PeriodType ganha 'days'
const tOld = "type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year'"
const tNew = "type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'days'"
if (s.includes(tOld)) { s = s.split(tOld).join(tNew); ok('tipo days') } else warn('PeriodType')

// 2. Rotulo
const lOld = "const periodTypeLabel: Record<PeriodType, string> = { week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano' }"
const lNew = "const periodTypeLabel: Record<PeriodType, string> = { week: 'Semana', month: 'Mes', quarter: 'Trimestre', semester: 'Semestre', year: 'Ano', days: 'Dias' }"
if (s.includes(lOld)) { s = s.split(lOld).join(lNew); ok('rotulo Dias') } else warn('periodTypeLabel')

// 3. periodBounds: caso days (lista de datas)
const bOld = "  if (p.type === 'week') {"
const bNew = "  if (p.type === 'days') {\n    const days = p.key.split(',').map((x) => x.trim()).filter(Boolean).sort()\n    return { start: days[0] || '', end: days[days.length - 1] || '' }\n  }\n  if (p.type === 'week') {"
if (s.includes(bOld)) { s = s.split(bOld).join(bNew); ok('bounds para dias') } else warn('periodBounds')

// 4. periodKey: days -> hoje
const kOld = "  if (type === 'semester') return d.getFullYear() + '-S' + (d.getMonth() < 6 ? 1 : 2)"
const kNew = "  if (type === 'semester') return d.getFullYear() + '-S' + (d.getMonth() < 6 ? 1 : 2)\n  if (type === 'days') return iso(d)"
if (s.includes(kOld)) { s = s.split(kOld).join(kNew); ok('periodKey para dias') } else warn('periodKey')

// 5. periodLabel: days
const lbOld = "  return 'Ano de ' + p.key"
const lbNew = "  if (p.type === 'days') return p.key || 'Selecione os dias'\n  return 'Ano de ' + p.key"
if (s.includes(lbOld)) { s = s.split(lbOld).join(lbNew); ok('label para dias') } else warn('periodLabel')

// 6. periodOptions: days -> vazio
const oOld = "  else { for (let i = 0; i < 5; i++) { out.push({ type, key: String(now.getFullYear() - i) }) } }"
const oNew = "  else if (type === 'days') { out.push({ type, key: '' }) }\n  else { for (let i = 0; i < 5; i++) { out.push({ type, key: String(now.getFullYear() - i) }) } }"
if (s.includes(oOld)) { s = s.split(oOld).join(oNew); ok('options para dias') } else warn('periodOptions')

// 7. Segundo seletor: vira input de dias quando type=days
const selOld = '<select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select>'
const selNew = `{period.type === 'days' ? <input type="text" className="select-control" value={period.key} onChange={(e) => setPeriod({ type: 'days', key: e.target.value })} placeholder="ex: 2026-09-10, 2026-09-12" title="Dias separados por virgula" /> : <select className="select-control" value={period.key} onChange={(e) => setPeriod({ type: period.type, key: e.target.value })} title="Periodo">{periodOptions(period.type).map((p) => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}</select>}`
if (s.includes(selOld)) { s = s.split(selOld).join(selNew); ok('input de dias no seletor') } else warn('select de periodo')

// 8. Load: filtra pelas datas exatas quando days
const soOld = 'setSales(res[0])'
const soNew = `let saleRows = res[0]
      if (period.type === 'days') {
        const dayList = period.key.split(',').map((x) => x.trim()).filter(Boolean)
        if (dayList.length) saleRows = saleRows.filter((s) => dayList.includes(s.sale_date))
      }
      setSales(saleRows)`
if (s.includes(soOld)) { s = s.split(soOld).join(soNew); ok('filtro por dias no load') } else warn('setSales(res[0])')

fs.writeFileSync(p + '.bak54', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')