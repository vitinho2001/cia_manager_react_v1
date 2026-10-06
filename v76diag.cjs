const fs = require('fs')
const t = fs.readFileSync('src/pages/RecipesPage.tsx', 'utf8')
const lines = t.split(/\r?\n/)
const keys = ["services/ingredients", "services/sales", "services/stock", "services/menu", "typeof Sale", "useState<Sale", "useState<MenuItemComponent", "listPurchases(", "listSales(", "Promise.all", "setRecipes(", "setSales(", "setMenuComponents", "fifoStockCost", "averagePurchaseCost", "const averages", "stockLines", "stockUsedById", "itemCost", "Sem pre", "monthBounds("]
lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) console.log((i + 1) + ': ' + l.trim()) })