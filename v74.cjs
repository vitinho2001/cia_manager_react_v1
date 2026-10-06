const fs = require('fs')
const p = 'src/pages/MenuPage.tsx'
const original = fs.readFileSync(p, 'utf8')
const lines = original.split(/\r?\n/)

const targets = [
  { label: 'import { listSales }', re: /^import \{ listSales \} from '\.\.\/services\/sales'\s*$/ },
  { label: 'import { computeStock }', re: /^import \{ computeStock \} from '\.\.\/services\/stock'\s*$/ },
  { label: 'import type { Sale }', re: /^import type \{ Sale \} from '\.\.\/types\/sales'\s*$/ },
  { label: 'estado [sales, setSales]', re: /^const \[sales, setSales\] = useState<Sale\[\]>\(\[\]\)\s*$/ },
]

const seen = new Set()
const removedByLabel = {}
const out = []
let removed = 0

for (const line of lines) {
  const t = line.trim()
  let duplicate = false
  for (const target of targets) {
    if (target.re.test(t)) {
      if (seen.has(target.label)) {
        duplicate = true
        removed++
        removedByLabel[target.label] = (removedByLabel[target.label] ?? 0) + 1
      } else {
        seen.add(target.label)
      }
      break
    }
  }
  if (!duplicate) out.push(line)
}

if (removed > 0) {
  fs.writeFileSync(p + '.bak74', original, 'utf8')
  fs.writeFileSync(p, out.join('\n'), 'utf8')
  console.log('OK: ' + removed + ' linha(s) duplicada(s) removidas:')
  for (const [label, n] of Object.entries(removedByLabel)) console.log('  - ' + label + ' x' + n)
  const recheck = out.join('\n')
  const ainda = targets.filter((t) => (recheck.match(t.re) || []).length > 1)
  if (ainda.length) console.log('ATENCAO: ainda ha duplicatas de ' + ainda.map((t) => t.label).join(', '))
  else console.log('OK: nenhuma duplicata restante')
} else {
  console.log('INFO: nenhuma duplicata encontrada (arquivo ja ok)')
}