const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1. Substitui o bloco actions inteiro do cabecalho (seletor antigo) por De/Ate
const reActions = /actions=\{<><select className="select-control" value=\{period\.type\}[\s\S]*?<\/>\}/
const newActions = 'actions={<><label className="range-label">De<input type="date" className="select-control" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="range-label">Ate<input type="date" className="select-control" value={to} onChange={(e) => setTo(e.target.value)} /></label><Button icon={<RefreshCw size={16} />} onClick={() => void load()} disabled={loading}>Atualizar</Button></>}'
if (reActions.test(s)) { s = s.replace(reActions, newActions); ok('cabecalho -> De/Ate') }
else warn('cabecalho -> De/Ate')

// 2. Remove o campo Dia da toolbar (com title)
const reDia = /<label>\s*Dia\s*<input type="date" value=\{date\} onChange=\{\(e\) => setDate\(e\.target\.value\)\} title="Dia para lancar\/importar" \/>\s*<\/label>/
if (reDia.test(s)) { s = s.replace(reDia, ''); ok('campo Dia removido da toolbar') }
else warn('campo Dia removido da toolbar')

// 3. Adiciona campo Dia na importacao (antes de Canal da importacao)
const impAnchor = '<label style={{ display: \'block\', marginBottom: 8 }}>\n          Canal da importacao'
const impNew = '<label style={{ display: \'block\', marginBottom: 8 }}>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>\n        <label style={{ display: \'block\', marginBottom: 8 }}>\n          Canal da importacao'
if (s.includes(impAnchor)) { s = s.split(impAnchor).join(impNew); ok('campo Dia na importacao') }
else warn('campo Dia na importacao')

fs.writeFileSync(p + '.bak58', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')