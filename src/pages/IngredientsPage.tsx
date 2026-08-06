import { CalendarDays, Download, History, PackagePlus, Pencil, Plus, RefreshCw, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { getCurrentOrganizationId } from '../services/organization'
import { addPurchase, createIngredientWithPurchase, deleteIngredient, deletePurchase, listIngredients, listPurchases, updatePurchase } from '../services/ingredients'
import type { Ingredient, IngredientPurchase } from '../types/ingredients'

const units = ['kg', 'g', 'mg', 'L', 'ml', 'un', 'caixa', 'pacote', 'saco', 'fardo', 'garrafa', 'lata', 'maço']
const categories = ['Hortifruti', 'Carnes e embutidos', 'Laticínios', 'Mercearia', 'Bebidas', 'Congelados', 'Embalagens', 'Limpeza', 'Outros']

type ModalMode = 'new' | 'purchase' | 'history' | 'edit-purchase' | null

type PurchaseForm = {
  purchaseDate: string
  quantity: string
  purchaseUnit: string
  totalAmount: string
  supplier: string
}

type IngredientForm = PurchaseForm & {
  name: string
  category: string
}

const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)

function parseNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed
  return Number(normalized)
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = `${month}-01`
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const end = `${month}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function compatibleQuantity(quantity: number, from: string, to: string): number | null {
  if (from === to) return quantity
  const weight: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 }
  const volume: Record<string, number> = { ml: 1, L: 1000 }
  if (from in weight && to in weight) return quantity * weight[from] / weight[to]
  if (from in volume && to in volume) return quantity * volume[from] / volume[to]
  return null
}

function weightedAverage(ingredient: Ingredient, purchases: IngredientPurchase[]) {
  let totalAmount = 0
  let totalQuantity = 0
  let incompatible = 0
  purchases.forEach((purchase) => {
    const converted = compatibleQuantity(purchase.quantity, purchase.purchase_unit, ingredient.purchase_unit)
    if (converted === null) {
      incompatible += 1
      return
    }
    totalAmount += purchase.total_amount
    totalQuantity += converted
  })
  return {
    average: totalQuantity > 0 ? totalAmount / totalQuantity : null,
    totalAmount,
    totalQuantity,
    incompatible,
  }
}

const emptyIngredientForm: IngredientForm = {
  name: '', category: 'Outros', purchaseDate: today, quantity: '', purchaseUnit: 'kg', totalAmount: '', supplier: '',
}

export function IngredientsPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<IngredientPurchase | null>(null)
  const [ingredientForm, setIngredientForm] = useState<IngredientForm>(emptyIngredientForm)
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>({ purchaseDate: today, quantity: '', purchaseUnit: 'kg', totalAmount: '', supplier: '' })

  async function load() {
    setLoading(true); setError(null)
    try {
      const orgId = organizationId ?? await getCurrentOrganizationId()
      setOrganizationId(orgId)
      const bounds = monthBounds(month)
      const [ingredientRows, purchaseRows] = await Promise.all([
        listIngredients(orgId),
        listPurchases(orgId, bounds.start, bounds.end),
      ])
      setIngredients(ingredientRows)
      setPurchases(purchaseRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os insumos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [month])

  const purchasesByIngredient = useMemo(() => {
    const map = new Map<string, IngredientPurchase[]>()
    purchases.forEach((purchase) => map.set(purchase.ingredient_id, [...(map.get(purchase.ingredient_id) ?? []), purchase]))
    return map
  }, [purchases])

  const filteredIngredients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return query ? ingredients.filter((ingredient) => `${ingredient.name} ${ingredient.category ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)) : ingredients
  }, [ingredients, search])

  function closeModal() {
    setModal(null); setSelectedIngredient(null); setSelectedPurchase(null); setError(null)
  }

  function openNew() {
    setIngredientForm({ ...emptyIngredientForm, purchaseDate: `${month}-01` })
    setModal('new')
  }

  function openPurchase(ingredient: Ingredient) {
    setSelectedIngredient(ingredient)
    setPurchaseForm({ purchaseDate: `${month}-01`, quantity: '', purchaseUnit: ingredient.purchase_unit, totalAmount: '', supplier: '' })
    setModal('purchase')
  }

  function openHistory(ingredient: Ingredient) {
    setSelectedIngredient(ingredient); setModal('history')
  }

  function openEditPurchase(purchase: IngredientPurchase) {
    setSelectedPurchase(purchase)
    setPurchaseForm({ purchaseDate: purchase.purchase_date, quantity: String(purchase.quantity).replace('.', ','), purchaseUnit: purchase.purchase_unit, totalAmount: String(purchase.total_amount).replace('.', ','), supplier: purchase.supplier ?? '' })
    setModal('edit-purchase')
  }

  async function submitNew(event: FormEvent) {
    event.preventDefault()
    if (!organizationId) return
    const quantity = parseNumber(ingredientForm.quantity)
    const totalAmount = parseNumber(ingredientForm.totalAmount)
    if (!ingredientForm.name.trim() || !ingredientForm.purchaseDate || quantity <= 0 || totalAmount < 0) {
      setError('Preencha nome, data, quantidade e valor corretamente.'); return
    }
    setSaving(true); setError(null)
    try {
      await createIngredientWithPurchase({
        organizationId,
        name: ingredientForm.name,
        category: ingredientForm.category,
        purchaseUnit: ingredientForm.purchaseUnit,
        purchaseDate: ingredientForm.purchaseDate,
        quantity,
        totalAmount,
        supplier: ingredientForm.supplier,
      })
      setSuccess('Insumo e primeira compra adicionados.'); closeModal(); await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar o insumo.')
    } finally { setSaving(false) }
  }

  async function submitPurchase(event: FormEvent) {
    event.preventDefault()
    if (!organizationId || !selectedIngredient) return
    const quantity = parseNumber(purchaseForm.quantity)
    const totalAmount = parseNumber(purchaseForm.totalAmount)
    if (!purchaseForm.purchaseDate || quantity <= 0 || totalAmount < 0) { setError('Preencha data, quantidade e valor corretamente.'); return }
    setSaving(true); setError(null)
    try {
      await addPurchase({ organization_id: organizationId, ingredient_id: selectedIngredient.id, purchase_date: purchaseForm.purchaseDate, quantity, purchase_unit: purchaseForm.purchaseUnit, total_amount: totalAmount, supplier: purchaseForm.supplier.trim() || null })
      setSuccess('Compra adicionada e média ponderada recalculada.'); closeModal(); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível adicionar a compra.') }
    finally { setSaving(false) }
  }

  async function submitEditPurchase(event: FormEvent) {
    event.preventDefault()
    if (!selectedPurchase) return
    const quantity = parseNumber(purchaseForm.quantity)
    const totalAmount = parseNumber(purchaseForm.totalAmount)
    if (!purchaseForm.purchaseDate || quantity <= 0 || totalAmount < 0) { setError('Preencha data, quantidade e valor corretamente.'); return }
    setSaving(true); setError(null)
    try {
      await updatePurchase(selectedPurchase.id, { purchase_date: purchaseForm.purchaseDate, quantity, purchase_unit: purchaseForm.purchaseUnit, total_amount: totalAmount, supplier: purchaseForm.supplier.trim() || null })
      setSuccess('Compra atualizada.'); closeModal(); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar a compra.') }
    finally { setSaving(false) }
  }

  async function removePurchase(purchase: IngredientPurchase) {
    if (!window.confirm('Excluir esta compra do histórico?')) return
    try { await deletePurchase(purchase.id); setSuccess('Compra excluída.'); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir a compra.') }
  }

  async function removeIngredient(ingredient: Ingredient) {
    if (!window.confirm(`Excluir o insumo “${ingredient.name}” e todo o histórico de compras?`)) return
    try { await deleteIngredient(ingredient.id); setSuccess('Insumo excluído.'); await load() }
    catch (err) { setError(err instanceof Error ? `${err.message}. O insumo pode estar vinculado a uma receita.` : 'Não foi possível excluir o insumo.') }
  }

  function exportCsv() {
    const rows = [['insumo','categoria','data','quantidade','unidade','valor_total','fornecedor']]
    purchases.forEach((purchase) => {
      const ingredient = ingredients.find((item) => item.id === purchase.ingredient_id)
      rows.push([ingredient?.name ?? '', ingredient?.category ?? '', purchase.purchase_date, String(purchase.quantity), purchase.purchase_unit, String(purchase.total_amount).replace('.', ','), purchase.supplier ?? ''])
    })
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `insumos-${month}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }

  const selectedHistory = selectedIngredient ? purchasesByIngredient.get(selectedIngredient.id) ?? [] : []

  return <div className="page-container">
    <PageHeader eyebrow="Engenharia de custos" title="Insumos" description="Cadastre compras, acompanhe o histórico e calcule o preço médio ponderado mensal." actions={<><label className="month-control"><CalendarDays size={16}/><input type="month" value={month} onChange={(event)=>setMonth(event.target.value)}/></label><Button variant="secondary" icon={<Download size={16}/>} onClick={exportCsv}>Exportar</Button><Button icon={<Plus size={17}/>} onClick={openNew}>Novo insumo</Button></>} />

    {success && <div className="notice notice-success">{success}<button onClick={()=>setSuccess(null)}><X size={15}/></button></div>}
    {error && !modal && <div className="notice notice-error">{error}<button onClick={()=>setError(null)}><X size={15}/></button></div>}

    <section className="panel">
      <div className="table-toolbar">
        <div className="search-box table-search"><Search size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar por insumo ou categoria"/></div>
        <Button variant="ghost" icon={<RefreshCw size={16}/>} onClick={()=>void load()} disabled={loading}>Atualizar</Button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th>Categoria</th><th>Unidade de compra</th><th>Compras no mês</th><th>Preço médio ponderado</th><th>Ações</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}><div className="table-message">Carregando insumos…</div></td></tr>}
            {!loading && filteredIngredients.length === 0 && <tr><td colSpan={6}><div className="empty-state compact"><PackagePlus size={32}/><h2>Nenhum insumo encontrado</h2><p>Adicione o primeiro insumo e sua compra inicial.</p><Button onClick={openNew}>Novo insumo</Button></div></td></tr>}
            {!loading && filteredIngredients.map((ingredient) => {
              const itemPurchases = purchasesByIngredient.get(ingredient.id) ?? []
              const stats = weightedAverage(ingredient, itemPurchases)
              return <tr key={ingredient.id}>
                <td><strong>{ingredient.name}</strong>{stats.incompatible > 0 && <small className="row-warning">{stats.incompatible} compra(s) com unidade incompatível</small>}</td>
                <td>{ingredient.category || 'Outros'}</td>
                <td><span className="unit-pill">{ingredient.purchase_unit}</span></td>
                <td>{itemPurchases.length}</td>
                <td>{stats.average === null ? '—' : <strong>{money(stats.average)} / {ingredient.purchase_unit}</strong>}</td>
                <td><div className="row-actions"><Button variant="secondary" icon={<History size={14}/>} onClick={()=>openHistory(ingredient)}>Histórico</Button><Button variant="secondary" icon={<ShoppingCart size={14}/>} onClick={()=>openPurchase(ingredient)}>Compra</Button><button className="icon-action danger" title="Excluir insumo" onClick={()=>void removeIngredient(ingredient)}><Trash2 size={15}/></button></div></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </section>

    {modal && <div className="modal-backdrop" onMouseDown={(event)=>{if(event.currentTarget===event.target) closeModal()}}>
      <div className={`modal-card ${modal === 'history' ? 'modal-wide' : ''}`}>
        <button className="modal-close" onClick={closeModal}><X size={18}/></button>
        {modal === 'new' && <form onSubmit={submitNew}><h2>Novo insumo e primeira compra</h2><p className="modal-description">Informe apenas como o insumo foi comprado. A unidade usada no preparo será definida nas receitas.</p><div className="form-grid">
          <label>Nome<input value={ingredientForm.name} onChange={(event)=>setIngredientForm({...ingredientForm,name:event.target.value})} autoFocus/></label>
          <label>Categoria<select value={ingredientForm.category} onChange={(event)=>setIngredientForm({...ingredientForm,category:event.target.value})}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label>
          <label>Data da compra<input type="date" value={ingredientForm.purchaseDate} onChange={(event)=>setIngredientForm({...ingredientForm,purchaseDate:event.target.value})}/></label>
          <label>Quantidade comprada<input inputMode="decimal" value={ingredientForm.quantity} onChange={(event)=>setIngredientForm({...ingredientForm,quantity:event.target.value})}/></label>
          <label>Unidade da compra<select value={ingredientForm.purchaseUnit} onChange={(event)=>setIngredientForm({...ingredientForm,purchaseUnit:event.target.value})}>{units.map((item)=><option key={item}>{item}</option>)}</select></label>
          <label>Valor total pago<input inputMode="decimal" value={ingredientForm.totalAmount} onChange={(event)=>setIngredientForm({...ingredientForm,totalAmount:event.target.value})}/></label>
          <label className="form-span">Fornecedor<input value={ingredientForm.supplier} onChange={(event)=>setIngredientForm({...ingredientForm,supplier:event.target.value})}/></label>
        </div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando…':'Adicionar'}</Button></div></form>}

        {modal === 'purchase' && selectedIngredient && <form onSubmit={submitPurchase}><h2>Nova compra</h2><p className="modal-description"><strong>{selectedIngredient.name}</strong> · unidade principal {selectedIngredient.purchase_unit}</p><PurchaseFields form={purchaseForm} setForm={setPurchaseForm}/>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando…':'Adicionar compra'}</Button></div></form>}

        {modal === 'edit-purchase' && selectedPurchase && <form onSubmit={submitEditPurchase}><h2>Editar compra</h2><p className="modal-description">A média ponderada será recalculada após salvar.</p><PurchaseFields form={purchaseForm} setForm={setPurchaseForm}/>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar alterações'}</Button></div></form>}

        {modal === 'history' && selectedIngredient && <><h2>Histórico de {selectedIngredient.name}</h2><p className="modal-description">Compras da competência {month.split('-').reverse().join('/')}.</p>{selectedHistory.length===0?<div className="empty-state compact"><History size={32}/><h2>Sem compras neste mês</h2><Button onClick={()=>openPurchase(selectedIngredient)}>Adicionar compra</Button></div>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Quantidade</th><th>Valor total</th><th>Preço unitário</th><th>Fornecedor</th><th>Ações</th></tr></thead><tbody>{selectedHistory.map((purchase)=><tr key={purchase.id}><td>{new Date(`${purchase.purchase_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>{purchase.quantity.toLocaleString('pt-BR')} {purchase.purchase_unit}</td><td>{money(purchase.total_amount)}</td><td>{money(purchase.total_amount/purchase.quantity)} / {purchase.purchase_unit}</td><td>{purchase.supplier||'—'}</td><td><div className="row-actions"><button className="icon-action" onClick={()=>openEditPurchase(purchase)} title="Editar compra"><Pencil size={15}/></button><button className="icon-action danger" onClick={()=>void removePurchase(purchase)} title="Excluir compra"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}<div className="modal-actions"><Button variant="secondary" onClick={()=>openPurchase(selectedIngredient)} icon={<Plus size={16}/>}>Nova compra</Button><Button variant="ghost" onClick={closeModal}>Fechar</Button></div></>}
      </div>
    </div>}
  </div>
}

function PurchaseFields({ form, setForm }: { form: PurchaseForm; setForm: (form: PurchaseForm) => void }) {
  return <div className="form-grid">
    <label>Data da compra<input type="date" value={form.purchaseDate} onChange={(event)=>setForm({...form,purchaseDate:event.target.value})}/></label>
    <label>Quantidade comprada<input inputMode="decimal" value={form.quantity} onChange={(event)=>setForm({...form,quantity:event.target.value})}/></label>
    <label>Unidade da compra<select value={form.purchaseUnit} onChange={(event)=>setForm({...form,purchaseUnit:event.target.value})}>{units.map((item)=><option key={item}>{item}</option>)}</select></label>
    <label>Valor total pago<input inputMode="decimal" value={form.totalAmount} onChange={(event)=>setForm({...form,totalAmount:event.target.value})}/></label>
    <label className="form-span">Fornecedor<input value={form.supplier} onChange={(event)=>setForm({...form,supplier:event.target.value})}/></label>
  </div>
}
