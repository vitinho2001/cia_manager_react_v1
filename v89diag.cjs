const fs = require('fs')

console.log('RAIZ SRC: ' + fs.readdirSync('src').join(', '))

function linesOf(f) { try { return fs.readFileSync(f, 'utf8').split(/\r?\n/) } catch { return null } }

function show(file, keys, radius) {
  const lines = linesOf(file)
  if (!lines) { console.log('\n===== ' + file + ': NAO ENCONTRADO ====='); return }
  console.log('\n===== ' + file + ' =====')
  const hits = []
  lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) hits.push(i) })
  if (hits.length === 0) { console.log('(nenhuma linha chave)'); return }
  const shown = new Set()
  for (const h of hits) for (let i = Math.max(0, h - radius); i <= Math.min(lines.length - 1, h + radius); i++) shown.add(i)
  for (const i of [...shown].sort((a, b) => a - b)) console.log((i + 1) + ': ' + lines[i])
}

// 1) Rotas: onde as paginas sao mapeadas
show('src/App.tsx', ['Route', 'path', 'Page', 'element'], 1)

// 2) Menu/navegacao: arquivos com nome de nav/layout/sidebar
const navFiles = fs.readdirSync('src').filter((f) => /nav|layout|sidebar/i.test(f)).map((f) => 'src/' + f)
console.log('\nCANDIDATOS A NAV: ' + (navFiles.join(', ') || '(nenhum)'))
for (const f of navFiles) show(f, ['Vendas', 'Dashboard', 'Estoque', 'Cardapio', 'Receitas', 'href', 'to='], 2)

// 3) Se o App.tsx tiver o menu inline, contexto mais largo
const app = linesOf('src/App.tsx') || []
const mi = app.findIndex((l) => /Vendas|Estoque|Receitas/.test(l))
if (mi >= 0) {
  console.log('\n===== App.tsx contexto do menu (linhas ' + Math.max(1, mi - 3) + '-' + Math.min(app.length, mi + 20) + ') =====')
  for (let k = Math.max(0, mi - 3); k <= Math.min(app.length - 1, mi + 20); k++) console.log((k + 1) + ': ' + app[k])
}
if (app.join('\n').includes('Custo')) console.log('\nINFO: App.tsx ja menciona Custo')

// 4) PlaceholderPage: padrao minimo de pagina
show('src/pages/PlaceholderPage.tsx', ['PageHeader', 'title', 'return', 'export'], 3)

// 5) Organizacao atual
show('src/services/organization.ts', ['export', 'function', 'return'], 1)

// 6) Tipos disponiveis
console.log('\nTIPOS: ' + fs.readdirSync('src/types').join(', '))

// 7) CSS: regras das classes compartilhadas (nomes de seletor)
for (const f of fs.readdirSync('src').filter((x) => x.endsWith('.css')).map((x) => 'src/' + x)) {
  const cl = linesOf(f)
  console.log('\n===== ' + f + ' =====')
  cl.forEach((l, i) => { if (/^\s*\.(page-header|stat-card|stat|panel|range-label|select-control|badge|icon-btn|empty-state|modal|table)/.test(l)) console.log((i + 1) + ': ' + l.trim()) })
}