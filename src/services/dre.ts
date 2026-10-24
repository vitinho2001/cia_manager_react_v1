import { listOperatingCosts } from './costs'
import { listIngredients, listPurchases } from './ingredients'
import { listMenuComponents } from './menu'
import { listRecipes, listRecipeItems } from './recipes'
import { listSales } from './sales'
import { computeStock, listStockAdjustments } from './stock'
import type { OperatingCost } from '../types/costs'
import type { Sale } from '../types/sales'
import type { StockLine } from '../types/stock'

export type DreData = {
  revenue: number
  qtySold: number
  revenueByChannel: Map<string, number>
  cmvCost: number
  variableCalc: { id: string; label: string; description: string; value: number }[]
  variableTotal: number
  fixedByCategory: { category: string; value: number; count: number }[]
  fixedTotal: number
  margin: number
  result: number
  totalCosts: number
}

export type DreContext = {
  sales: Sale[]
  costs: OperatingCost[]
  lines: StockLine[]
}

export function monthIdx(d: string) {
  const parts = d.split('-')
  return (Number(parts[0]) || 0) * 12 + (Number(parts[1]) || 0) - 1
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtInt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR')
export const CHANNEL_LABELS: Record<string, string> = { counter: 'Balcao', ifood: 'iFood', bysell: 'BySell', other: 'Outro' }

export function computeDre(context: DreContext, from: string, to: string): DreData {
  const { sales, costs, lines } = context
  const revenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0)
  const qtySold = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
  const revenueByChannel = new Map<string, number>()
  for (const s of sales) revenueByChannel.set(s.channel, (revenueByChannel.get(s.channel) ?? 0) + (Number(s.total_amount) || 0))
  const cmvCost = lines.reduce((sum, l) => sum + l.consumed * l.avgCost, 0)

  const variableCalc = costs.filter((c) => c.cost_type === 'variable').map((c) => {
    let value = 0
    let label = c.description
    if (c.calc_type === 'percent') {
      const base = revenueByChannel.get(c.channel ?? '') ?? 0
      value = (base * (Number(c.percent) || 0)) / 100
      label = c.description + ' - ' + brl(base) + ' x ' + String(Number(c.percent) || 0) + '%'
    } else {
      value = qtySold * (Number(c.unit_price) || 0)
      label = c.description + ' - ' + fmtInt(qtySold) + ' un x ' + brl(Number(c.unit_price) || 0)
    }
    return { id: c.id, description: c.description, label, value }
  })
  const variableTotal = variableCalc.reduce((sum, r) => sum + r.value, 0)

  const fixedRows = costs.filter((c) => c.cost_type === 'fixed' && monthIdx(c.expense_date) >= monthIdx(from) && monthIdx(c.expense_date) <= monthIdx(to))
  const fixedMap = new Map<string, { value: number; count: number }>()
  for (const c of fixedRows) {
    const cur = fixedMap.get(c.category) ?? { value: 0, count: 0 }
    cur.value += Number(c.amount) || 0
    cur.count += 1
    fixedMap.set(c.category, cur)
  }
  const fixedByCategory = [...fixedMap.entries()].map(([category, v]) => ({ category, value: v.value, count: v.count })).sort((a, b) => b.value - a.value)
  const fixedTotal = fixedByCategory.reduce((sum, f) => sum + f.value, 0)

  const margin = revenue - cmvCost - variableTotal
  const result = margin - fixedTotal
  return { revenue, qtySold, revenueByChannel, cmvCost, variableCalc, variableTotal, fixedByCategory, fixedTotal, margin, result, totalCosts: cmvCost + variableTotal + fixedTotal }
}

export async function loadDreContext(organizationId: string, from: string, to: string): Promise<DreContext> {
  const [sales, costs, ingRows, purRows, compRows, recRows, recItemRows, adjRows] = await Promise.all([
    listSales(organizationId, from, to),
    listOperatingCosts(organizationId),
    listIngredients(organizationId).catch(() => []),
    listPurchases(organizationId, undefined, to).catch(() => []),
    listMenuComponents(organizationId).catch(() => []),
    listRecipes(organizationId).catch(() => []),
    listRecipeItems(organizationId).catch(() => []),
    listStockAdjustments(organizationId).catch(() => []),
  ])
  return { sales, costs, lines: computeStock(ingRows, purRows, compRows, recItemRows, sales, adjRows, recRows) }
}


