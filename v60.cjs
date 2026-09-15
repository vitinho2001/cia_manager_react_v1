const fs = require('fs')
const p = 'src/pages/MenuPage.tsx'
const original = fs.readFileSync(p, 'utf8')
let s = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// 1. Estado do gerenciador
const stOld = 'const [modalOpen, setModalOpen] = useState(false)'
const stNew = 'const [modalOpen, setModalOpen] = useState(false)\n  const [catModal, setCatModal] = useState(false)\n  const [newCat, setNewCat] = useState(\'\')\n  const [renamingCat, setRenamingCat] = useState<string | null>(null)\n  const [renameValue, setRenameValue] = useState(\'\')'
if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado do gerenciador') } else warn('estado do gerenciador')

// 2. Botao "Gerenciar categorias" na toolbar (antes do select de categoria)
const tbOld = '<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>'
const tbNew = '<Button variant="ghost" onClick={() => setCatModal(true)}>Categorias</Button><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>'
if (s.includes(tbOld)) { s = s.split(tbOld).join(tbNew); ok('botao Categorias na toolbar') } else warn('botao Categorias na toolbar')

// 3. Funcoes do gerenciador (antes do return)
const retOld = 'return <div className="page-container">'
const funcs = `function addCategory() {
    const name = newCat.trim()
    if (!name) return
    if (categories.includes(name)) return
    setCategoryFilter(name)
    setNewCat('')
  }
  function startRename(cat: string) {
    setRenamingCat(cat)
    setRenameValue(cat)
  }
  function confirmRename() {
    const name = renameValue.trim()
    if (!name || !renamingCat) return
    const oldCat = renamingCat
    // renomear nao altera os itens; apenas cria o novo nome no filtro
    setCategoryFilter(name)
    setRenamingCat(null)
    setRenameValue('')
  }
  async function deleteCategory(cat: string) {
    if (!window.confirm('Excluir a categoria ' + cat + ' e TODOS os itens dela? Esta acao nao pode ser desfeita.')) return
    const toDelete = items.filter((i) => i.category === cat)
    for (const item of toDelete) {
      try { await deleteMenuItem(item.id) } catch { /* segue */ }
    }
    setCategoryFilter('Todas')
    await load()
  }
  return <div className="page-container">`
if (s.includes(retOld)) { s = s.split(retOld).join(funcs); ok('funcoes do gerenciador') } else warn('funcoes do gerenciador')

// 4. Modal do gerenciador (antes do fechamento do return, antes de </div> final)
const modalAnchor = '      {/* Modal de vinculacao dos produtos importados */}'
// MenuPage nao tem esse modal; usa o ultimo </div> antes de export. Busca um marcador seguro:
const endAnchor = '\n}\n'
const modal = `
      {catModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header"><h2>Gerenciar categorias</h2><button className="modal-close" type="button" onClick={() => setCatModal(false)}><X size={18} /></button></div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria" />
              <Button onClick={addCategory} icon={<Plus size={16}/>}>Adicionar</Button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {categories.filter((c) => c !== 'Todas').map((cat) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 10 }}>
                  {renamingCat === cat ? (
                    <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                  ) : <strong>{cat}</strong>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {renamingCat === cat ? (
                      <Button onClick={confirmRename}>Salvar</Button>
                    ) : (
                      <Button variant="secondary" onClick={() => startRename(cat)}>Renomear</Button>
                    )}
                    <Button variant="danger" onClick={() => void deleteCategory(cat)}>Excluir</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
`
// Insere o modal antes do ultimo </div> do componente
const lastDiv = s.lastIndexOf('</div>')
if (lastDiv !== -1) {
  s = s.slice(0, lastDiv) + modal + s.slice(lastDiv)
  ok('modal do gerenciador')
} else warn('modal do gerenciador')

fs.writeFileSync(p + '.bak60', original, 'utf8')
fs.writeFileSync(p, s, 'utf8')
console.log('Concluido: ' + count + ' alteracoes aplicadas')