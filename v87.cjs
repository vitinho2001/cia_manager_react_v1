const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
const lines = original.split(/\r?\n/)

const startIdx = lines.findIndex((l) => l.includes('{editingSale && ('))
if (startIdx === -1) { console.log('ATENCAO: abertura do modal nao encontrada'); process.exit(1) }
let endIdx = -1
for (let i = startIdx + 1; i < lines.length; i++) { if (lines[i].trim() === ')}') { endIdx = i; break } }
if (endIdx === -1) { console.log('ATENCAO: fechamento do modal nao encontrado'); process.exit(1) }
console.log('Bloco atual: linhas ' + (startIdx + 1) + '-' + (endIdx + 1))

const blockStr = `      {editingSale && (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide" style={{ maxWidth: 560, width: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h3 style={{ margin: 0 }}>Editar associacao</h3>
                {editingSale.item_name ? <p style={{ margin: 0, fontSize: 12, color: '#68746e' }}>Nome original (CSV): <strong>{editingSale.item_name}</strong></p> : null}
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingSale(null)}><X size={16} /></button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>
              Venda de <strong>\${editingSale.sale_date}</strong> — \${editingSale.quantity} x \${brl(Number(editingSale.total_amount) || 0)}.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Buscar item do cardapio
                <input
                  type="text"
                  placeholder="Digite para filtrar a lista abaixo..."
                  value={editQuery}
                  onChange={(e) => setEditQuery(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Item do cardapio
                <select className="select-control" value={editItemId} onChange={(e) => setEditItemId(e.target.value)}>
                  <option value="">Sem associacao</option>
                  \${filteredEditMenu.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Canal
                <select className="select-control" value={editChannel} onChange={(e) => setEditChannel(e.target.value as SaleChannel)}>
                  <option value="counter">Balcao</option>
                  <option value="ifood">iFood</option>
                  <option value="bysell">BySell</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Quantidade
                <input type="number" min="0" step="any" value={editQty} onChange={(e) => setEditQty(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                Total (R$)
                <input type="number" min="0" step="any" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 2 }}>
              <Button onClick={() => setEditingSale(null)} disabled={editSaving}>Cancelar</Button>
              <Button onClick={() => void saveEdit()} disabled={editSaving || !editItemId}>
                {editSaving ? 'Salvando...' : 'Salvar associacao'}
              </Button>
            </div>
          </div>
        </div>
      )}`

const blockLines = blockStr.split('\n')
const out = lines.slice(0, startIdx).concat(blockLines, lines.slice(endIdx + 1))
fs.writeFileSync(p + '.bak87', original, 'utf8')
fs.writeFileSync(p, out.join(eol), 'utf8')
const check = fs.readFileSync(p, 'utf8')
const opens = (check.match(/\{editingSale && \(/g) || []).length
console.log('OK: modal de edicao reescrito (' + blockLines.length + ' linhas, aberturas encontradas: ' + opens + ')')