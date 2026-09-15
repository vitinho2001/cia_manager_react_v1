const fs = require('fs')

// Estoque: troca <div> puro por page-container (ganha o padding)
const ep = 'src/pages/EstoquePage.tsx'
let e = fs.readFileSync(ep, 'utf8')
if (/return\s*\(\s*<div>/.test(e)) {
  e = e.replace(/return\s*\(\s*<div>/, 'return (\n    <div className="page-container">')
  fs.writeFileSync(ep, e, 'utf8')
  console.log('OK: Estoque agora usa page-container')
} else {
  console.log('ATENCAO: padrao do return do Estoque nao encontrado')
}

// Cardapio: troca page-stack por page-container
const mp = 'src/pages/MenuPage.tsx'
let m = fs.readFileSync(mp, 'utf8')
if (m.includes('<div className="page-stack">')) {
  m = m.split('<div className="page-stack">').join('<div className="page-container">')
  fs.writeFileSync(mp, m, 'utf8')
  console.log('OK: Cardapio agora usa page-container')
} else {
  console.log('ATENCAO: page-stack nao encontrado no Cardapio')
}