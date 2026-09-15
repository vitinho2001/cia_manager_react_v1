const fs = require('fs')

// 1) EstoquePage: rotulo do mes (corrige fuso horario)
const ep = 'src/pages/EstoquePage.tsx'
let e = fs.readFileSync(ep, 'utf8')
const a = "new Date(p.key + '-01')"
const b = "new Date(Number(p.key.slice(0, 4)), Number(p.key.slice(5, 7)) - 1, 1)"
if (e.includes(a)) { e = e.split(a).join(b); fs.writeFileSync(ep, e, 'utf8'); console.log('OK: EstoquePage - rotulo do mes corrigido') }
else console.log('ATENCAO: EstoquePage - trecho do rotulo nao encontrado')

// 2) DashboardPage: rotulo do mes (mesmo fix), caso ainda exista
const dp = 'src/pages/DashboardPage.tsx'
let d = fs.readFileSync(dp, 'utf8')
const c = "new Date(m + '-01')"
const f = "new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)"
if (d.includes(c)) { d = d.split(c).join(f); fs.writeFileSync(dp, d, 'utf8'); console.log('OK: DashboardPage - rotulo do mes corrigido') }
else console.log('INFO: DashboardPage - rotulo ja ok ou sera substituido pelo v48')