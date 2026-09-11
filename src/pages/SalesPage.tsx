import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { CalendarDays, FileUp, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { getCurrentOrganizationId } from '../services/organization'
import { createMenuItem, listMenuItems } from '../services/menu'
import { createSale, createSales, deleteSale, listSales } from '../services/sales'
import type { MenuItem } from '../types/menu'
import type { Sale, SaleChannel } from '../types/sales'

const CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'counter', label: 'Balcao' },
  { value: 'ifood', label: 'iFood' },
  { value: 'bysell', label: 'BySell' },
  { value: 'other', label: 'Outros' },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

type ParsedRow = { product: string; quantity: number; total: number }

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sep = lines[0].indexOf(';') >= 0 ? ';' : ','
  const rows: ParsedRow[] = []
  lines.forEach((line, idx) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
    if (idx === 0 && /produto|item|nome/i.test(cols[0] ?? '')) return
    const product = cols[0] ?? ''
    if (!product) return
    const quantity = parseFloat((cols[1] ?? '').replace(',', '.'))
    const total = parseFloat((cols[2] ?? '').replace(',', '.'))
    rows.push({ product, quantity: isNaN(quantity) ? 1 : quantity, total: isNaN(total) ? 0 : total })
  })
  return rows
}

export function SalesPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [date, setDate] = useState(today())
  const [channel, setChannel] = useState<SaleChannel>('counter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualItemId, setManualItemId] = useState('')
  const [manualQty, setManualQty] = useState('1')
  const [manualTotal, setManualTotal] = useState('')
  const [importRows, setImportRows] = useState<ParsedRow[]>([])
  const [pendingRows, setPendingRows] = useState<ParsedRow[]>([])
  const [linkMap, setLinkMap] = useState<Record<string, string>>({})
  const [createNames, setCreateNames] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const res = await Promise.all([listSales(organizationId, date, date), listMenuItems(organizationId)])
      setSales(res[0])
      setMenuItems(res[1])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar vendas.')
    } finally {
      setLoading(false)
    }
  }, [organizationId, date])

  useEffect(() => {
    getCurrentOrganizationId().then(setOrganizationId).catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar organizacao.'))
  }, [])

  useEffect(() => { void load() }, [load])

  async function submitManual(e: FormEvent) {
    e.preventDefault()
    if (!organizationId || !manualItemId) return
    setError(null)
    try {
      await createSale({ sale_date: date, menu_item_id: manualItemId, channel, quantity: parseFloat(manualQty) || 1, total_amount: parseFloat(manualTotal) || 0, source: 'manual' })
      setManualItemId('')
      setManualQty('1')
      setManualTotal('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao lancar venda.')
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''))
      const lookup: Record<string, string> = {}
      menuItems.forEach((m) => { lookup[normalize(m.name)] = m.id })
      const links: Record<string, string> = {}
      rows.forEach((r) => { const id = lookup[normalize(r.product)]; if (id) links[r.product] = id })
      setImportRows(rows)
      setLinkMap(links)
      setPendingRows(rows.filter((r) => !links[r.product]))
      setResultMsg(null)
      setError(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!organizationId) return
    setImporting(true)
    setError(null)
    try {
      const toCreate = pendingRows.filter((r) => linkMap[r.product] === '__create__')
      for (const r of toCreate) {
        await createMenuItem({ organizationId, name: (createNames[r.product] ?? r.product).trim() || r.product, category: 'Outros', counterPrice: null, ifoodPrice: null, bysellPrice: null, components: [] })
      }
      const fresh = await listMenuItems(organizationId)
      const lookup: Record<string, string> = {}
      fresh.forEach((m) => { lookup[normalize(m.name)] = m.id })
      const finalLinks = { ...linkMap }
      toCreate.forEach((r) => {
        const name = (createNames[r.product] ?? r.product).trim() || r.product
        const id = lookup[normalize(name)]
        if (id) finalLinks[r.product] = id
      })
      const inputs = importRows.filter((r) => finalLinks[r.product] && finalLinks[r.product] !== '__create__').map((r) => ({ sale_date: date, menu_item_id: finalLinks[r.product], channel, quantity: r.quantity, total_amount: r.total, source: 'import' as const }))
      if (inputs.length > 0) await createSales(inputs)
      const skipped = importRows.length - inputs.length
      setResultMsg(skipped > 0 ? inputs.length + ' venda(s) importada(s). ' + skipped + ' linha(s) sem link foram ignoradas.' : inputs.length + ' venda(s) importada(s) com sucesso.')
      setPendingRows([])
      setImportRows([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar vendas.')
    } finally {
      setImporting(false)
    }
  }

  async function removeSale(id: string) {
    if (!window.confirm('Excluir esta venda?')) return
    try { await deleteSale(id); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao excluir venda.') }
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Vendas" title="Vendas" description="Vendas por produto, canal e periodo." actions={<Button icon={<RefreshCw size={16} />} onClick={() => void load()}>Atualizar</Button>} />
      {error && <div className="notice notice-error">{error}<button type="button" onClick={() => setError(null)}><X size={16} /></button></div>}
      {resultMsg && <div className="notice">{resultMsg}<button type="button" onClick={() => setResultMsg(null)}><X size={16} /></button></div>}
      <section className="panel">
        <div className="table-toolbar">
          <label className="month-control"><CalendarDays size={16} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <select className="select-control" value={channel} onChange={(e) => setChannel(e.target.value as SaleChannel)}>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="search-box table-search"><Search size={16} /><input placeholder="Buscar em vendas" /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Item</th><th>Canal</th><th>Qtd</th><th>Total</th><th>Origem</th><th></th></tr></thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><h2>Nenhuma venda neste dia</h2><p>Lance manualmente abaixo ou importe um CSV.</p></div></td></tr>
              ) : sales.map((s) => (
                <tr key={s.id}>
                  <td>{s.sale_date}</td>
                  <td>{s.menu_item?.name ?? '-'}</td>
                  <td>{CHANNELS.filter((c) => c.value === s.channel).map((c) => c.label)[0] ?? s.channel}</td>
                  <td>{s.quantity}</td>
                  <td>{s.total_amount.toFixed(2)}</td>
                  <td>{s.source === 'import' ? 'Importacao' : 'Manual'}</td>
                  <td><button className="text-button" type="button" onClick={() => void removeSale(s.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Lancamento manual</h2>
        <form className="modal-card modal-wide" onSubmit={submitManual}>
          <label>Item do cardapio
            <select className="select-control" value={manualItemId} onChange={(e) => setManualItemId(e.target.value)} required>
              <option value="">Selecione...</option>
              {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label>Quantidade<input type="number" min="0" step="any" value={manualQty} onChange={(e) => setManualQty(e.target.value)} /></label>
          <label>Total (R$)<input type="number" min="0" step="any" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} required /></label>
          <Button icon={<Plus size={16} />}>Lancar venda</Button>
        </form>
      </section>
      <section className="panel">
        <h2>Importar CSV</h2>
        <p>O CSV deve ter as colunas: <strong>produto, quantidade, total</strong>. Selecione o dia e o canal antes de importar.</p>
        <label className="file-input"><FileUp size={16} /><input type="file" accept=".csv,.txt" onChange={handleFile} /></label>
        {importRows.length > 0 && <div><p><strong>{importRows.length}</strong> linha(s) lida(s) do arquivo.</p><Button onClick={() => void confirmImport()} disabled={importing}>Importar {importRows.length} venda(s)</Button></div>}
      </section>
      {pendingRows.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-card modal-wide">
            <div className="modal-header"><h2>Vincular itens ao cardapio</h2><button className="modal-close" type="button" onClick={() => setPendingRows([])}><X size={18} /></button></div>
            <p>Estes produtos do CSV nao foram encontrados no cardapio. Vincule a um item existente, crie um novo, ou deixe sem link (a linha sera ignorada com aviso).</p>
            {pendingRows.map((r) => (
              <div key={r.product} className="modal-row">
                <div><strong>{r.product}</strong><span>qtd {r.quantity} - total {r.total.toFixed(2)}</span></div>
                <select className="select-control" value={linkMap[r.product] ?? ''} onChange={(e) => setLinkMap({ ...linkMap, [r.product]: e.target.value })}>
                  <option value="">- deixar sem link (ignorar) -</option>
                  <option value="__create__">Criar novo item no cardapio</option>
                  {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {linkMap[r.product] === '__create__' && <input className="input-control" value={createNames[r.product] ?? r.product} onChange={(e) => setCreateNames({ ...createNames, [r.product]: e.target.value })} />}
              </div>
            ))}
            <div className="modal-actions"><Button onClick={() => void confirmImport()} disabled={importing}>{importing ? 'Importando...' : 'Confirmar importacao'}</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}