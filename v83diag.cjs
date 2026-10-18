const fs = require('fs')
const t = fs.readFileSync('src/pages/SalesPage.tsx', 'utf8')
const lines = t.split(/\r?\n/)

function range(a, b, title) {
  console.log('\n===== ' + title + ' (linhas ' + a + '-' + b + ') =====')
  for (let i = a - 1; i < Math.min(b, lines.length); i++) console.log((i + 1) + ': ' + lines[i])
}

range(100, 130, 'parse do CSV')
range(280, 300, 'associacao inicial dos produtos')
range(380, 470, 'importacao (handleImport)')
range(505, 560, 'openEdit e saveEdit')
range(630, 660, 'tabela de vendas')
range(800, 855, 'modal de edicao')