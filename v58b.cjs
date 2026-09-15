const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original

// Ancoro no texto unico do paragrafo da importacao e insiro o label Dia logo depois
const anchor = 'Selecione o dia e o canal antes de importar.</p>'
const insert = 'Selecione o dia e o canal antes de importar.</p>\n        <label style={{ display: \'block\', marginBottom: 8 }}>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>'

if (s.includes(anchor)) {
  s = s.split(anchor).join(insert)
  fs.writeFileSync(p + '.bak58b', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
  console.log('OK: campo Dia adicionado na importacao')
} else {
  console.log('ATENCAO: paragrafo da importacao nao encontrado')
}