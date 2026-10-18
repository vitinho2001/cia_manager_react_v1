const fs = require('fs')

console.log('PAGES: ' + fs.readdirSync('src/pages').join(', '))
console.log('SERVICES: ' + fs.readdirSync('src/services').join(', '))

function dump(file, keys) {
  console.log('\n===== ' + file + ' =====')
  let t
  try { t = fs.readFileSync(file, 'utf8') } catch { console.log('NAO ENCONTRADO'); return }
  const lines = t.split(/\r?\n/)
  lines.forEach((l, i) => { if (keys.some(k => l.includes(k))) console.log((i + 1) + ': ' + l.trim()) })
}

dump('src/pages/SalesPage.tsx', ['useState(', 'const from', 'const to', 'defaultFrom', 'defaultTo', '.reduce(', 'stat-card', 'totalCount', 'countSales', 'sumSales', 'sales.length', 'listSales(', 'period.type'])

const dashFile = fs.readdirSync('src/pages').find(f => f.toLowerCase().includes('dash'))
if (dashFile) dump('src/pages/' + dashFile, ['listSales', 'monthBounds', 'currentMonth', '.reduce(', 'setFrom(', 'setTo(', 'stat-card', 'Total', 'channel', 'sale_date', 'useState('])
else console.log('\nINFO: nenhum arquivo de dashboard encontrado em src/pages')

dump('src/services/sales.ts', ['export type Sale', 'export interface Sale', 'total_amount', 'unit_price', 'quantity', 'channel', 'select(', 'order(', 'export async function'])