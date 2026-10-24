const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) services/dre.ts: adiciona custo por item =====
{
  const p = 'src/services/dre.ts'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('export type ItemMargin')) { console.log('INFO: margem por item ja presente.'); }
  else {
    const add = `
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
  hasRecipe: boolean
}

// Custo unitario de cada item do cardapio, a partir das receitas e do custo medio dos insumos
export function computeUnitCosts(
  recipeItems: { recipe_id: string; ingredient_id: string; quantity: number }[],
  recipes: { id: string; menu_item_id: string | null }[],
  lines: StockLine[],
): Map<string, number> {
  const costByIngredient = new Map<string, number>()
  for (const l of lines) if (l.avgCost > 0) costByIngredient.set(l.ingredient_id, l.avgCost)

  const costByRecipe = new Map<string, number>()
  for (const ri of recipeItems) {
    const unitCost = costByIngredient.get(ri.ingredient_id) ?? 0
    costByRecipe.set(ri.recipe_id, (costByRecipe.get(ri.recipe_id) ?? 0) + unitCost * (Number(ri.quantity) || 0))
  }

  const costByMenuItem = new Map<string, number>()
  for (const r of recipes) {
    if (!r.menu_item_id) continue
    const c = costByRecipe.get(r.id) ?? 0
    if (c <= 0) continue
    costByMenuItem.set(r.menu_item_id, (costByMenuItem.get(r.menu_item_id) ?? 0) + c)
  }
  return costByMenuItem
}

// Margem por item vendido no periodo
export function computeItemMargins(
  sales: Sale[],
  unitCostByMenuItem: Map<string, number>,
): ItemMargin[] {
  const map = new Map<string, ItemMargin>()
  for (const s of sales) {
    const id = s.menu_item_id || 'sem-associacao'
    const name = s.menu_item?.name ?? s.item_name ?? 'Sem associacao'
    const qty = Number(s.quantity) || 0
    const revenue = Number(s.total_amount) || 0
    const cur = map.get(id)
    if (cur) {
      cur.qtySold += qty
      cur.revenue += revenue
    } else {
      map.set(id, {
        menuItemId: id,
        name,
        qtySold: qty,
        revenue,
        unitPrice: 0,
        unitCost: 0,
        totalCost: 0,
        marginValue: 0,
        marginPct: 0,
        hasRecipe: unitCostByMenuItem.has(id),
      })
    }
  }
  const out = [...map.values()].map((r) => {
    const unitCost = unitCostByMenuItem.get(r.menuItemId) ?? 0
    const totalCost = unitCost * r.qtySold
    const marginValue = r.revenue - totalCost
    return {
      ...r,
      unitPrice: r.qtySold > 0 ? r.revenue / r.qtySold : 0,
      unitCost,
      totalCost,
      marginValue,
      marginPct: r.revenue > 0 ? (marginValue / r.revenue) * 100 : 0,
    }
  })
  return out.sort((a, b) => b.marginValue - a.marginValue)
}
`
    fs.writeFileSync(p, original + add, 'utf8')
    ok('services/dre.ts: margem por item adicionada')
  }
}

