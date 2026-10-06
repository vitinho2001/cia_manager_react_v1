const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }

// 1. Remove o fragmento orfao deixado pelo v71 (Trash2 solto + </button> extra)
const reOrphan = /Excluir<\/button>\s*\n\s*<Trash2 size=\{16\} \/>\s*\n\s*<\/button>/g
if (reOrphan.test(s)) {
  s = s.replace(reOrphan, 'Excluir</button>')
  ok('fragmento orfao removido')
} else {
  console.log('INFO: nenhum fragmento orfao encontrado')
}

// 2. Reforca o estilo do botao Excluir (fundo vermelho inline, sem depender de classe)
const stlOld = "className=\"btn btn-danger\" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}"
const stlNew = "style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: '#d92d20', color: '#fff', border: 'none', cursor: 'pointer' }}"
if (s.includes(stlOld)) {
  s = s.split(stlOld).join(stlNew)
  ok('estilo do botao Excluir reforcado')
} else {
  console.log('INFO: estilo do botao ja ajustado')
}

if (count > 0) {
  fs.writeFileSync(p + '.bak73', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}
console.log('Concluido: ' + count + ' correcoes aplicadas')