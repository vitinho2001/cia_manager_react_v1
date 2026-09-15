const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original

// Corrige as dependencias do load para incluir from/to
const re = /\}, \[organizationId, (?:period|date)\]\)/
if (re.test(s)) {
  s = s.replace(re, '}, [organizationId, from, to])')
  fs.writeFileSync(p + '.bak64', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
  console.log('OK: load recarrega quando De/Ate mudam')
} else {
  console.log('ATENCAO: dependencias do load nao encontradas')
}