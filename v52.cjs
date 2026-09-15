const fs = require('fs')
const p = 'src/styles/global.css'
const css = fs.readFileSync(p, 'utf8')
const extra = `
/* v52: bordas arredondadas em todos os campos de pesquisa/selecao */
input[type="text"],input[type="search"],input[type="date"],input[type="month"],input[type="number"],input[type="time"],select,.search-field{border-radius:12px}
`
if (css.includes('v52:')) {
  console.log('JA APLICADO: v52')
} else {
  fs.writeFileSync(p, css + extra, 'utf8')
  console.log('OK: bordas arredondadas aplicadas no global.css')
}