const fs = require('fs')
const lines = fs.readFileSync('src/pages/SalesPage.tsx', 'utf8').split(/\r?\n/)
console.log('===== modal de edicao: linhas 800-870 =====')
for (let i = 799; i < Math.min(870, lines.length); i++) console.log((i + 1) + ': ' + lines[i])
console.log('\n===== todos os inputs/selects com editItemId ou editQuery =====')
lines.forEach((l, i) => {
  if (/editItemId|editQuery|editMenuQuery|filteredEdit/.test(l)) console.log((i + 1) + ': ' + l.trim())
})