export type ItemMargin = {
  menuItemId: string
  name: string
  qtySold: number
  revenue: number
  unitPrice: number
  unitCost: number
  totalCost: number
  marginValue: number
  marginPct: number
  hasCost: boolean
}

type CompRow = {
  menu_item_id: string
  component_type: 'recipe' | 'ingredient'
  recipe_id: string | null
  ingredient_id: string | null
  quantity: number
}

type RecipeRow = { id: string; yield_quantity: number }
type RecipeItemRow = { recipe_id: string; ingredient_id: string; quantity: number }

/**
 * Custo unitario de cada item do cardapio.
 * Composicao real: MenuItemComponent -> receita (com yield) ou insumo direto.
 * Custo do insumo: custo medio FIFO vindo de StockLine.
 */
export function computeMenuItemCosts(
  components: CompRow[],
  recipes: RecipeRow[],
  recipeItems: RecipeItemRow[],
  lines: StockLine[],
): Map<string, number> {
  const costByIngredient = new Map<string, number>()
  for (const l of lines) if (l.avgCost > 0) costByIngredient.set(l.ingredientId, l.avgCost)

  const yieldByRecipe = new Map<string, number>()
  for (const r of recipes) yieldByRecipe.set(r.id, Number(r.yield_quantity) || 1)

  // soma dos insumos de cada receita
  const sumByRecipe = new Map<string, number>()
  for (const ri of recipeItems) {
    const unitCost = costByIngredient.get(ri.ingredient_id) ?? 0
    sumByRecipe.set(ri.recipe_id, (sumByRecipe.get(ri.recipe_id) ?? 0) + unitCost * (Number(ri.quantity) || 0))
  }

  // custo por unidade de receita = soma / rendimento
  const costPerRecipeUnit = new Map<string, number>()
  for (const [recipeId, total] of sumByRecipe) {
    const yieldQty = yieldByRecipe.get(recipeId) ?? 1
    costPerRecipeUnit.set(recipeId, yieldQty > 0 ? total / yieldQty : total)
  }

  const costByMenuItem = new Map<string, number>()
  for (const c of components) {
    const qty = Number(c.quantity) || 0
    let unit = 0
    if (c.component_type === 'recipe' && c.recipe_id) unit = costPerRecipeUnit.get(c.recipe_id) ?? 0
    else if (c.component_type === 'ingredient' && c.ingredient_id) unit = costByIngredient.get(c.ingredient_id) ?? 0
    if (unit <= 0) continue
    costByMenuItem.set(c.menu_item_id, (costByMenuItem.get(c.menu_item_id) ?? 0) + unit * qty)
  }
  return costByMenuItem
}

export function computeItemMargins(
  sales: Sale[],
  costByMenuItem: Map<string, number>,
): ItemMargin[] {
  const map = new Map<string, ItemMargin>()
  for (const s of sales) {
    const id = s.menu_item_id || 'sem-associacao'
    const name = (s.menu_item && s.menu_item.name) || s.item_name || 'Sem associacao'
    const qty = Number(s.quantity) || 0
    const revenue = Number(s.total_amount) || 0
    const cur = map.get(id)
    if (cur) { cur.qtySold += qty; cur.revenue += revenue }
    else {
      map.set(id, {
        menuItemId: id, name, qtySold: qty, revenue,
        unitPrice: 0, unitCost: 0, totalCost: 0, marginValue: 0, marginPct: 0,
        hasCost: costByMenuItem.has(id),
      })
    }
  }
  return [...map.values()].map((r) => {
    const unitCost = costByMenuItem.get(r.menuItemId) ?? 0
    const totalCost = unitCost * r.qtySold
    const marginValue = r.revenue - totalCost
    return {
      ...r,
      unitPrice: r.qtySold > 0 ? r.revenue / r.qtySold : 0,
      unitCost, totalCost, marginValue,
      marginPct: r.revenue > 0 ? (marginValue / r.revenue) * 100 : 0,
    }
  }).sort((a, b) => b.marginValue - a.marginValue)
}
