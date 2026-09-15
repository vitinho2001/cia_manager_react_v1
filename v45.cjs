const fs = require('fs')
const p = 'src/pages/DashboardPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (name) => { count++; console.log('OK: ' + name) }
const warn = (name) => console.log('ATENCAO: ' + name)

// 1. Helpers de mes dinamico antes do componente
const anchor = 'export function DashboardPage()'
const helpers = `const pad2 = (n: number) => String(n).padStart(2, '0')
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
export function DashboardPage()`
if (s.includes(anchor)) { s = s.split(anchor).join(helpers); ok('helpers de mes dinamico') }
else warn('helpers de mes (DashboardPage nao encontrado)')

// 2. Estado month dentro do componente
const stOld = 'export function DashboardPage(){const{configured}=useAuth();return <div className="page-container">'
const stNew = 'export function DashboardPage(){const{configured}=useAuth();const [month,setMonth]=useState(currentMonth);return <div className="page-container">'
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado month') }
else warn('estado month (assinatura nao encontrada)')

// 3. Import de useState
const impOld = "import { useAuth } from '../contexts/AuthContext'"
const impNew = "import { useState } from 'react'\nimport { useAuth } from '../contexts/AuthContext'"
if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('import useState') }
else warn('import useState (useAuth nao encontrado)')

// 4. Select dinamico no PageHeader
const selOld = 'actions={<select className="select-control" defaultValue="2026-08"><option value="2026-08">Agosto de 2026</option></select>}'
const selNew = 'actions={<select className="select-control" value={month} onChange={(e) => setMonth(e.target.value)} title="Mes do dashboard">{monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>}'
if (s.includes(selOld)) { s = s.split(selOld).join(selNew); ok('select de mes dinamico') }
else warn('select de mes (Agosto de 2026 nao encontrado)')

fs.writeFileSync(p + '.bak45', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas (backup em DashboardPage.tsx.bak45)')