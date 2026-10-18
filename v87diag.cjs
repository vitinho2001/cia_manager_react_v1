const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const t = fs.readFileSync(p, 'utf8')
const lines = t.split(/\r?\n/)

// Localiza o modal: ultima ocorrencia do h3 (o botao da tabela vem antes)
let idx = -1
for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].includes('<h3>Editar associacao</h3>')) { idx = i; break } }
if (idx === -1) for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].includes('Nome original (CSV)')) { idx = i; break } }
if (idx === -1) for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].includes('Modal de edicao')) { idx = i; break } }
console.log('ancora encontrada na linha: ' + (idx + 1))

// Imprime da abertura do modal (overlay) ate o fechamento
const start = Math.max(0, idx - 14)
const end = Math.min(lines.length, start + 120)
console.log('===== modal de edicao (linhas ' + (start + 1) + '-' + end + ') =====')
const block = []
for (let i = start; i < end; i++) { console.log((i + 1) + ': ' + lines[i]); block.push(lines[i]) }

// Classes usadas no bloco + regras CSS correspondentes
const classes = new Set()
for (const l of block) for (const m of l.matchAll(/className="([^"]+)"/g)) m[1].split(/\s+/).forEach((x) => { if (x) classes.add(x) })
console.log('\nclasses: ' + [...classes].join(' | '))

const cssFiles = fs.readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => 'src/' + f)
for (const file of cssFiles) {
  const cl = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  console.log('\n===== ' + file + ' =====')
  cl.forEach((l, i) => {
    const hit = [...classes].some((x) => l.includes('.' + x)) || /modal|overlay/i.test(l)
    if (hit) console.log((i + 1) + ': ' + l.trim())
  })
}