const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = function (name) { count++; console.log('OK: ' + name) }
const warn = function (name) { console.log('ATENCAO: ' + name) }

// 0. Verifica se a Etapa 2 (recipes no computeStock) esta aplicada
if (s.indexOf('computeStock(ingredients, purchases, menuComponents, recipeItems, sales, adjustments, recipes)') !== -1) {
  console.log('OK: Etapa 2 (recipes no computeStock) presente')
} else {
  console.log('ATENCAO: Etapa 2 nao detectada — rode v40/v41/v42 antes')
}

// 1. Helpers de mes apos a linha do num
var numAnchor = "const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })"
var helpers = [
  numAnchor,
  '',
  'const monthKey = (d: Date) => d.getFullYear() + \'-\' + String(d.getMonth() + 1).padStart(2, \'0\')',
  'const currentMonth = monthKey(new Date())',
  'function monthBounds(month: string) {',
  "  const parts = month.split('-').map(Number)",
  '  const year = parts[0]',
  '  const monthNumber = parts[1]',
  "  return { start: month + '-01', end: month + '-' + String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0') }",
  '}',
  'const monthOptions: string[] = []',
  'for (let i = 11; i >= 0; i--) {',
  '  const d = new Date()',
  '  d.setDate(1)',
  '  d.setMonth(d.getMonth() - i)',
  '  monthOptions.push(monthKey(d))',
  '}',
  "const monthLabel = (m: string) => new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })",
  ''
].join('\n')
if (s.indexOf(numAnchor) !== -1) { s = s.split(numAnchor).join(helpers); ok('helpers de mes') }
else { warn('helpers de mes (linha do num nao encontrada)') }

// 2. Estado month
var searchAnchor = "const [search, setSearch] = useState('')"
var searchNew = "const [search, setSearch] = useState('')\n  const [month, setMonth] = useState(currentMonth)"
if (s.indexOf(searchAnchor) !== -1) { s = s.split(searchAnchor).join(searchNew); ok('estado month') }
else { warn('estado month (search nao encontrado)') }

// 3. bounds no load
var orgAnchor = 'setOrganizationId(orgId)'
var orgNew = 'setOrganizationId(orgId)\n      const bounds = monthBounds(month)'
if (s.indexOf(orgAnchor) !== -1) { s = s.split(orgAnchor).join(orgNew); ok('bounds no load') }
else { warn('bounds no load (setOrganizationId nao encontrado)') }

// 4. Filtrar compras e vendas ate o fim do mes
var purOld = 'listPurchases(orgId)'
var purNew = 'listPurchases(orgId, undefined, bounds.end)'
if (s.indexOf(purOld) !== -1) { s = s.split(purOld).join(purNew); ok('compras ate fim do mes') }
else { warn('compras ate fim do mes (listPurchases nao encontrado)') }

var saleOld = 'listSales(orgId)'
var saleNew = 'listSales(orgId, undefined, bounds.end)'
if (s.indexOf(saleOld) !== -1) { s = s.split(saleOld).join(saleNew); ok('vendas ate fim do mes') }
else { warn('vendas ate fim do mes (listSales nao encontrado)') }

// 5. useEffect depende do mes
var effOld = 'useEffect(() => { void load() }, [])'
var effNew = 'useEffect(() => { void load() }, [month])'
if (s.indexOf(effOld) !== -1) { s = s.split(effOld).join(effNew); ok('useEffect depende do mes') }
else { warn('useEffect nao encontrado') }
// remove duplicata consecutiva
var dup = effNew + '\n' + effNew
s = s.split(dup).join(effNew)

// 6. Selector de mes no PageHeader
var headerOld = 'actions={<Button onClick={() => setModal(true)}><Plus size={16}/> Ajuste de estoque</Button>}'
var headerNew = 'actions={<><select className="select-control" value={month} onChange={(e) => setMonth(e.target.value)} title="Mes do estoque">{monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><Button onClick={() => setModal(true)}><Plus size={16}/> Ajuste de estoque</Button></>}'
if (s.indexOf(headerOld) !== -1) { s = s.split(headerOld).join(headerNew); ok('selector de mes no cabecalho') }
else { warn('selector de mes (PageHeader nao encontrado)') }

fs.writeFileSync(p + '.bak43', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas (backup em EstoquePage.tsx.bak43)')