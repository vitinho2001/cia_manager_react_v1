const fs = require('fs')
const p = 'src/services/stock.ts'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ops = [
  { name: 'import Recipe junto com RecipeItem', from: "import type { RecipeItem } from '../types/recipes'", to: "import type { Recipe, RecipeItem } from '../types/recipes'" },
  { name: 'import convertQuantity', from: "import { supabase } from './supabase'", to: "import { supabase } from './supabase'\nimport { convertQuantity } from '../utils/units'" },
  { name: 'parametro recipes na assinatura', from: '  adjustments: StockAdjustment[],\n): StockLine[] {', to: '  adjustments: StockAdjustment[],\n  recipes: Recipe[],\n): StockLine[] {' },
  { name: 'mapas de unidade e rendimento', from: '  const perUnit: Record<string, Record<string, number>> = {}', to: '  const ingredientUnit: Record<string, string> = {}\n  for (const ing of ingredients) ingredientUnit[ing.id] = ing.purchase_unit\n  const recipeYield: Record<string, number> = {}\n  for (const r of recipes) recipeYield[r.id] = r.yield_quantity > 0 ? r.yield_quantity : 1\n\n  const perUnit: Record<string, Record<string, number>> = {}' },
  { name: 'conversao no componente de insumo', from: 'perUnit[c.menu_item_id][c.ingredient_id] = (perUnit[c.menu_item_id][c.ingredient_id] ?? 0) + (c.quantity || 0)', to: 'const unit = c.unit || ingredientUnit[c.ingredient_id]\n      const converted = convertQuantity(c.quantity || 0, unit, ingredientUnit[c.ingredient_id])\n      if (converted != null) perUnit[c.menu_item_id][c.ingredient_id] = (perUnit[c.menu_item_id][c.ingredient_id] ?? 0) + converted' },
  { name: 'conversao no componente de receita', from: 'perUnit[c.menu_item_id][ri.ingredient_id] = (perUnit[c.menu_item_id][ri.ingredient_id] ?? 0) + (c.quantity || 0) * (ri.quantity || 0)', to: 'const converted = convertQuantity(ri.quantity || 0, ri.recipe_unit, ingredientUnit[ri.ingredient_id])\n          if (converted != null) {\n            perUnit[c.menu_item_id][ri.ingredient_id] = (perUnit[c.menu_item_id][ri.ingredient_id] ?? 0) + (c.quantity || 0) * converted / (recipeYield[c.recipe_id] || 1)\n          }' }
]
for (const op of ops) {
  if (s.includes(op.from)) { s = s.split(op.from).join(op.to); count++; console.log('OK: ' + op.name) }
  else { console.log('ATENCAO: ' + op.name + ' — pedaco nao encontrado') }
}
fs.writeFileSync(p + '.bak41', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + '/' + ops.length + ' substituicoes aplicadas')