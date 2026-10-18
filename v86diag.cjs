const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const t = fs.readFileSync(p, 'utf8')
const lines = t.split(/\r?\n/)

// 1) Bloco literal do modal de edicao
const h3Idx = lines.findIndex((l) => l.includes('Editar associacao'))
if (h3Idx === -1) console.log('ATENCAO: h3 Editar associacao nao encontrado')
const start = Math.max(0, (h3Idx === -1 ? 810 : h3Idx) - 18)
const end = Math.min(lines.length, start + 78)
console.log('===== modal de edicao (linhas ' + (start + 1) + '-' + end + ') =====')
const block = []
for (let i = start; i < end; i++) { console.log((i + 1) + ': ' + lines[i]); block.push(lines[i]) }

// 2) Classes usadas no bloco
const classes = new Set()
for (const l of block) { for (const m of l.matchAll(/className="([^"]+)"/g)) m[1].split(/\s+/).forEach((x) => { if (x) classes.add(x) }) }
console.log('\nclasses: ' + [...classes].join(' | '))

// 3) Regras CSS dessas classes + modal/overlay em todos os .css de src
const cssFiles = fs.readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => 'src/' + f)
for (const file of cssFiles) {
  const cl = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  console.log('\n===== ' + file + ' =====')
  cl.forEach((l, i) => {
    const hit = [...classes].some((x) => l.includes('.' + x)) || /modal|overlay|backdrop/i.test(l)
    if (hit) console.log((i + 1) + ': ' + l.trim())
  })
}