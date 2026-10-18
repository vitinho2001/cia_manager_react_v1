const fs = require('fs')
const p = 'src/pages/CostsPage.tsx'
if (!fs.existsSync(p)) { console.log('ATENCAO: src/pages/CostsPage.tsx nao existe. Rode primeiro: node v91.cjs'); process.exit(1) }
const original = fs.readFileSync(p, 'utf8')
if (original.includes('computeStock')) { console.log('INFO: CMV ja presente nesta pagina. Nada a fazer.'); process.exit(0) }
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)
const ml = (lines) => lines.join(eol)

// 1) icone TrendingUp
const lucOld = "import { CircleDollarSign, Pencil, Percent, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react'"
const lucNew = "import { CircleDollarSign, Pencil, Percent, Plus, ReceiptText, Trash2, TrendingUp, Wallet } from 'lucide-react'"
if (s.includes(lucOld)) { s = s.split(lucOld).join(lucNew); ok('icone TrendingUp') } else warn('icone TrendingUp')

// 2) imports dos servicos de estoque/receitas
const impOld = "import { listSales } from '../services/sales'"
const impNew = ml([impOld,
"import { listIngredients, listPurchases } from '../services/ingredients'",
"import { listMenuComponents } from '../services/menu'",
"import { listRecipes, listRecipeItems } from '../services/recipes'",
"import { computeStock, listStockAdjustments } from '../services/stock'",
"import type { StockLine } from '../types/stock'"])
if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('imports de estoque/receitas') } else warn('imports de servicos')

// 3) estado lines
const stOld = 'const [costs, setCosts] = useState<OperatingCost[]>([])'
const stNew = ml([stOld, '  const [lines, setLines] = useState<StockLine[]>([])'])
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado lines') } else warn('estado lines')

// 4) load busca os dados do estoque
const ldOld = '      const [salesRows, costRows] = await Promise.all([listSales(organizationId, from, to), listOperatingCosts(organizationId)])'
const ldNew = ml([
'      const [salesRows, costRows, ingRows, purRows, compRows, recRows, recItemRows, adjRows] = await Promise.all([',
'        listSales(organizationId, from, to),',
'        listOperatingCosts(organizationId),',
'        listIngredients(organizationId).catch(() => []),',
'        listPurchases(organizationId, undefined, to).catch(() => []),',
'        listMenuComponents(organizationId).catch(() => []),',
'        listRecipes(organizationId).catch(() => []),',
'        listRecipeItems(organizationId).catch(() => []),',
'        listStockAdjustments(organizationId).catch(() => []),',
'      ])',
])
if (s.includes(ldOld)) { s = s.split(ldOld).join(ldNew); ok('load busca estoque/receitas/compras') } else warn('Promise.all do load')

const scOld = '      setCosts(costRows)'
const scNew = ml([scOld, '      setLines(computeStock(ingRows, purRows, compRows, recItemRows, salesRows, adjRows, recRows))'])
const scCount = s.split(scOld).length - 1
if (scCount === 1) { s = s.split(scOld).join(scNew); ok('computeStock no load') } else warn('setCosts(costRows) apareceu ' + scCount + 'x')

// 5) cmv calculado e lucro inclui CMV
const prOld = '  const profit = revenue - fixedTotal - variableTotal'
const prNew = ml([
'  const cmvCost = useMemo(() => lines.reduce((sum, l) => sum + l.consumed * l.avgCost, 0), [lines])',
'  const cmvPct = revenue > 0 ? (cmvCost / revenue) * 100 : 0',
'  const profit = revenue - fixedTotal - variableTotal - cmvCost',
])
if (s.includes(prOld)) { s = s.split(prOld).join(prNew); ok('cmv calculado e lucro inclui CMV') } else warn('linha do lucro')

// 6) formatador de percentual
const pfOld = "function fmtInt(n: number) { return (Number(n) || 0).toLocaleString('pt-BR') }"
const pfNew = ml([pfOld, "function pctFmt(v: number) { return (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' }"])
if (s.includes(pfOld)) { s = s.split(pfOld).join(pfNew); ok('funcao pctFmt') } else warn('fmtInt')

// 7) card CMV no resumo
const cardOld = '        <StatCard label="Lucro estimado" value={brl(profit)} detail="Receita - fixos - variáveis" icon={<Wallet size={19} />} />'
const cardNew = ml([
"        <StatCard label=\"CMV (insumos)\" value={brl(cmvCost)} detail={pctFmt(cmvPct) + ' da receita'} icon={<TrendingUp size={19} />} />",
'        <StatCard label="Lucro estimado" value={brl(profit)} detail="Receita - fixos - variáveis - CMV" icon={<Wallet size={19} />} />',
])
if (s.includes(cardOld)) { s = s.split(cardOld).join(cardNew); ok('card CMV no resumo') } else warn('card Lucro estimado')

fs.writeFileSync(p + '.bak92', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')