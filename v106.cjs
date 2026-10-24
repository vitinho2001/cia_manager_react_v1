const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

const p = 'src/services/dre.ts'
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'

// Remove o bloco antigo (computeUnitCosts + computeItemMargins + tipos ItemMargin) se existir
let s = original
const startMarker = 'export type ItemMargin'
const idx = s.indexOf(startMarker)
if (idx > -1) {
  s = s.slice(0, idx).replace(/\s+$/, '') + eol
  ok('removeu bloco antigo de margem por item')
}

// Novo bloco correto, usando MenuItemComponent + Recipe.yield_quantity
const block = `

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
`

fs.writeFileSync(p, s + block, 'utf8')
ok('services/dre.ts reescrito com composicao real de itens')

// ===== DrePage.tsx: corrigir load e estado =====
{
  const pp = 'src/pages/DrePage.tsx'
  let page = fs.readFileSync(pp, 'utf8')
  const pageEol = page.includes('\r\n') ? '\r\n' : '\n'
  const before = page

  // 1) imports: computeMenuItemCosts em vez de computeUnitCosts; listMenuComponents
  if (page.includes('computeUnitCosts')) {
    page = page.split('computeUnitCosts').join('computeMenuItemCosts')
    ok('renomeia computeUnitCosts -> computeMenuItemCosts')
  }
  if (!page.includes("from '../services/menu'")) {
    page = page.replace("import { getCurrentOrganizationId } from '../services/organization'",
      "import { getCurrentOrganizationId } from '../services/organization'" + pageEol + "import { listMenuComponents } from '../services/menu'")
    ok('import listMenuComponents')
  } else ok('import de menu ja presente')

  // 2) estado: recipes/items -> components/recipes/recipeItems
  const oldState = /  const \[recipeRefs, setRecipeRefs\] = useState<[^\n]*>\(\{ recipes: \[\], items: \[\] \}\)/
  const newState = [
    '  const [recipeRefs, setRecipeRefs] = useState<{',
    '    components: { menu_item_id: string; component_type: \'recipe\' | \'ingredient\'; recipe_id: string | null; ingredient_id: string | null; quantity: number }[]',
    '    recipes: { id: string; yield_quantity: number }[]',
    '    items: { recipe_id: string; ingredient_id: string; quantity: number }[]',
    '  }>({ components: [], recipes: [], items: [] })',
  ].join(pageEol)
  if (oldState.test(page)) { page = page.replace(oldState, newState); ok('estado recipeRefs corrigido') }
  else warn('estado recipeRefs nao encontrado')

  // 3) load: adicionar listMenuComponents e ajustar setRecipeRefs
  const oldSet = /      setRecipeRefs\(\{ recipes: recRows, items: recItemRows as unknown as \{[^\n]*\n/
  const newSet = [
    '      setRecipeRefs({',
    '        components: compRows as { menu_item_id: string; component_type: \'recipe\' | \'ingredient\'; recipe_id: string | null; ingredient_id: string | null; quantity: number }[],',
    '        recipes: recRows as { id: string; yield_quantity: number }[],',
    '        items: recItemRows as { recipe_id: string; ingredient_id: string; quantity: number }[],',
    '      })',
    '',
  ].join(pageEol)
  if (oldSet.test(page)) { page = page.replace(oldSet, newSet); ok('setRecipeRefs corrigido') } else warn('setRecipeRefs nao encontrado')

  // 4) load: garantir compRows carregado
  if (!page.includes('listMenuComponents(organizationId)')) {
    page = page.replace(
      /      const \[recRows, recItemRows\] = await Promise\.all\(\[/,
      '      const [recRows, recItemRows, compRows] = await Promise.all([' + pageEol +
      '        listMenuComponents(organizationId).catch(() => []),'
    )
    ok('carrega MenuComponents')
  } else ok('MenuComponents ja carregado')

  // 5) calculo das margens
  const oldCalc = /    const unitCosts = computeMenuItemCosts\(recipeRefs\.items, recipeRefs\.recipes, context\.lines\)/
  const newCalc = '    const unitCosts = computeMenuItemCosts(recipeRefs.components, recipeRefs.recipes, recipeRefs.items, context.lines)'
  if (oldCalc.test(page)) { page = page.replace(oldCalc, newCalc); ok('calculo das margens corrigido') }
  else warn('calculo das margens nao encontrado')

  // 6) JSX: hasRecipe -> hasCost
  if (page.includes('m.hasRecipe')) { page = page.split('m.hasRecipe').join('m.hasCost'); ok('hasRecipe -> hasCost') }

  if (page !== before) { fs.writeFileSync(pp + '.bak106', before, 'utf8'); fs.writeFileSync(pp, page, 'utf8') }
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')