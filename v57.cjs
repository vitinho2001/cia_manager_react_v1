const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) VENDAS =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  // 1a. Estado from/to (intervalo)
  const stOld = 'const [period, setPeriod] = useState<Period>(currentPeriod)'
  const stNew = 'const [period, setPeriod] = useState<Period>(currentPeriod)\n  const [from, setFrom] = useState(today())\n  const [to, setTo] = useState(today())'
  if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado from/to') } else warn('estado from/to')

  // 1b. Troca o seletor de periodo por De/Ate no cabecalho
  const reSel = /actions=\{<><select className="select-control" value=\{period\.type\}[\s\S]*?<\/select><select className="select-control" value=\{period\.key\}[\s\S]*?<\/select>/
  const repSel = 'actions={<><label className="range-label">De<input type="date" className="select-control" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="range-label">Ate<input type="date" className="select-control" value={to} onChange={(e) => setTo(e.target.value)} /></label>'
  if (reSel.test(s)) { s = s.replace(reSel, repSel); ok('seletor de periodo -> De/Ate') } else warn('seletor de periodo -> De/Ate')

  // 1c. Load usa from/to
  if (s.includes('listSales(organizationId, bounds.start, bounds.end)')) { s = s.split('listSales(organizationId, bounds.start, bounds.end)').join('listSales(organizationId, from, to)'); ok('load usa from/to') }
  else if (s.includes('listSales(organizationId, date, date)')) { s = s.split('listSales(organizationId, date, date)').join('listSales(organizationId, from, to)'); ok('load usa from/to (fallback)') }
  else warn('load usa from/to')

  // 1d. Remove o campo Dia da toolbar (o label inteiro)
  const reDia = /<label>\s*Dia\s*<input type="date" value=\{date\} onChange=\{\(e\) => setDate\(e\.target\.value\)\} \/>\s*<\/label>/
  if (reDia.test(s)) { s = s.replace(reDia, ''); ok('campo Dia removido da toolbar') } else warn('campo Dia removido da toolbar')

  // 1e. Adiciona campo Dia no formulario de lancar venda
  const formOld = '<form onSubmit={(e) => void submitManual(e)} style={{ display: \'flex\', gap: 12, alignItems: \'flex-end\', flexWrap: \'wrap\' }}>'
  const formNew = '<form onSubmit={(e) => void submitManual(e)} style={{ display: \'flex\', gap: 12, alignItems: \'flex-end\', flexWrap: \'wrap\' }}>\n          <label>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>'
  if (s.includes(formOld)) { s = s.split(formOld).join(formNew); ok('campo Dia no lancar venda') } else warn('campo Dia no lancar venda')

  // 1f. Adiciona campo Dia na importacao
  const impOld = '<label style={{ display: \'block\', marginBottom: 8 }}>\n          Canal da importacao'
  const impNew = '<label style={{ display: \'block\', marginBottom: 8 }}>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>\n        <label style={{ display: \'block\', marginBottom: 8 }}>\n          Canal da importacao'
  if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('campo Dia na importacao') } else warn('campo Dia na importacao')

  // 1g. Resumo com design melhor
  const reRes = /<h2>Resumo do dia<\/h2>[\s\S]*?<\/section>/
  const repRes = '<h2>Resumo do periodo</h2>\n        <div className="sales-summary-grid">\n          <div className="sales-summary-item"><strong>{brl(totals.total)}</strong><span>Total</span></div>\n          <div className="sales-summary-item"><strong>{totals.quantity}</strong><span>Itens vendidos</span></div>\n          <div className="sales-summary-item"><strong>{totals.priced}</strong><span>Vendas</span></div>\n          {CHANNELS.map((c) => (<div className="sales-summary-item" key={c.value}><strong>{brl(totals.byChannel[c.value])}</strong><span>{c.label}</span></div>))}\n        </div>\n      </section>'
  if (reRes.test(s)) { s = s.replace(reRes, repRes); ok('resumo com design melhor') } else warn('resumo com design melhor')

  fs.writeFileSync(p + '.bak57', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== 2) CSS: resumo + toolbar do cardapio em uma linha =====
{
  const cp = 'src/styles/global.css'
  let css = fs.readFileSync(cp, 'utf8')
  const extra = `
/* v57: resumo de vendas + toolbar do cardapio em uma linha */
.sales-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
.sales-summary-item{background:#f5f7f5;border:1px solid #e5e9e6;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:2px}
.sales-summary-item strong{font-size:18px;color:#173127}
.sales-summary-item span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.menu-toolbar-card .toolbar-row{flex-wrap:nowrap;align-items:center;gap:12px}
.menu-toolbar-card .toolbar-row .search-field{flex:1;min-width:180px}
.menu-toolbar-card .toolbar-row select,.menu-toolbar-card .toolbar-row .month-field{white-space:nowrap}
.menu-toolbar-card .month-field{display:flex;align-items:center;gap:6px;margin:0}
@media(max-width:900px){.menu-toolbar-card .toolbar-row{flex-wrap:wrap}}
`
  if (!css.includes('v57:')) { fs.writeFileSync(cp, css + extra, 'utf8'); ok('CSS resumo + toolbar cardapio') }
  else warn('CSS v57 ja aplicado')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')