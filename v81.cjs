const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }

// Move listMenuItems para antes do listSales completo, restaurando a ordem correta
const re = /listSales\(organizationId, from, to\),\s*\n\s*listMenuItems\(organizationId\),/
if (re.test(s)) {
  s = s.replace(re, 'listMenuItems(organizationId),\n        listSales(organizationId, from, to),')
  ok('ordem do Promise.all corrigida')
} else {
  console.log('INFO: padrao nao encontrado, linhas atuais do load:')
  s.split(/\r?\n/).forEach((l, i) => {
    if (l.includes('Promise.all') || l.includes('listSales(organizationId') || l.includes('listMenuItems(organizationId') || l.includes('const [total')) console.log((i + 1) + ': ' + l.trim())
  })
}

if (count > 0) {
  fs.writeFileSync(p + '.bak81', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}
console.log('Concluido: ' + count + ' correcoes aplicadas')