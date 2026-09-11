const fs = require('fs')
function show(file, needle, before, after, max = 3) {
  let raw
  try { raw = fs.readFileSync(file, 'utf8') } catch (e) { console.log('ERRO: ' + file); return }
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  console.log('\n===== ' + file + ' (' + lines.length + ' linhas) =====')
  let hits = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) {
      hits++
      const from = Math.max(0, i - before), to = Math.min(lines.length - 1, i + after)
      console.log('--- [' + needle + '] linha ' + (i + 1) + ' ---')
      for (let k = from; k <= to; k++) console.log((k + 1) + '| ' + lines[k])
      console.log('')
      if (hits >= max) { console.log('   (mais omitidas)\n'); break }
    }
  }
  if (hits === 0) console.log('>>> NAO ENCONTRADO: ' + needle + '\n')
}

console.log('### SALESPAGE ###')
show('src/pages/SalesPage.tsx', "from 'lucide-react'", 0, 0)
show('src/pages/SalesPage.tsx', 'removeSale(s.id)', 0, 2)
show('src/pages/SalesPage.tsx', 'openEdit(', 0, 14)
show('src/pages/SalesPage.tsx', 'saveEdit', 0, 18)
show('src/pages/SalesPage.tsx', 'CHANNELS.map', 4, 4)
show('src/pages/SalesPage.tsx', 'filteredSales', 0, 1)
show('src/pages/SalesPage.tsx', 'actions={', 0, 4)
show('src/pages/SalesPage.tsx', 'sales.map((s)', 0, 26)
show('src/pages/SalesPage.tsx', 'updateSale(editingSale', 0, 2)

console.log('\n### SERVICES/SALES.TS ###')
show('src/services/sales.ts', 'updateSale', 0, 20)

console.log('\n### PACKAGE.JSON (deps) ###')
try {
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  console.log('dependencies:', JSON.stringify(p.dependencies, null, 2))
} catch (e) { console.log('ERRO lendo package.json') }