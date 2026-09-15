const fs = require('fs')
function show(file, keys) {
  console.log('\n===== ' + file + ' =====')
  let t
  try { t = fs.readFileSync(file, 'utf8') } catch { console.log('NAO ENCONTRADO'); return }
  const lines = t.split(/\r?\n/)
  lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) console.log((i + 1) + ': ' + l.trim()) })
}
show('src/pages/MenuPage.tsx', ['toolbar-row', 'categoryFilter', 'categories =', 'Carregar card', 'menu-category', 'catModal', 'Categorias', 'input list='])
show('src/styles/global.css', ['.wrap', '.toolbar-row', '.menu-toolbar-card', '.search-field'])
console.log('\n===== src/services/menu.ts (funcoes) =====')
try {
  const mt = fs.readFileSync('src/services/menu.ts', 'utf8').split(/\r?\n/)
  mt.forEach((l, i) => { if (l.includes('export async function') || l.includes('export function')) console.log((i + 1) + ': ' + l.trim()) })
  const i = mt.findIndex((l) => l.includes('updateMenuItem'))
  if (i >= 0) { console.log('\n--- updateMenuItem (20 linhas) ---'); console.log(mt.slice(i, i + 20).join('\n')) }
  const j = mt.findIndex((l) => l.includes('deleteMenuItem'))
  if (j >= 0) { console.log('\n--- deleteMenuItem (10 linhas) ---'); console.log(mt.slice(j, j + 10).join('\n')) }
} catch { console.log('menu.ts NAO ENCONTRADO') }