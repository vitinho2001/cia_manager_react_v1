const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }

if (s.includes('totalPages')) {
  s = s.split('totalPages').join('Math.max(1, Math.ceil(totalCount / pageSize))')
  ok('totalPages calculado inline')
} else {
  console.log('INFO: totalPages nao presente')
}

if (s.includes('longRange')) {
  s = s.split('longRange').join('Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) > 31')
  ok('longRange calculado inline')
} else {
  console.log('INFO: longRange nao presente')
}

const txtOld = 'paginas de ${pageSize} linhas'
const txtNew = 'paginas de {pageSize} linhas'
if (s.includes(txtOld)) { s = s.split(txtOld).join(txtNew); ok('texto do aviso usa {pageSize}') }
else console.log('INFO: texto do aviso ja ok')

if (count > 0) {
  fs.writeFileSync(p + '.bak72', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}
console.log('Concluido: ' + count + ' correcoes aplicadas')