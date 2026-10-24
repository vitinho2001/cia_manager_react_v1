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
