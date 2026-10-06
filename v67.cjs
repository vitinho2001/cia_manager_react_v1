const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

const p = 'src/pages/MenuPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original

const impOld = "import { listIngredients, listPurchases } from '../services/ingredients'"
const impNew = "import { listIngredients, listPurchases } from '../services/ingredients'\nimport { listSales } from '../services/sales'\nimport { computeStock } from '../services/stock'\nimport type { Sale } from '../types/sales'"
if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('imports de vendas e estoque') } else warn('imports de vendas e estoque')

const stOld = 'const [purchases, setPurchases] = useState<IngredientPurchase[]>([])'
const stNew = 'const [purchases, setPurchases] = useState<IngredientPurchase[]>([])\n  const [sales, setSales] = useState<Sale[]>([])'
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado de vendas') } else warn('estado de vendas')

const loOld = 'listPurchases(orgId, bounds.start, bounds.end),'
const loNew = 'listPurchases(orgId, undefined, bounds.end), listSales(orgId, undefined, bounds.end),'
if (s.includes(loOld)) { s = s.split(loOld).join(loNew); ok('load usa historico completo + vendas') } else warn('load usa historico completo')

const deOld = 'const [menuData, componentData, recipeData, recipeItemData, ingredientData, purchaseData] = await Promise.all(['
const deNew = 'const [menuData, componentData, recipeData, recipeItemData, ingredientData, purchaseData, saleData] = await Promise.all(['
if (s.includes(deOld)) { s = s.split(deOld).join(deNew); ok('desestrutura saleData') } else warn('desestrutura saleData')

const seOld = 'setItems(menuData); setComponents(componentData); setRecipes(recipeData); setRecipeItems(recipeItemData); setIngredients(ingredientData); setPurchases(purchaseData)'
const seNew = 'setItems(menuData); setComponents(componentData); setRecipes(recipeData); setRecipeItems(recipeItemData); setIngredients(ingredientData); setPurchases(purchaseData); setSales(saleData)'
if (s.includes(seOld)) { s = s.split(seOld).join(seNew); ok('setSales no load') } else warn('setSales no load')

if (!s.includes('function fifoStockCost')) {
  const fnRe = /\nfunction averagePurchaseCost[\s\S]*?\n\}/
  const fnNew = `
function fifoStockCost(ingredient: Ingredient, purchases: IngredientPurchase[], consumedQty: number, adjustmentsQty: number): number | null {
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
}`
  if (fnRe.test(s)) { s = s.replace(fnRe, fnNew); ok('fifoStockCost criada') } else warn('fifoStockCost criada')
} else ok('fifoStockCost ja existe')

const avgOld = "const averageByIngredient = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, averagePurchaseCost(ingredient, purchasesByIngredient.get(ingredient.id) ?? [])])), [ingredients, purchasesByIngredient])"
const avgNew = `const stockLines = useMemo(() => computeStock(ingredients, purchases, components, recipeItems, sales, [], recipes), [ingredients, purchases, components, recipeItems, sales, recipes])
  const stockUsedById = useMemo(() => { const map = new Map<string, { consumed: number; adjusted: number }>(); for (const line of stockLines) map.set(line.ingredientId, { consumed: line.consumed, adjusted: line.adjusted }); return map }, [stockLines])
  const averageByIngredient = useMemo(() => new Map(ingredients.map((ingredient) => { const used = stockUsedById.get(ingredient.id) ?? { consumed: 0, adjusted: 0 }; return [ingredient.id, fifoStockCost(ingredient, purchasesByIngredient.get(ingredient.id) ?? [], used.consumed, used.adjusted)] })), [ingredients, purchasesByIngredient, stockUsedById])`
if (s.includes(avgOld)) { s = s.split(avgOld).join(avgNew); ok('custos usam estoque FIFO') } else warn('custos usam estoque FIFO')

fs.writeFileSync(p + '.bak68', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')