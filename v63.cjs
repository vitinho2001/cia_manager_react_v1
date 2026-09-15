const fs = require('fs')
const p = 'src/pages/MenuPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1. Botao "Categorias" visivel (troca ghost por secondary + icone)
const btnOld = '<Button variant="ghost" onClick={() => setCatModal(true)}>Categorias</Button>'
const btnNew = '<Button variant="secondary" onClick={() => setCatModal(true)} icon={<Boxes size={16}/>}>Categorias</Button>'
if (s.includes(btnOld)) { s = s.split(btnOld).join(btnNew); ok('botao Categorias visivel') }
else warn('botao Categorias visivel')

fs.writeFileSync(p + '.bak63', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')