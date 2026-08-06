import { AlertTriangle, CalendarDays, ChefHat, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { getCurrentOrganizationId } from '../services/organization'
import { listIngredients, listPurchases } from '../services/ingredients'
import { createRecipe, deleteRecipe, listRecipeItems, listRecipes, updateRecipe } from '../services/recipes'
import type { Ingredient, IngredientPurchase } from '../types/ingredients'
import type { Recipe, RecipeItem, RecipeItemInput } from '../types/recipes'

const recipeUnits = ['mg', 'g', 'kg', 'ml', 'L', 'un', 'porção', 'fatia', 'colher', 'xícara', 'pacote', 'caixa', 'lata', 'garrafa', 'maço']
const yieldUnits = ['porções', 'unidades', 'kg', 'g', 'L', 'ml']
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)

type ItemDraft = {
  key: string
  ingredientId: string
  quantity: string
  recipeUnit: string
  manualConversionQuantity: string
  manualConversionUnit: string
}

type RecipeDraft = {
  name: string
  yieldQuantity: string
  yieldUnit: string
  notes: string
  items: ItemDraft[]
}

const emptyDraft: RecipeDraft = { name: '', yieldQuantity: '1', yieldUnit: 'porções', notes: '', items: [] }

function parseNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN
  return Number(trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed)
}

