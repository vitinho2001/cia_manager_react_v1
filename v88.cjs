const fs = require('fs')
const p = 'src/pages/SalesPage.tsx'
const original = fs.readFileSync(p, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) Formulario Lancar venda: labels em coluna, campos alinhados =====
{
  const lines = s.split(/\r?\n/)
  const fIdx = lines.findIndex((l) => l.includes('void submitManual(e)'))
  if (fIdx === -1) {
    warn('form Lancar venda nao encontrado')
  } else {
    let eIdx = -1
    for (let i = fIdx; i < lines.length; i++) { if (lines[i].trim() === '</form>') { eIdx = i; break } }
    if (eIdx === -1) warn('fechamento do form nao encontrado')
    else {
      const newForm = [
        '        <form onSubmit={(e) => void submitManual(e)} style={{ display: \'flex\', gap: 14, alignItems: \'flex-end\', flexWrap: \'wrap\' }}>',
        '          <label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\' }}>Dia',
        '            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: \'8px 10px\', borderRadius: 8, border: \'1px solid #d1d5db\', fontSize: 13 }} />',
        '          </label>',
        '          <label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\', flex: \'1 1 240px\' }}>Item',
        '            <select className="select-control" value={manualItemId} onChange={(e) => setManualItemId(e.target.value)} required>',
        '              <option value="">Selecione um item</option>',
        '              {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}',
        '            </select>',
        '          </label>',
        '          <label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\' }}>Canal',
        '            <select className="select-control" value={channel} onChange={(e) => setChannel(e.target.value as SaleChannel)}>',
        '              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}',
        '            </select>',
        '          </label>',
        '          <label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\' }}>Qtd',
        '            <input type="number" min="1" step="any" value={manualQty} onChange={(e) => setManualQty(e.target.value)} required style={{ width: 90, padding: \'8px 10px\', borderRadius: 8, border: \'1px solid #d1d5db\', fontSize: 13 }} />',
        '          </label>',
        '          <label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\' }}>Total (R$)',
        '            <input type="number" min="0" step="any" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} required style={{ width: 130, padding: \'8px 10px\', borderRadius: 8, border: \'1px solid #d1d5db\', fontSize: 13 }} />',
        '          </label>',
        '          <Button icon={<Plus size={16} />}>Lancar venda</Button>',
        '        </form>',
      ]
      lines.splice(fIdx, eIdx - fIdx + 1, ...newForm)
      s = lines.join(eol)
      ok('form Lancar venda reescrito (labels em coluna)')
    }
  }
}

// ===== 2) Painel Importar vendas =====
const reps = [
  {
    name: 'texto de instrucao com respiro',
    old: '<p>O arquivo deve ter as colunas: <strong>produto, quantidade, total</strong> (.xlsx ou .csv). Selecione o dia e o canal antes de importar.</p>',
    neo: '<p style={{ margin: \'0 0 12px\', fontSize: 13, color: \'#4b5563\' }}>O arquivo deve ter as colunas: <strong>produto, quantidade, total</strong> (.xlsx ou .csv). Selecione o dia e o canal antes de importar.</p>',
  },
  {
    name: 'Dia da importacao em coluna',
    old: '<label style={{ display: \'block\', marginBottom: 8 }}>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>',
    neo: '<label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\', maxWidth: 200 }}>Dia<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: \'8px 10px\', borderRadius: 8, border: \'1px solid #d1d5db\', fontSize: 13 }} /></label>',
  },
  {
    name: 'Canal da importacao em coluna',
    old: '<label style={{ display: \'block\', marginBottom: 8 }}>',
    neo: '<label style={{ display: \'flex\', flexDirection: \'column\', gap: 4, fontSize: 12, fontWeight: 700, color: \'#475569\', maxWidth: 260 }}>',
  },
  {
    name: 'input de arquivo estilizado',
    old: '<input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFile} />',
    neo: '<input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFile} style={{ marginTop: 10, maxWidth: 380, fontSize: 13, color: \'#374151\', background: \'#ffffff\', border: \'1px solid #d1d5db\', borderRadius: 8, padding: \'6px 10px\' }} />',
  },
]
for (const r of reps) {
  const c = s.split(r.old).length - 1
  if (c === 1) { s = s.split(r.old).join(r.neo); ok(r.name) }
  else warn(r.name + ' (ocorrencias: ' + c + ')')
}

fs.writeFileSync(p + '.bak88', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')