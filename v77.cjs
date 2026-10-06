const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

const p = 'src/pages/RecipesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original

const impBase = "import { listIngredients, listPurchases } from '../services/ingredients'"
if (s.includes(impBase) && !s.includes('listSales')) {
  s = s.split(impBase).join(impBase + "\nimport { listSales } from '../services/sales'\nimport { computeStock } from '../services/stock'\nimport { listMenuComponents } from '../services/menu'\nimport type { Sale } from '../types/sales'\nimport type { MenuItemComponent } from '../types/menu'")
  ok('imports de vendas, estoque, componentes e tipos')
} else warn('imports')

const stOld = 'const [purchases, setPurchases] = useState<IngredientPurchase[]>([])'
if (s.includes(stOld) && !s.includes('useState<Sale')) {
  s = s.split(stOld).join(stOld + '\n  const [sales, setSales] = useState<Sale[]>([])\n  const [menuComponents, setMenuComponents] = useState<MenuItemComponent[]>([])')
  ok('estados de vendas e componentes')
} else warn('estados de vendas e componentes')

const deOld = 'const [recipeRows, itemRows, ingredientRows, purchaseRows] = await Promise.all(['
if (s.includes(deOld)) { s = s.split(deOld).join('const [recipeRows, itemRows, ingredientRows, purchaseRows, componentRows, saleRows] = await Promise.all(['); ok('desestrutura componentRows e saleRows') } else warn('Promise.all')

const loOld = 'listRecipes(orgId), listRecipeItems(orgId), listIngredients(orgId), listPurchases(orgId, bounds.start, bounds.end),'
if (s.includes(loOld)) { s = s.split(loOld).join('listRecipes(orgId), listRecipeItems(orgId), listIngredients(orgId), listPurchases(orgId, undefined, bounds.end), listMenuComponents(orgId), listSales(orgId, undefined, bounds.end),'); ok('load usa historico completo + vendas + componentes') } else warn('load usa historico completo')

const seOld = 'setRecipes(recipeRows); setRecipeItems(itemRows); setIngredients(ingredientRows); setPurchases(purchaseRows)'
if (s.includes(seOld)) { s = s.split(seOld).join('setRecipes(recipeRows); setRecipeItems(itemRows); setIngredients(ingredientRows); setPurchases(purchaseRows); setMenuComponents(componentRows); setSales(saleRows)'); ok('setStates de vendas e componentes') } else warn('setStates')

if (!s.includes('function fifoStockCost')) {
  const anchor = 'function averagePurchaseCost(ingredient: Ingredient, purchases: IngredientPurchase[]) {'
  const fifo = `function fifoStockCost(ingredient: Ingredient, purchases: IngredientPurchase[], consumedQty: number, adjustmentsQty: number): number | null {
  const lots = purchases
    .map((p) => {
      const converted = convertQuantity(p.quantity, p.purchase_unit, ingredient.purchase_unit)
      if (converted == null || converted <= 0) return null
      return { qty: converted, unitCost: p.total_amount / converted, date: p.purchase_date }
    })
    .filter((x): x is { qty: number; unitCost: number; date: string } => x != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (lots.length === 0) return null
  const totalQty = lots.reduce((sum, lot) => sum + lot.qty, 0)
  const remainingQty = totalQty - consumedQty + adjustmentsQty
  if (remainingQty <= 0) return lots[lots.length - 1].unitCost
  let toKeep = remainingQty
  const kept: { qty: number; unitCost: number }[] = []
  for (let i = lots.length - 1; i >= 0 && toKeep > 0; i--) {
    const take = Math.min(lots[i].qty, toKeep)
    kept.push({ qty: take, unitCost: lots[i].unitCost })
    toKeep -= take
  }
  let amount = 0
  let qty = 0
  for (const lot of kept) { amount += lot.qty * lot.unitCost; qty += lot.qty }
  return qty > 0 ? amount / qty : null
}
`
  if (s.includes(anchor)) { s = s.split(anchor).join(fifo + anchor); ok('fifoStockCost criada') } else warn('fifoStockCost')
} else ok('fifoStockCost ja existe')

const avgOld = 'const averages = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, averagePurchaseCost(ingredient, purchasesMap.get(ingredient.id) ?? [])])), [ingredients, purchasesMap])'
if (s.includes(avgOld)) {
  const avgNew = `const stockLines = useMemo(() => computeStock(ingredients, purchases, menuComponents, recipeItems, sales, [], recipes), [ingredients, purchases, menuComponents, recipeItems, sales, recipes])
  const stockUsedById = useMemo(() => { const map = new Map<string, { consumed: number; adjusted: number }>(); for (const line of stockLines) map.set(line.ingredientId, { consumed: line.consumed, adjusted: line.adjusted }); return map }, [stockLines])
  const averages = useMemo(() => new Map(ingredients.map((ingredient) => { const used = stockUsedById.get(ingredient.id) ?? { consumed: 0, adjusted: 0 }; return [ingredient.id, fifoStockCost(ingredient, purchasesMap.get(ingredient.id) ?? [], used.consumed, used.adjusted)] })), [ingredients, purchasesMap, stockUsedById])`
  s = s.split(avgOld).join(avgNew)
  ok('custos das receitas usam estoque FIFO')
} else warn('custos das receitas usam estoque FIFO')

fs.writeFileSync(p + '.bak77', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')