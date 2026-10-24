const fs = require('fs')

function show(file, keys, radius) {
  let lines
  try { lines = fs.readFileSync(file, 'utf8').split(/\r?\n/) } catch { console.log('\n===== ' + file + ': NAO ENCONTRADO ====='); return }
  console.log('\n===== ' + file + ' =====')
  const hits = []
  lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) hits.push(i) })
  const shown = new Set()
  for (const h of hits) for (let i = Math.max(0, h - radius); i <= Math.min(lines.length - 1, h + radius); i++) shown.add(i)
  for (const i of [...shown].sort((a, b) => a - b)) console.log((i + 1) + ': ' + lines[i])
}

// 1) saveEdit e openEdit na SalesPage
show('src/pages/SalesPage.tsx', ['saveEdit', 'openEdit', 'editSaving', 'editingSale', 'updateSale'], 6)

// 2) updateSale no servico
show('src/services/sales.ts', ['updateSale', 'patch', 'menu_item_id', 'update.'], 4)