function money(value: number) {
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

function itemCost(item: Pick<ItemDraft, 'quantity' | 'recipeUnit' | 'manualConversionQuantity' | 'manualConversionUnit'>, ingredient: Ingredient, average: number | null) {
  if (average == null) return { cost: null, status: 'Sem preço no mês' }
  const quantity = parseNumber(item.quantity)
  if (!(quantity > 0)) return { cost: null, status: 'Quantidade inválida' }
  const automatic = convertQuantity(quantity, item.recipeUnit, ingredient.purchase_unit)
  if (automatic != null) return { cost: automatic * average, status: 'Conversão automática' }
  const equivalence = parseNumber(item.manualConversionQuantity)
  if (!(equivalence > 0) || item.manualConversionUnit !== item.recipeUnit) return { cost: null, status: 'Conversão manual necessária' }
  return { cost: quantity / equivalence * average, status: `1 ${ingredient.purchase_unit} = ${equivalence.toLocaleString('pt-BR')} ${item.manualConversionUnit}` }
}

function newItem(ingredientId = '', unit = 'g'): ItemDraft {
  return { key: crypto.randomUUID(), ingredientId, quantity: '', recipeUnit: unit, manualConversionQuantity: '', manualConversionUnit: unit }
}

export function RecipesPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft)

  async function load() {
    setLoading(true); setError(null)
    try {
      const orgId = organizationId ?? await getCurrentOrganizationId()
      setOrganizationId(orgId)
      const bounds = monthBounds(month)
      const [recipeRows, itemRows, ingredientRows, purchaseRows] = await Promise.all([
        listRecipes(orgId), listRecipeItems(orgId), listIngredients(orgId), listPurchases(orgId, bounds.start, bounds.end),
      ])
      setRecipes(recipeRows); setRecipeItems(itemRows); setIngredients(ingredientRows); setPurchases(purchaseRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as receitas.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [month])

  const ingredientMap = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])), [ingredients])
  const purchasesMap = useMemo(() => {
    const map = new Map<string, IngredientPurchase[]>()
    purchases.forEach((purchase) => map.set(purchase.ingredient_id, [...(map.get(purchase.ingredient_id) ?? []), purchase]))
    return map
  }, [purchases])
  const averages = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, averagePurchaseCost(ingredient, purchasesMap.get(ingredient.id) ?? [])])), [ingredients, purchasesMap])
  const itemsByRecipe = useMemo(() => {
    const map = new Map<string, RecipeItem[]>()
    recipeItems.forEach((item) => map.set(item.recipe_id, [...(map.get(item.recipe_id) ?? []), item]))
    return map
  }, [recipeItems])

  function storedItemCost(item: RecipeItem) {
    const ingredient = ingredientMap.get(item.ingredient_id)
    if (!ingredient) return null
    return itemCost({ quantity: String(item.quantity), recipeUnit: item.recipe_unit, manualConversionQuantity: item.manual_conversion_quantity == null ? '' : String(item.manual_conversion_quantity), manualConversionUnit: item.manual_conversion_unit ?? item.recipe_unit }, ingredient, averages.get(ingredient.id) ?? null).cost
  }

  function recipeCost(recipe: Recipe) {
    let total = 0
    let incomplete = 0
    for (const item of itemsByRecipe.get(recipe.id) ?? []) {
      const cost = storedItemCost(item)
      if (cost == null) incomplete += 1
      else total += cost
    }
    return { total, perYield: recipe.yield_quantity > 0 ? total / recipe.yield_quantity : 0, incomplete }
  }

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return query ? recipes.filter((recipe) => recipe.name.toLocaleLowerCase('pt-BR').includes(query)) : recipes
  }, [recipes, search])

  function openNew() {
    setEditingRecipe(null)
    setDraft({ ...emptyDraft, items: ingredients[0] ? [newItem(ingredients[0].id, ingredients[0].purchase_unit)] : [] })
    setModalOpen(true); setError(null)
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe)
    setDraft({
      name: recipe.name,
      yieldQuantity: String(recipe.yield_quantity),
      yieldUnit: recipe.yield_unit,
      notes: recipe.notes ?? '',
      items: (itemsByRecipe.get(recipe.id) ?? []).map((item) => ({
        key: item.id,
        ingredientId: item.ingredient_id,
        quantity: String(item.quantity),
        recipeUnit: item.recipe_unit,
        manualConversionQuantity: item.manual_conversion_quantity == null ? '' : String(item.manual_conversion_quantity),
        manualConversionUnit: item.manual_conversion_unit ?? item.recipe_unit,
      })),
    })
    setModalOpen(true); setError(null)
  }

  function updateDraftItem(key: string, changes: Partial<ItemDraft>) {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.key === key ? { ...item, ...changes } : item) }))
  }

  const draftSummary = useMemo(() => {
    let total = 0; let incomplete = 0
    const rows = draft.items.map((item) => {
      const ingredient = ingredientMap.get(item.ingredientId)
      if (!ingredient) return { item, ingredient: null, cost: null, status: 'Selecione um insumo' }
      const result = itemCost(item, ingredient, averages.get(ingredient.id) ?? null)
      if (result.cost == null) incomplete += 1
      else total += result.cost
      return { item, ingredient, ...result }
    })
    const yieldQuantity = parseNumber(draft.yieldQuantity)
    return { rows, total, incomplete, perYield: yieldQuantity > 0 ? total / yieldQuantity : 0 }
  }, [draft, ingredientMap, averages])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!organizationId) return
    const yieldQuantity = parseNumber(draft.yieldQuantity)
    if (!draft.name.trim() || !(yieldQuantity > 0) || !draft.items.length) { setError('Preencha nome, rendimento e pelo menos um ingrediente.'); return }
    const items: RecipeItemInput[] = []
    for (const row of draftSummary.rows) {
      const quantity = parseNumber(row.item.quantity)
      if (!row.ingredient || !(quantity > 0)) { setError('Revise os ingredientes e as quantidades.'); return }
      const auto = convertQuantity(quantity, row.item.recipeUnit, row.ingredient.purchase_unit)
      const manual = parseNumber(row.item.manualConversionQuantity)
      if (auto == null && (!(manual > 0) || row.item.manualConversionUnit !== row.item.recipeUnit)) {
        setError(`Informe a equivalência manual de ${row.ingredient.name}.`); return
      }
      items.push({
        ingredient_id: row.ingredient.id,
        quantity,
        recipe_unit: row.item.recipeUnit,
        manual_conversion_quantity: auto == null ? manual : null,
        manual_conversion_unit: auto == null ? row.item.manualConversionUnit : null,
      })
    }
    setSaving(true); setError(null)
    try {
      const payload = { organizationId, name: draft.name, yieldQuantity, yieldUnit: draft.yieldUnit, notes: draft.notes, items }
      if (editingRecipe) await updateRecipe({ id: editingRecipe.id, ...payload })
      else await createRecipe(payload)
      setModalOpen(false); setSuccess(editingRecipe ? 'Receita atualizada.' : 'Receita cadastrada.'); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar a receita.') }
    finally { setSaving(false) }
  }

  async function remove(recipe: Recipe) {
    if (!confirm(`Excluir a receita “${recipe.name}”?`)) return
    try { await deleteRecipe(recipe.id); setSuccess('Receita excluída.'); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir a receita.') }
  }

  return <div className="page-container">
    <PageHeader eyebrow="Engenharia de custos" title="Receitas" description="Monte preparos reutilizáveis e acompanhe o custo por rendimento em cada mês." actions={<><label className="month-control"><CalendarDays size={16}/><input type="month" value={month} onChange={(e)=>setMonth(e.target.value)}/></label><Button onClick={openNew} icon={<Plus size={17}/>}>Nova receita</Button></>} />
    {success && <div className="notice notice-success">{success}<button onClick={()=>setSuccess(null)}><X size={16}/></button></div>}
    {error && !modalOpen && <div className="notice notice-error">{error}<button onClick={()=>setError(null)}><X size={16}/></button></div>}

    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top"><span>Receitas ativas</span><div className="stat-icon"><ChefHat size={19}/></div></div><strong>{recipes.length}</strong><small>preparos cadastrados</small></div>
      <div className="stat-card"><div className="stat-top"><span>Com custo completo</span><div className="stat-icon"><RefreshCw size={19}/></div></div><strong>{recipes.filter((r)=>recipeCost(r).incomplete===0 && (itemsByRecipe.get(r.id)?.length??0)>0).length}</strong><small>no mês selecionado</small></div>
      <div className="stat-card"><div className="stat-top"><span>Precisam de revisão</span><div className="stat-icon"><AlertTriangle size={19}/></div></div><strong>{recipes.filter((r)=>recipeCost(r).incomplete>0 || !(itemsByRecipe.get(r.id)?.length)).length}</strong><small>sem preço ou composição</small></div>
      <div className="stat-card"><div className="stat-top"><span>Insumos disponíveis</span><div className="stat-icon"><Plus size={19}/></div></div><strong>{ingredients.length}</strong><small>para usar nas receitas</small></div>
    </div>

    <section className="panel">
      <div className="table-toolbar"><div className="search-box table-search"><Search size={17}/><input placeholder="Buscar receita..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div><Button variant="secondary" onClick={()=>void load()} icon={<RefreshCw size={16}/>}>Atualizar</Button></div>
      {loading ? <div className="table-message">Carregando receitas…</div> : !filteredRecipes.length ? <div className="empty-state compact"><ChefHat size={38}/><h2>Nenhuma receita cadastrada</h2><p>Crie a primeira receita e vincule os ingredientes existentes na aba Insumos.</p><Button onClick={openNew} icon={<Plus size={16}/>}>Nova receita</Button></div> : <div className="recipe-grid">{filteredRecipes.map((recipe)=>{const cost=recipeCost(recipe); const count=itemsByRecipe.get(recipe.id)?.length??0; return <article className="recipe-card" key={recipe.id} onClick={()=>openEdit(recipe)}><div className="recipe-card-top"><div className="recipe-card-icon"><ChefHat size={20}/></div><div className="row-actions"><button className="icon-action" onClick={(e)=>{e.stopPropagation();openEdit(recipe)}} title="Editar"><Pencil size={15}/></button><button className="icon-action danger" onClick={(e)=>{e.stopPropagation();void remove(recipe)}} title="Excluir"><Trash2 size={15}/></button></div></div><h3>{recipe.name}</h3><p>{count} ingrediente{count===1?'':'s'} · rende {recipe.yield_quantity.toLocaleString('pt-BR')} {recipe.yield_unit}</p><div className="recipe-cost-row"><span>Custo do preparo<strong>{money(cost.total)}</strong></span><span>Custo por {recipe.yield_unit.replace(/s$/,'')}<strong>{money(cost.perYield)}</strong></span></div>{cost.incomplete>0 && <div className="recipe-warning"><AlertTriangle size={14}/>{cost.incomplete} ingrediente(s) sem custo calculável</div>}</article>})}</div>}
    </section>

    {modalOpen && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setModalOpen(false)}}><form className="modal-card modal-wide recipe-modal" onSubmit={submit}><button className="modal-close" type="button" onClick={()=>setModalOpen(false)}><X size={18}/></button><h2>{editingRecipe?'Editar receita':'Nova receita'}</h2><p className="modal-description">A unidade de compra vem dos Insumos. Aqui você informa a quantidade e a unidade usada no preparo.</p>{error && <div className="notice notice-error">{error}<button type="button" onClick={()=>setError(null)}><X size={16}/></button></div>}
      <div className="form-grid"><label>Nome da receita<input value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} placeholder="Ex.: Arroz branco"/></label><label>Quantidade produzida<input inputMode="decimal" value={draft.yieldQuantity} onChange={(e)=>setDraft({...draft,yieldQuantity:e.target.value})}/></label><label>Unidade do rendimento<select value={draft.yieldUnit} onChange={(e)=>setDraft({...draft,yieldUnit:e.target.value})}>{yieldUnits.map((u)=><option key={u}>{u}</option>)}</select></label><label className="form-span">Observações<input value={draft.notes} onChange={(e)=>setDraft({...draft,notes:e.target.value})} placeholder="Opcional"/></label></div>
      <div className="recipe-editor-heading"><div><span className="eyebrow">Composição</span><h3>Ingredientes</h3></div><Button type="button" variant="secondary" onClick={()=>setDraft({...draft,items:[...draft.items,newItem(ingredients[0]?.id??'',ingredients[0]?.purchase_unit??'g')]})} icon={<Plus size={16}/>}>Adicionar ingrediente</Button></div>
      {!draft.items.length ? <div className="empty-state compact"><p>Adicione pelo menos um ingrediente.</p></div> : <div className="recipe-items-editor">{draftSummary.rows.map(({item,ingredient,cost,status})=><div className="recipe-item-row" key={item.key}><label>Insumo<select value={item.ingredientId} onChange={(e)=>{const next=ingredientMap.get(e.target.value);updateDraftItem(item.key,{ingredientId:e.target.value,recipeUnit:next?.purchase_unit??item.recipeUnit,manualConversionUnit:next?.purchase_unit??item.recipeUnit})}}><option value="">Selecione</option>{ingredients.map((i)=><option key={i.id} value={i.id}>{i.name}</option>)}</select><small>Compra: {ingredient?.purchase_unit??'—'}</small></label><label>Quantidade<input inputMode="decimal" value={item.quantity} onChange={(e)=>updateDraftItem(item.key,{quantity:e.target.value})}/></label><label>Unidade da receita<select value={item.recipeUnit} onChange={(e)=>updateDraftItem(item.key,{recipeUnit:e.target.value,manualConversionUnit:e.target.value})}>{recipeUnits.map((u)=><option key={u}>{u}</option>)}</select></label>{ingredient && convertQuantity(1,item.recipeUnit,ingredient.purchase_unit)==null ? <label>Equivalência manual<div className="conversion-inline"><span>1 {ingredient.purchase_unit} =</span><input inputMode="decimal" value={item.manualConversionQuantity} onChange={(e)=>updateDraftItem(item.key,{manualConversionQuantity:e.target.value})}/><select value={item.manualConversionUnit} onChange={(e)=>updateDraftItem(item.key,{manualConversionUnit:e.target.value})}>{recipeUnits.map((u)=><option key={u}>{u}</option>)}</select></div></label> : <div className="automatic-conversion">Conversão automática</div>}<div className="recipe-item-cost"><small>{status}</small><strong>{cost==null?'—':money(cost)}</strong></div><button type="button" className="icon-action danger" onClick={()=>setDraft({...draft,items:draft.items.filter((current)=>current.key!==item.key)})}><Trash2 size={15}/></button></div>)}</div>}
      <div className="recipe-summary"><span>Custo total<strong>{money(draftSummary.total)}</strong></span><span>Rendimento<strong>{parseNumber(draft.yieldQuantity)>0?`${parseNumber(draft.yieldQuantity).toLocaleString('pt-BR')} ${draft.yieldUnit}`:'—'}</strong></span><span className="highlight">Custo por rendimento<strong>{money(draftSummary.perYield)}</strong></span></div>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={()=>setModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar receita'}</Button></div>
    </form></div>}
  </div>
}