// ===== 2) pages/DrePage.tsx =====
{
  const p = 'src/pages/DrePage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('Margem por item')) { console.log('INFO: secao margem por item ja presente.'); }
  else {
    const eol = original.includes('\r\n') ? '\r\n' : '\n'
    let s = original

    // 2a) imports
    const impOld = "import { CHANNEL_LABELS, computeDre, loadDreContext } from '../services/dre'"
    const impNew = "import { CHANNEL_LABELS, computeDre, computeItemMargins, computeUnitCosts, loadDreContext } from '../services/dre'"
    if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('import de computeItemMargins') }
    else warn('import do servico dre')

    // 2b) carregar recipeItems e recipes no load
    const loadOld = '      const ctx = await loadDreContext(organizationId, from, to)'
    const loadNew = [
      '      const ctx = await loadDreContext(organizationId, from, to)',
      '      const [recRows, recItemRows] = await Promise.all([',
      '        listRecipes(organizationId).catch(() => []),',
      '        listRecipeItems(organizationId).catch(() => []),',
      '      ])',
      '      setRecipeRefs({ recipes: recRows, items: recItemRows as unknown as { recipe_id: string; ingredient_id: string; quantity: number }[] })',
    ].join(eol)
    if (s.includes(loadOld)) { s = s.split(loadOld).join(loadNew); ok('load das receitas') }
    else warn('ancora do load')

    // 2c) imports de receitas
    if (!s.includes("from '../services/recipes'")) {
      s = s.replace(impNew, impNew + eol + "import { listRecipes, listRecipeItems } from '../services/recipes'")
      ok('import de listRecipes/listRecipeItems')
    } else ok('imports de receitas ja presentes')

    // 2d) estado recipeRefs
    const stAnchor = '  const [context, setContext] = useState<DreContext | null>(null)'
    const stNew = [
      stAnchor,
      '  const [recipeRefs, setRecipeRefs] = useState<{ recipes: { id: string; menu_item_id: string | null }[]; items: { recipe_id: string; ingredient_id: string; quantity: number }[] }>({ recipes: [], items: [] })',
    ].join(eol)
    if (s.includes(stAnchor) && !s.includes('recipeRefs')) { s = s.split(stAnchor).join(stNew); ok('estado recipeRefs') }
    else warn('estado context')

    // 2e) calculo das margens
    const calcAnchor = '  const breakeven = useMemo('
    const calcNew = [
      '  const itemMargins = useMemo(() => {',
      '    if (!context) return []',
      '    const unitCosts = computeUnitCosts(recipeRefs.items, recipeRefs.recipes, context.lines)',
      '    return computeItemMargins(context.sales, unitCosts)',
      '  }, [context, recipeRefs])',
      '',
    ].join(eol)
    if (s.includes(calcAnchor) && !s.includes('const itemMargins = useMemo')) { s = s.split(calcAnchor).join(calcNew + calcAnchor); ok('calculo das margens') }
    else warn('ancora do breakeven')

    // 2f) secao visual antes do fechamento do page-container
    const endMarker = '    </div>' + eol + '  )' + eol + '}'
    const section = [
      '      <section className="panel">',
      '        <div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', gap: 10, flexWrap: \'wrap\' }}>',
      '          <h2>Margem por item</h2>',
      '          <span style={{ fontSize: 12, color: \'#6b7280\' }}>{itemMargins.length} item(ns) vendido(s) no período</span>',
      '        </div>',
      '        <p style={{ margin: \'0 0 12px\', fontSize: 13, color: \'#4b5563\' }}>Custo unitário calculado pela receita e pelo custo médio dos insumos (FIFO). Itens sem receita cadastrada aparecem com custo zero — a margem deles está superestimada.</p>',
      '        <div className="table-wrap">',
      '          <table>',
      '            <thead>',
      '              <tr>',
      '                <th>Item</th>',
      '                <th style={{ textAlign: \'right\' }}>Qtd</th>',
      '                <th style={{ textAlign: \'right\' }}>Preço médio</th>',
      '                <th style={{ textAlign: \'right\' }}>Custo un.</th>',
      '                <th style={{ textAlign: \'right\' }}>Margem un.</th>',
      '                <th style={{ textAlign: \'right\' }}>Margem total</th>',
      '                <th style={{ textAlign: \'right\' }}>%</th>',
      '              </tr>',
      '            </thead>',
      '            <tbody>',
      '              {itemMargins.map((m) => (',
      '                <tr key={m.menuItemId}>',
      '                  <td>',
      '                    <span style={{ fontWeight: 600 }}>{m.name}</span>',
      '                    {!m.hasRecipe && <small style={{ display: \'block\', fontSize: 11, color: \'#b54708\' }}>sem receita cadastrada</small>}',
      '                  </td>',
      '                  <td style={{ textAlign: \'right\' }}>{m.qtySold.toLocaleString(\'pt-BR\')}</td>',
      '                  <td style={{ textAlign: \'right\' }}>{brl(m.unitPrice)}</td>',
      '                  <td style={{ textAlign: \'right\' }}>{m.hasRecipe ? brl(m.unitCost) : \'—\'}</td>',
      '                  <td style={{ textAlign: \'right\', color: m.marginValue >= 0 ? \'#067647\' : \'#b42318\', fontWeight: 600 }}>',
      '                    {m.hasRecipe ? brl(m.unitPrice - m.unitCost) : \'—\'}',
      '                  </td>',
      '                  <td style={{ textAlign: \'right\', color: m.marginValue >= 0 ? \'#067647\' : \'#b42318\', fontWeight: 700 }}>{brl(m.marginValue)}</td>',
      '                  <td style={{ textAlign: \'right\', fontSize: 12, color: \'#6b7280\' }}>{m.hasRecipe ? pctFmt(m.marginPct) : \'—\'}</td>',
      '                </tr>',
      '              ))}',
      '              {itemMargins.length === 0 && (',
      '                <tr><td colSpan={7}><div className="empty-state"><h2>Nenhuma venda no período</h2><p>A margem por item aparece após o lançamento ou importação de vendas.</p></div></td></tr>',
      '              )}',
      '            </tbody>',
      '          </table>',
      '        </div>',
      '      </section>',
      '',
    ].join(eol)

    if (s.includes(endMarker) && !s.includes('Margem por item</h2>')) { s = s.replace(endMarker, section + endMarker); ok('secao margem por item') }
    else warn('fechamento do page-container')

    if (s !== original) { fs.writeFileSync(p + '.bak104', original, 'utf8'); fs.writeFileSync(p, s, 'utf8') }
  }
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')