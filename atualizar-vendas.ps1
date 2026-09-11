$ErrorActionPreference = "Stop"
cd "C:\Users\anabe\OneDrive\Documentos\Ana\cia_manager_react_v1"
$enc = New-Object System.Text.UTF8Encoding($false)

$page = @'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
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

function channelLabel(value: SaleChannel) {
  for (const c of CHANNELS) if (c.value === value) return c.label
  return value
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

type ParsedRow = { product: string; quantity: number; total: number }

function toNumber(value: unknown): number {
  if (value == null) return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const raw = String(value).trim()
  if (!raw) return 0
  const cleaned = raw.replace(/\s/g, '').replace(/R\$/g, '')
  const normalized = cleaned.indexOf(',') >= 0 ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sep = lines[0].indexOf(';') >= 0 ? ';' : ','
  const rows: ParsedRow[] = []
  lines.forEach((line, idx) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
    if (idx === 0 && /produto|item|nome|descricao/i.test(cols[0] ?? '')) return
    const product = cols[0] ?? ''
    if (!product) return
    rows.push({ product, quantity: toNumber(cols[1]) || 1, total: toNumber(cols[2]) })
  })
  return rows
}

function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const rows: ParsedRow[] = []
  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name]
    if (!sheet) return
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    json.forEach((row) => {
      const keys = Object.keys(row)
      if (keys.length === 0) return
      const pick = (candidates: string[], index: number) => {
        for (const c of candidates) {
          const found = keys.filter((k) => normalize(k) === c)[0]
          if (found) return row[found]
        }
        return keys[index] ? row[keys[index]] : ''
      }
      const product = String(pick(['produto', 'item', 'nome', 'descricao'], 0) ?? '').trim()
      if (!product) return
      rows.push({
        product,
        quantity: toNumber(pick(['quantidade', 'qtd', 'qtde'], 1)) || 1,
        total: toNumber(pick(['total', 'valor', 'valor total', 'receita'], 2)),
      })
    })
  })
  return rows
}

