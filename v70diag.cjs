const fs = require('fs')
const out = []
const log = (s) => { console.log(s); out.push(s) }
log('=== DIAG INICIO ===')

function dump(file, keys) {
  log('\n===== ' + file + ' =====')
  let t
  try { t = fs.readFileSync(file, 'utf8') } catch { log('NAO ENCONTRADO'); return }
  const lines = t.split(/\r?\n/)
  lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) log((i + 1) + ': ' + l.trim()) })
}

dump('src/services/sales.ts', ['export async function listSales', 'countSales', 'q.range(', "lte('sale_date'", "gte('sale_date'"])

dump('src/pages/SalesPage.tsx', ['useCallback', 'countSales', 'listSales(', 'setPage', 'pageSize', 'totalCount', 'totalPages', 'longRange', 'sales-pagination', 'removeSale', 'Excluir', 'setFrom(', 'setTo('])

dump('src/pages/MenuPage.tsx', ['async function load', 'Promise.all', 'listPurchases(', 'listSales(', 'const [menuData', 'setItems(', 'setSales(', 'averageByIngredient', 'fifoStockCost', 'averagePurchaseCost', 'stockLines', 'stockUsedById'])

log('\n===== conteudo dos scripts v67/v68 (3 primeiras linhas) =====')
for (const f of ['v67.cjs', 'v68.cjs']) {
  try {
    const first = fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(0, 3).join(' | ')
    log(f + ': ' + first)
  } catch { log(f + ': NAO EXISTE') }
}

fs.writeFileSync('diag.txt', out.join('\n'), 'utf8')
log('\n=== DIAG FIM (tambem salvo em diag.txt) ===')