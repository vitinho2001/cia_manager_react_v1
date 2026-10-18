const fs = require('fs')

function show(file, re) {
  let lines
  try { lines = fs.readFileSync(file, 'utf8').split(/\r?\n/) } catch { console.log('\n===== ' + file + ': NAO ENCONTRADO ====='); return }
  console.log('\n===== ' + file + ' =====')
  lines.forEach((l, i) => { if (re.test(l)) console.log((i + 1) + ': ' + l.trim()) })
}

// 1) Menu lateral: itens de navegacao
show('src/layouts/AppLayout.tsx', /to=|NavLink|Custos|custos/i)

// 2) Classes de cards usadas nas telas existentes (para o resumo ficar igual)
show('src/pages/SalesPage.tsx', /card/i)
show('src/pages/DashboardPage.tsx', /card/i)

// 3) CSS disponivel (os estilos ficam em src/styles)
console.log('\nSTYLES: ' + fs.readdirSync('src/styles').join(', '))
for (const f of fs.readdirSync('src/styles').filter((x) => x.endsWith('.css')).map((x) => 'src/styles/' + x)) {
  show(f, /^\s*\.(panel|stat|card|page-header|range-label|table|badge|icon-btn|search-box|empty-state|text-button|table-toolbar)/)
}