function isBinaryWorkbook(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer.slice(0, 8))
  const zip = b[0] === 0x50 && b[1] === 0x4b
  const xls = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0xa1 && b[3] === 0xb1
  return zip || xls
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
  const [fileName, setFileName] = useState('')

  const totals = useMemo(() => {
    const byChannel: Record<SaleChannel, number> = { counter: 0, ifood: 0, bysell: 0, other: 0 }
    const qtyByChannel: Record<SaleChannel, number> = { counter: 0, ifood: 0, bysell: 0, other: 0 }
    let total = 0
    let quantity = 0
    sales.forEach((s) => {
      const amount = Number(s.total_amount) || 0
      const qty = Number(s.quantity) || 0
      total += amount
      quantity += qty
      if (byChannel[s.channel] !== undefined) {
        byChannel[s.channel] += amount
        qtyByChannel[s.channel] += qty
      }
    })
    return { total, quantity, priced: sales.length, byChannel, qtyByChannel }
  }, [sales])

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
    getCurrentOrganizationId()
      .then(setOrganizationId)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar organizacao.'))
  }, [])

  useEffect(() => { void load() }, [load])

  async function submitManual(e: FormEvent) {
    e.preventDefault()
    if (!organizationId || !manualItemId) return
    setError(null)
    try {
      await createSale({
        sale_date: date,
        menu_item_id: manualItemId,
        channel,
        quantity: parseFloat(manualQty) || 1,
        total_amount: parseFloat(manualTotal) || 0,
        source: 'manual',
      })
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
      const buffer = reader.result as ArrayBuffer
      let rows: ParsedRow[] = []
      try {
        if (isBinaryWorkbook(buffer)) {
          rows = parseWorkbook(buffer)
        } else {
          rows = parseCsv(new TextDecoder('utf-8').decode(buffer))
        }
      } catch (err) {
        setError('Nao foi possivel ler o arquivo. Salve como .xlsx ou .csv e tente novamente.')
        return
      }
      if (rows.length === 0) {
        setError('Nenhuma linha valida encontrada. O arquivo precisa ter as colunas produto, quantidade e total.')
        return
      }
      const lookup = new Map<string, string>()
      menuItems.forEach((m) => lookup.set(normalize(m.name), m.id))
      const links: Record<string, string> = {}
      rows.forEach((r) => {
        const id = lookup.get(normalize(r.product))
        if (id) links[r.product] = id
      })
      setFileName(file.name)
      setImportRows(rows)
      setLinkMap(links)
      setPendingRows(rows.filter((r) => !links[r.product]))
      setCreateNames({})
      setResultMsg(null)
      setError(null)
    }
    reader.onerror = () => setError('Falha ao abrir o arquivo.')
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function cancelImport() {
    setImportRows([])
    setPendingRows([])
    setLinkMap({})
    setCreateNames({})
    setResultMsg(null)
    setError(null)
    setFileName('')
  }

  async function confirmImport() {
    if (!organizationId) return
    setImporting(true)
    setError(null)
    try {
      const toCreate: ParsedRow[] = []
      const seen = new Set<string>()
      pendingRows.forEach((r) => {
        if (linkMap[r.product] !== '__create__') return
        const name = (createNames[r.product] ?? r.product).trim() || r.product
        const key = normalize(name)
        if (seen.has(key)) return
        seen.add(key)
        toCreate.push(r)
      })

      if (toCreate.length > 0) {
        const existing = await listMenuItems(organizationId)
        const known = new Set(existing.map((m) => normalize(m.name)))
        for (const r of toCreate) {
          const name = (createNames[r.product] ?? r.product).trim() || r.product
          if (known.has(normalize(name))) continue
          try {
            await createMenuItem({
              organizationId,
              name,
              category: 'Outros',
              counterPrice: null,
              ifoodPrice: null,
              bysellPrice: null,
              components: [],
            })
            known.add(normalize(name))
          } catch (err) {
            console.warn('Item nao criado:', name, err)
          }
        }
      }

      const fresh = await listMenuItems(organizationId)
      const freshLookup = new Map<string, string>()
      fresh.forEach((m) => freshLookup.set(normalize(m.name), m.id))

      const finalLinks: Record<string, string> = { ...linkMap }
      pendingRows.forEach((r) => {
        if (finalLinks[r.product] === '__create__') {
          const name = (createNames[r.product] ?? r.product).trim() || r.product
          const id = freshLookup.get(normalize(name))
          if (id) finalLinks[r.product] = id
          else delete finalLinks[r.product]
        }
      })

      const inputs = importRows
        .filter((r) => finalLinks[r.product] && finalLinks[r.product] !== '__create__')
        .map((r) => ({
          sale_date: date,
          menu_item_id: finalLinks[r.product],
          channel,
          quantity: r.quantity,
          total_amount: r.total,
          source: 'import' as const,
        }))

      if (inputs.length > 0) await createSales(inputs)

      const skipped = importRows.length - inputs.length
      setResultMsg(
        skipped > 0
          ? inputs.length + ' venda(s) importada(s). ' + skipped + ' linha(s) ficaram sem link e foram ignoradas.'
          : inputs.length + ' venda(s) importada(s) com sucesso.'
      )
      setPendingRows([])
      setImportRows([])
      setFileName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar vendas.')
    } finally {
      setImporting(false)
    }
  }

  async function removeSale(id: string) {
    if (!window.confirm('Excluir esta venda?')) return
    try {
      await deleteSale(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir venda.')
    }
  }

  const boxBase = { borderRadius: 12, padding: '14px 16px', flex: '1 1 150px' }

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Vendas"
        title="Vendas"
        description="Vendas por produto, canal e periodo."
        actions={
          <Button icon={<RefreshCw size={16} />} onClick={() => void load()} disabled={loading}>
            Atualizar
          </Button>
        }
      />

      {error && (
        <div className="notice notice-error">
          {error}
          <button type="button" onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
      {resultMsg && (
        <div className="notice">
          {resultMsg}
          <button type="button" onClick={() => setResultMsg(null)}><X size={16} /></button>
        </div>
      )}

      <section className="panel">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...boxBase, background: '#111827', color: '#ffffff', flex: '1 1 220px' }}>
            <span style={{ display: 'block', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.7 }}>
              Vendas totais do dia
            </span>
            <strong style={{ display: 'block', fontSize: 28, marginTop: 6 }}>{brl(totals.total)}</strong>
            <span style={{ display: 'block', fontSize: 12, marginTop: 4, opacity: 0.7 }}>
              {totals.quantity} itens - {totals.priced} lancamento(s)
            </span>
          </div>
          {CHANNELS.map((c) => (
            <div key={c.value} style={{ ...boxBase, background: '#ffffff', border: '1px solid #e5e7eb' }}>
              <span style={{ display: 'block', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: '#6b7280' }}>
                {c.label}
              </span>
              <strong style={{ display: 'block', fontSize: 20, marginTop: 6, color: '#111827' }}>
                {brl(totals.byChannel[c.value])}
              </strong>
              <span style={{ display: 'block', fontSize: 12, marginTop: 4, color: '#9ca3af' }}>
                {totals.qtyByChannel[c.value]} itens - {pct(totals.byChannel[c.value], totals.total)}% do total
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="table-toolbar">
          <label className="month-control">
            <CalendarDays size={16} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <select className="select-control" value={channel} onChange={(e) => setChannel(e.target.value as SaleChannel)}>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="search-box table-search">
            <Search size={16} />
            <input placeholder="Buscar em vendas" />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Item</th><th>Canal</th><th>Qtd</th><th>Total</th><th>Origem</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <h2>Nenhuma venda neste dia</h2>
                      <p>Lance manualmente abaixo ou importe um arquivo.</p>
                    </div>
                  </td>
                </tr>
              ) : sales.map((s) => (
                <tr key={s.id}>
                  <td>{s.sale_date}</td>
                  <td>{s.menu_item?.name ?? '-'}</td>
                  <td>{channelLabel(s.channel)}</td>
                  <td>{s.quantity}</td>
                  <td>{brl(Number(s.total_amount) || 0)}</td>
                  <td>{s.source === 'import' ? 'Importacao' : 'Manual'}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => void removeSale(s.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Lancamento manual</h2>
        <form className="modal-card modal-wide" onSubmit={submitManual}>
          <label>
            Item do cardapio
            <select className="select-control" value={manualItemId} onChange={(e) => setManualItemId(e.target.value)} required>
              <option value="">Selecione...</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" min="0" step="any" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
          </label>
          <label>
            Total (R$)
            <input type="number" min="0" step="any" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} required />
          </label>
          <Button icon={<Plus size={16} />}>Lancar venda</Button>
        </form>
      </section>

      <section className="panel">
        <h2>Importar CSV ou Excel</h2>
        <p>
          O arquivo precisa ter as colunas <strong>produto</strong>, <strong>quantidade</strong> e <strong>total</strong>.
          Aceita .csv, .xlsx e .xls. Selecione o dia e o canal antes de importar.
        </p>
        <label className="file-input">
          <FileUp size={16} />
          <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFile} />
        </label>
        {importRows.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0 }}>
              <strong>{importRows.length}</strong> linha(s) lida(s){fileName ? ' de ' + fileName : ''}.
            </p>
            <Button onClick={() => void confirmImport()} disabled={importing}>
              Importar {importRows.length} venda(s)
            </Button>
            <Button onClick={cancelImport} disabled={importing}>
              Cancelar importacao
            </Button>
          </div>
        )}
      </section>

      {pendingRows.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-card modal-wide">
            <div className="modal-header">
              <h2>Vincular itens ao cardapio</h2>
              <button className="modal-close" type="button" onClick={cancelImport}><X size={18} /></button>
            </div>
            <p>
              Estes produtos do arquivo nao foram encontrados no cardapio. Vincule a um item existente,
              crie um novo item, ou deixe sem link (a linha sera ignorada com aviso).
            </p>
            {pendingRows.map((r) => (
              <div key={r.product} className="modal-row">
                <div>
                  <strong>{r.product}</strong>
                  <span>qtd {r.quantity} - total {brl(r.total)}</span>
                </div>
                <select
                  className="select-control"
                  value={linkMap[r.product] ?? ''}
                  onChange={(e) => setLinkMap({ ...linkMap, [r.product]: e.target.value })}
                >
                  <option value="">- deixar sem link (ignorar) -</option>
                  <option value="__create__">Criar novo item no cardapio</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {linkMap[r.product] === '__create__' && (
                  <input
                    className="input-control"
                    value={createNames[r.product] ?? r.product}
                    onChange={(e) => setCreateNames({ ...createNames, [r.product]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <div className="modal-actions">
              <Button onClick={() => void confirmImport()} disabled={importing}>
                {importing ? 'Importando...' : 'Confirmar importacao'}
              </Button>
              <Button onClick={cancelImport} disabled={importing}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'@
[System.IO.File]::WriteAllText("$PWD\src\pages\SalesPage.tsx", $page, $enc)

Write-Host "Arquivo escrito. Enviando para o GitHub..." -ForegroundColor Cyan
git add -A
git commit -m "Importar xlsx e adicionar botao cancelar"
git push origin main
Read-Host "Concluido. Pressione Enter para fechar"