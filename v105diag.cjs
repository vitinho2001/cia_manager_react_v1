const fs = require('fs')
for (const f of ['src/types/stock.ts', 'src/types/recipes.ts', 'src/types/menu.ts', 'src/types/costs.ts']) {
  try {
    console.log('\n===== ' + f + ' =====')
    console.log(fs.readFileSync(f, 'utf8'))
  } catch { console.log('\n===== ' + f + ': NAO ENCONTRADO =====') }
}