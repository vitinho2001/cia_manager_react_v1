const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
const callOld = 'computeStock(ingredients, purchases, menuComponents, recipeItems, sales, adjustments)'
const callNew = 'computeStock(ingredients, purchases, menuComponents, recipeItems, sales, adjustments, recipes)'
if (s.includes(callOld)) { s = s.split(callOld).join(callNew); console.log('OK: recipes adicionado na chamada do computeStock') }
else { console.log('ATENCAO: chamada do computeStock nao encontrada') }
const depOld = '[ingredients, purchases, menuComponents, recipeItems, sales, adjustments]'
const depNew = '[ingredients, purchases, menuComponents, recipeItems, sales, adjustments, recipes]'
if (s.includes(depOld)) { s = s.split(depOld).join(depNew); console.log('OK: recipes adicionado nas dependencias') }
else { console.log('ATENCAO: lista de dependencias nao encontrada') }
fs.writeFileSync(p + '.bak42', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido')