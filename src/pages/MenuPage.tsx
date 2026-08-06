import { AlertTriangle, BookOpen, Boxes, ChevronRight, Pencil, Plus, RefreshCw, Search, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { defaultMenuRows } from '../data/defaultMenu'
import { getCurrentOrganizationId } from '../services/organization'
import { listIngredients, listPurchases } from '../services/ingredients'
import { listRecipeItems, listRecipes } from '../services/recipes'
import { createMenuItem, deleteMenuItem, listMenuComponents, listMenuItems, seedMenuItems, updateMenuItem } from '../services/menu'
import type { Ingredient, IngredientPurchase } from '../types/ingredients'
import type { Recipe, RecipeItem } from '../types/recipes'
import type { MenuComponentInput, MenuItem, MenuItemComponent, MenuComponentType } from '../types/menu'

const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)
const directUnits = ['mg', 'g', 'kg', 'ml', 'L', 'un', 'pacote', 'caixa', 'lata', 'garrafa', 'fatia', 'porção']

type ComponentDraft = { key: string; type: MenuComponentType; targetId: string; quantity: string; unit: string }
type Draft = { name: string; category: string; counterPrice: string; ifoodPrice: string; bysellPrice: string; components: ComponentDraft[] }

const emptyDraft: Draft = { name: '', category: '', counterPrice: '', ifoodPrice: '', bysellPrice: '', components: [] }

function parseNumber(value: string) {
  const text = value.trim()
  if (!text) return Number.NaN
  return Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text)
}
function parseOptionalMoney(value: string) {
  const number = parseNumber(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}
function money(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return { start: `${month}-01`, end: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}` }
}
function convertQuantity(quantity: number, from: string, to: string): number | null {
  if (from === to) return quantity
  const weight: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 }
  const volume: Record<string, number> = { ml: 1, L: 1000 }
  if (from in weight && to in weight) return quantity * weight[from] / weight[to]
  if (from in volume && to in volume) return quantity * volume[from] / volume[to]
  return null
}
function averagePurchaseCost(ingredient: Ingredient, purchases: IngredientPurchase[]) {
  let amount = 0
  let quantity = 0
  for (const purchase of purchases) {
    const converted = convertQuantity(purchase.quantity, purchase.purchase_unit, ingredient.purchase_unit)
    if (converted == null) continue
    amount += purchase.total_amount
    quantity += converted
  }
  return quantity > 0 ? amount / quantity : null
}
function recipeItemCost(item: RecipeItem, ingredient: Ingredient, average: number | null) {
  if (average == null) return null
  const automatic = convertQuantity(item.quantity, item.recipe_unit, ingredient.purchase_unit)
  if (automatic != null) return automatic * average
  if (item.manual_conversion_quantity && item.manual_conversion_unit === item.recipe_unit) return item.quantity / item.manual_conversion_quantity * average
  return null
}
function newComponent(type: MenuComponentType, targetId = '', unit = 'un'): ComponentDraft {
  return { key: crypto.randomUUID(), type, targetId, quantity: '1', unit }
}

export function MenuPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [components, setComponents] = useState<MenuItemComponent[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function load(targetMonth = month) {
    setLoading(true); setError(null)
    try {
      const orgId = organizationId ?? await getCurrentOrganizationId()
      setOrganizationId(orgId)
      const bounds = monthBounds(targetMonth)
      const [menuData, componentData, recipeData, recipeItemData, ingredientData, purchaseData] = await Promise.all([
        listMenuItems(orgId), listMenuComponents(orgId), listRecipes(orgId), listRecipeItems(orgId), listIngredients(orgId), listPurchases(orgId, bounds.start, bounds.end),
      ])
      setItems(menuData); setComponents(componentData); setRecipes(recipeData); setRecipeItems(recipeItemData); setIngredients(ingredientData); setPurchases(purchaseData)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o cardápio.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (organizationId) void load(month) }, [month])

  const ingredientMap = useMemo(() => new Map(ingredients.map((item) => [item.id, item])), [ingredients])
  const recipeMap = useMemo(() => new Map(recipes.map((item) => [item.id, item])), [recipes])
  const itemsByRecipe = useMemo(() => { const map = new Map<string, RecipeItem[]>(); for (const row of recipeItems) map.set(row.recipe_id, [...(map.get(row.recipe_id) ?? []), row]); return map }, [recipeItems])
  const purchasesByIngredient = useMemo(() => { const map = new Map<string, IngredientPurchase[]>(); for (const row of purchases) map.set(row.ingredient_id, [...(map.get(row.ingredient_id) ?? []), row]); return map }, [purchases])
  const averageByIngredient = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, averagePurchaseCost(ingredient, purchasesByIngredient.get(ingredient.id) ?? [])])), [ingredients, purchasesByIngredient])
  const recipeCostById = useMemo(() => {
    const map = new Map<string, { total: number; perYield: number; incomplete: number }>()
    for (const recipe of recipes) {
      let total = 0; let incomplete = 0
      for (const item of itemsByRecipe.get(recipe.id) ?? []) {
        const ingredient = ingredientMap.get(item.ingredient_id)
        if (!ingredient) { incomplete++; continue }
        const cost = recipeItemCost(item, ingredient, averageByIngredient.get(ingredient.id) ?? null)
        if (cost == null) incomplete++; else total += cost
      }
      map.set(recipe.id, { total, perYield: recipe.yield_quantity > 0 ? total / recipe.yield_quantity : 0, incomplete })
    }
    return map
  }, [recipes, itemsByRecipe, ingredientMap, averageByIngredient])
  const componentsByItem = useMemo(() => { const map = new Map<string, MenuItemComponent[]>(); for (const row of components) map.set(row.menu_item_id, [...(map.get(row.menu_item_id) ?? []), row]); return map }, [components])

  function componentCost(component: MenuItemComponent | ComponentDraft) {
    const type = 'component_type' in component ? component.component_type : component.type
    const quantity = 'quantity' in component && typeof component.quantity === 'number' ? component.quantity : parseNumber(component.quantity)
    if (!(quantity > 0)) return { cost: null, incomplete: true }
    if (type === 'recipe') {
      const recipeId = 'recipe_id' in component ? component.recipe_id : component.targetId
      const recipeCost = recipeId ? recipeCostById.get(recipeId) : null
      if (!recipeCost || recipeCost.incomplete) return { cost: recipeCost ? recipeCost.perYield * quantity : null, incomplete: true }
      return { cost: recipeCost.perYield * quantity, incomplete: false }
    }
    const ingredientId = 'ingredient_id' in component ? component.ingredient_id : component.targetId
    const ingredient = ingredientId ? ingredientMap.get(ingredientId) : null
    if (!ingredient) return { cost: null, incomplete: true }
    const unit = ('unit' in component ? component.unit : component.unit) || ingredient.purchase_unit
    const converted = convertQuantity(quantity, unit, ingredient.purchase_unit)
    const average = averageByIngredient.get(ingredient.id) ?? null
    return converted == null || average == null ? { cost: null, incomplete: true } : { cost: converted * average, incomplete: false }
  }
  function menuCost(item: MenuItem) {
    let total = 0; let incomplete = 0
    for (const component of componentsByItem.get(item.id) ?? []) {
      const result = componentCost(component)
      if (result.cost != null) total += result.cost
      if (result.incomplete) incomplete++
    }
    return { total, incomplete }
  }

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [items])
  const filtered = useMemo(() => items.filter((item) => (categoryFilter === 'Todas' || item.category === categoryFilter) && `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [items, categoryFilter, search])
  const grouped = useMemo(() => { const map = new Map<string, MenuItem[]>(); for (const item of filtered) map.set(item.category, [...(map.get(item.category) ?? []), item]); return map }, [filtered])

  function openNew() { setEditing(null); setDraft(emptyDraft); setModalOpen(true); setError(null) }
  function openEdit(item: MenuItem) {
    setEditing(item)
    setDraft({
      name: item.name, category: item.category,
      counterPrice: item.counter_price?.toString().replace('.', ',') ?? '', ifoodPrice: item.ifood_price?.toString().replace('.', ',') ?? '', bysellPrice: item.bysell_price?.toString().replace('.', ',') ?? '',
      components: (componentsByItem.get(item.id) ?? []).map((row) => ({ key: row.id, type: row.component_type, targetId: row.recipe_id ?? row.ingredient_id ?? '', quantity: row.quantity.toString().replace('.', ','), unit: row.unit ?? 'un' })),
    })
    setModalOpen(true); setError(null)
  }
  function updateComponent(key: string, changes: Partial<ComponentDraft>) { setDraft((current) => ({ ...current, components: current.components.map((row) => row.key === key ? { ...row, ...changes } : row) })) }
  function serializeComponents(): MenuComponentInput[] {
    return draft.components.map((row) => ({ component_type: row.type, recipe_id: row.type === 'recipe' ? row.targetId : null, ingredient_id: row.type === 'ingredient' ? row.targetId : null, quantity: parseNumber(row.quantity), unit: row.type === 'recipe' ? null : row.unit }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null)
    if (!organizationId) return
    if (!draft.name.trim() || !draft.category.trim()) { setError('Informe nome e categoria.'); return }
    const serialized = serializeComponents()
    if (serialized.some((row) => !row.recipe_id && !row.ingredient_id || !(row.quantity > 0))) { setError('Revise os componentes e as quantidades.'); return }
    setSaving(true)
    try {
      const payload = { organizationId, name: draft.name, category: draft.category, counterPrice: parseOptionalMoney(draft.counterPrice), ifoodPrice: parseOptionalMoney(draft.ifoodPrice), bysellPrice: parseOptionalMoney(draft.bysellPrice), components: serialized }
      if (editing) await updateMenuItem({ id: editing.id, ...payload }); else await createMenuItem(payload)
      setModalOpen(false); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o item.') }
    finally { setSaving(false) }
  }
  async function remove(item: MenuItem) {
    if (!confirm(`Excluir ${item.name}?`)) return
    try { await deleteMenuItem(item.id); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.') }
  }
  async function seed() {
    if (!organizationId) return
    setSeeding(true); setError(null)
    try { await seedMenuItems(organizationId, defaultMenuRows); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o cardápio padrão.') }
    finally { setSeeding(false) }
  }

  const draftCost = useMemo(() => {
    let total = 0; let incomplete = 0
    for (const component of draft.components) { const result = componentCost(component); if (result.cost != null) total += result.cost; if (result.incomplete) incomplete++ }
    return { total, incomplete }
  }, [draft.components, recipeCostById, ingredientMap, averageByIngredient])

  return <div className="page-stack">
    <PageHeader eyebrow="Engenharia de cardápio" title="Cardápio" description="Vincule cada produto a receitas e/ou insumos diretos e acompanhe o custo unitário por mês." actions={<Button onClick={openNew} icon={<Plus size={17}/>}>Novo item</Button>} />
    {error && <div className="notice notice-error">{error}<button type="button" onClick={() => setError(null)}><X size={16}/></button></div>}
    <section className="content-card menu-toolbar-card">
      <div className="toolbar-row wrap"><div className="search-field"><Search size={17}/><input placeholder="Buscar item ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)}/></div><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><label className="month-field">Mês do custo<input type="month" value={month} onChange={(e) => setMonth(e.target.value)}/></label><Button variant="secondary" onClick={() => void load()} icon={<RefreshCw size={16}/>}>Atualizar</Button>{!items.length && <Button variant="secondary" onClick={() => void seed()} disabled={seeding}>{seeding ? 'Carregando…' : 'Carregar cardápio padrão'}</Button>}</div>
    </section>
    {loading ? <div className="table-message">Carregando cardápio…</div> : !filtered.length ? <div className="empty-state"><UtensilsCrossed size={44}/><h2>Nenhum item encontrado</h2><p>Cadastre manualmente ou carregue o cardápio padrão da Cia. do Caldinho.</p><div className="empty-actions"><Button onClick={openNew} icon={<Plus size={16}/>}>Novo item</Button><Button variant="secondary" onClick={() => void seed()} disabled={seeding}>Carregar padrão</Button></div></div> : <div className="menu-category-stack">{Array.from(grouped.entries()).map(([category, categoryItems]) => <section className="menu-category" key={category}><div className="menu-category-heading"><div><span className="eyebrow">Categoria</span><h2>{category}</h2></div><span>{categoryItems.length} itens</span></div><div className="menu-list">{categoryItems.map((item) => { const cost = menuCost(item); const count = componentsByItem.get(item.id)?.length ?? 0; return <article className="menu-row-card" key={item.id} onClick={() => openEdit(item)}><div className="menu-row-main"><div className="menu-row-icon"><UtensilsCrossed size={18}/></div><div><h3>{item.name}</h3><p>{count ? `${count} componente${count === 1 ? '' : 's'}` : 'Composição pendente'}</p></div></div><div className="menu-row-metrics"><span>Custo<strong>{money(cost.total)}</strong></span><span>Balcão<strong>{money(item.counter_price)}</strong></span>{cost.incomplete > 0 && <span className="status-warning"><AlertTriangle size={14}/>{cost.incomplete} pendência(s)</span>}</div><div className="row-actions"><button className="icon-action" onClick={(e) => { e.stopPropagation(); openEdit(item) }} title="Editar"><Pencil size={15}/></button><button className="icon-action danger" onClick={(e) => { e.stopPropagation(); void remove(item) }} title="Excluir"><Trash2 size={15}/></button><ChevronRight size={18}/></div></article>})}</div></section>)}</div>}

    {modalOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}><form className="modal-card modal-wide menu-modal" onSubmit={submit}><button className="modal-close" type="button" onClick={() => setModalOpen(false)}><X size={18}/></button><h2>{editing ? 'Editar item do cardápio' : 'Novo item do cardápio'}</h2><p className="modal-description">Um item pode combinar quantas receitas e insumos diretos forem necessários.</p>
      <div className="form-grid"><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Jantinha 1"/></label><label>Categoria<input list="menu-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Ex.: Executivos — Jantinhas"/><datalist id="menu-categories">{categories.filter((c) => c !== 'Todas').map((c) => <option key={c} value={c}/>)}</datalist></label><label>Preço balcão<input inputMode="decimal" value={draft.counterPrice} onChange={(e) => setDraft({ ...draft, counterPrice: e.target.value })} placeholder="0,00"/></label><label>Preço iFood<input inputMode="decimal" value={draft.ifoodPrice} onChange={(e) => setDraft({ ...draft, ifoodPrice: e.target.value })} placeholder="0,00"/></label><label>Preço BySell<input inputMode="decimal" value={draft.bysellPrice} onChange={(e) => setDraft({ ...draft, bysellPrice: e.target.value })} placeholder="0,00"/></label></div>
      <div className="recipe-editor-heading"><div><span className="eyebrow">Composição</span><h3>Receitas e insumos</h3></div><div className="button-cluster"><Button type="button" variant="secondary" onClick={() => setDraft({ ...draft, components: [...draft.components, newComponent('recipe', recipes[0]?.id ?? '', 'porção')] })} icon={<BookOpen size={16}/>}>Adicionar receita</Button><Button type="button" variant="secondary" onClick={() => setDraft({ ...draft, components: [...draft.components, newComponent('ingredient', ingredients[0]?.id ?? '', ingredients[0]?.purchase_unit ?? 'un')] })} icon={<Boxes size={16}/>}>Adicionar insumo</Button></div></div>
      {!draft.components.length ? <div className="empty-state compact"><p>Este item ainda não possui composição. Bebidas prontas normalmente usam um insumo direto; pratos e caldos usam uma ou mais receitas.</p></div> : <div className="menu-component-editor">{draft.components.map((component) => { const recipe = component.type === 'recipe' ? recipeMap.get(component.targetId) : null; const ingredient = component.type === 'ingredient' ? ingredientMap.get(component.targetId) : null; const result = componentCost(component); return <div className="menu-component-row" key={component.key}><div className={`component-type-badge ${component.type}`} >{component.type === 'recipe' ? <BookOpen size={15}/> : <Boxes size={15}/>} {component.type === 'recipe' ? 'Receita' : 'Insumo'}</div><label>Componente<select value={component.targetId} onChange={(e) => { const nextIngredient = component.type === 'ingredient' ? ingredientMap.get(e.target.value) : null; updateComponent(component.key, { targetId: e.target.value, unit: nextIngredient?.purchase_unit ?? component.unit }) }}><option value="">Selecione</option>{component.type === 'recipe' ? recipes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>) : ingredients.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><small>{recipe ? `1 ${recipe.yield_unit.replace(/s$/, '')}` : ingredient ? `Compra em ${ingredient.purchase_unit}` : '—'}</small></label><label>Quantidade<input inputMode="decimal" value={component.quantity} onChange={(e) => updateComponent(component.key, { quantity: e.target.value })}/></label>{component.type === 'ingredient' ? <label>Unidade<select value={component.unit} onChange={(e) => updateComponent(component.key, { unit: e.target.value })}>{directUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label> : <div className="automatic-conversion">Porção da receita</div>}<div className="recipe-item-cost"><small>{result.incomplete ? 'Custo incompleto' : 'Custo calculado'}</small><strong>{money(result.cost)}</strong></div><button type="button" className="icon-action danger" onClick={() => setDraft({ ...draft, components: draft.components.filter((row) => row.key !== component.key) })}><Trash2 size={15}/></button></div>})}</div>}
      <div className="recipe-summary"><span>Custo direto<strong>{money(draftCost.total)}</strong></span><span>Componentes<strong>{draft.components.length}</strong></span><span className={draftCost.incomplete ? 'warning-summary' : 'highlight'}>{draftCost.incomplete ? 'Pendências' : 'Status'}<strong>{draftCost.incomplete ? draftCost.incomplete : 'Completo'}</strong></span></div>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar item'}</Button></div>
    </form></div>}
  </div>
}
