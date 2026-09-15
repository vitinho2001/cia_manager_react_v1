const fs = require('fs')

// 1a. Adiciona getIngredientUsage ao final de ingredients.ts (so uma vez)
const ingPath = 'src/services/ingredients.ts'
let ing = fs.readFileSync(ingPath, 'utf8')
if (!ing.includes('getIngredientUsage')) {
  const usageBlock = [
    '',
    'export async function getIngredientUsage(id: string) {',
    "  if (!supabase) throw new Error('Supabase nao configurado.')",
    '  const [recipes, menu, purchases, adjustments] = await Promise.all([',
    "    supabase.from('recipe_items').select('recipe_id, quantity').eq('ingredient_id', id),",
    "    supabase.from('menu_item_components').select('menu_item_id').eq('ingredient_id', id),",
    "    supabase.from('ingredient_purchases').select('id').eq('ingredient_id', id).limit(1),",
    "    supabase.from('stock_adjustments').select('id').eq('ingredient_id', id).limit(1),",
    '  ])',
    '  return {',
    '    recipeCount: recipes.data ? recipes.data.length : 0,',
    '    menuCount: menu.data ? menu.data.length : 0,',
    '    hasPurchases: purchases.data ? purchases.data.length > 0 : false,',
    '    hasAdjustments: adjustments.data ? adjustments.data.length > 0 : false,',
    '  }',
    '}',
    ''
  ].join('\n')
  fs.writeFileSync(ingPath, ing + usageBlock, 'utf8')
  console.log('OK: getIngredientUsage adicionado em ingredients.ts')
} else {
  console.log('JA EXISTE: getIngredientUsage em ingredients.ts')
}

// 1b. Import em IngredientsPage.tsx + novo removeIngredient
const pagePath = 'src/pages/IngredientsPage.tsx'
const original = fs.readFileSync(pagePath, 'utf8')
let p = original

const oldImp = "import { addPurchase, createIngredientWithPurchase, deleteIngredient, deletePurchase, listIngredients, listPurchases, updatePurchase } from '../services/ingredients'"
const newImp = "import { addPurchase, createIngredientWithPurchase, deleteIngredient, deletePurchase, getIngredientUsage, listIngredients, listPurchases, updatePurchase } from '../services/ingredients'"
if (p.includes(oldImp)) {
  p = p.split(oldImp).join(newImp)
  console.log('OK: import com getIngredientUsage')
} else {
  console.log('ATENCAO: import antigo nao encontrado')
}

const oldConfirm = /if \(!window\.confirm\(`Excluir o insumo .*?`\)\) return/
const hadConfirm = oldConfirm.test(p)
p = p.replace(oldConfirm, '')

const anchor = 'async function removeIngredient(ingredient: Ingredient) {'
const insertLines = [
  'async function removeIngredient(ingredient: Ingredient) {',
  '    let usage',
  '    try { usage = await getIngredientUsage(ingredient.id) }',
  '    catch { usage = { recipeCount: 0, menuCount: 0, hasPurchases: true, hasAdjustments: false } }',
  "    let message = 'Excluir o insumo ' + ingredient.name + '?'",
  "    if (usage.recipeCount > 0) message += '\\n\\nUsado em ' + usage.recipeCount + ' receita(s).'",
  "    if (usage.menuCount > 0) message += '\\n\\nUsado em ' + usage.menuCount + ' item(ns) de cardapio.'",
  "    if (usage.hasPurchases) message += '\\n\\nPossui historico de compras.'",
  "    if (usage.hasAdjustments) message += '\\n\\nPossui ajustes de estoque.'",
  "    if (usage.recipeCount > 0 || usage.menuCount > 0) message += '\\n\\nExcluir pode afetar o calculo de custos. Deseja continuar?'",
  '    if (!window.confirm(message)) return',
]
const insertBlock = insertLines.join('\n')
if (p.includes(anchor)) {
  p = p.split(anchor).join(insertBlock)
  console.log('OK: removeIngredient com verificacao de uso')
} else {
  console.log('ATENCAO: assinatura do removeIngredient nao encontrada')
}
if (!hadConfirm) console.log('ATENCAO: confirm antigo nao encontrado (confira o arquivo)')

fs.writeFileSync(pagePath + '.bak39', original, 'utf8')
fs.writeFileSync(pagePath, p, 'utf8')
console.log('OK: IngredientsPage atualizado (backup em IngredientsPage.tsx.bak39)')