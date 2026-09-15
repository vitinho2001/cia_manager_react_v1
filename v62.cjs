const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== menu.ts: renomear categoria sem tocar em precos nem composicoes =====
{
  const p = 'src/services/menu.ts'
  const original = fs.readFileSync(p, 'utf8')
  if (original.includes('updateMenuItemCategory')) {
    console.log('INFO: updateMenuItemCategory ja existe')
  } else {
    const fn = `
export async function updateMenuItemCategory(id: string, category: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.from('menu_items').update({ category: category.trim(), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
`
    fs.writeFileSync(p, original + '\n' + fn, 'utf8')
    ok('menu.ts: updateMenuItemCategory criada')
  }
}

// ===== MenuPage.tsx =====
{
  const p = 'src/pages/MenuPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const impOld = `import { createMenuItem, deleteMenuItem, listMenuComponents, listMenuItems, seedMenuItems, updateMenuItem } from '../services/menu'`
  const impNew = `import { createMenuItem, deleteMenuItem, listMenuComponents, listMenuItems, seedMenuItems, updateMenuItem, updateMenuItemCategory } from '../services/menu'`
  if (s.includes(impOld)) { s = s.split(impOld).join(impNew); ok('import updateMenuItemCategory') } else warn('import updateMenuItemCategory')

  const tbOld = 'className="toolbar-row wrap"'
  const tbNew = 'className="toolbar-row"'
  if (s.includes(tbOld)) { s = s.split(tbOld).join(tbNew); ok('toolbar sem classe wrap') } else warn('toolbar sem classe wrap')

  const stOld = 'const [catModal, setCatModal] = useState(false)'
  const stNew = `const [catModal, setCatModal] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('cia-cat-extras') || '[]') } catch { return [] } })`
  if (s.includes(stOld)) { s = s.split(stOld).join(stNew); ok('estado customCategories') } else warn('estado customCategories')

  const catOld = `const categories = useMemo(() => ['Todas', ...Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [items])`
  const catNew = `const categories = useMemo(() => ['Todas', ...Array.from(new Set([...items.map((item) => item.category), ...customCategories])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [items, customCategories])`
  if (s.includes(catOld)) { s = s.split(catOld).join(catNew); ok('categories com extras') } else warn('categories com extras')

  const reAdd = /function addCategory\(\) \{[\s\S]*?\n  \}/
  const addNew = `function persistCats(next: string[]) {
    try { localStorage.setItem('cia-cat-extras', JSON.stringify(next)) } catch { /* segue */ }
    setCustomCategories(next)
  }
  function addCategory() {
    const name = newCat.trim()
    if (!name) return
    if (categories.includes(name)) { setNewCat(''); return }
    persistCats([...customCategories, name])
    setCategoryFilter(name)
    setNewCat('')
  }`
  if (reAdd.test(s)) { s = s.replace(reAdd, addNew); ok('addCategory persistente') } else warn('addCategory persistente')

  const reRen = /function confirmRename\(\) \{[\s\S]*?\n  \}/
  const renNew = `async function confirmRename() {
    const name = renameValue.trim()
    if (!name || !renamingCat) return
    const oldCat = renamingCat
    if (name === oldCat) { setRenamingCat(null); setRenameValue(''); return }
    const affected = items.filter((i) => i.category === oldCat)
    for (const item of affected) {
      try { await updateMenuItemCategory(item.id, name) } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao renomear categoria.') }
    }
    if (customCategories.includes(oldCat)) persistCats(customCategories.map((c) => (c === oldCat ? name : c)))
    setCategoryFilter(name)
    setRenamingCat(null)
    setRenameValue('')
    await load()
  }`
  if (reRen.test(s)) { s = s.replace(reRen, renNew); ok('confirmRename propaga para os itens') } else warn('confirmRename propaga para os itens')

  const reDel = /async function deleteCategory\(cat: string\) \{[\s\S]*?\n  \}/
  const delNew = `async function deleteCategory(cat: string) {
    if (!window.confirm('Excluir a categoria ' + cat + ' e TODOS os itens dela? Esta acao nao pode ser desfeita.')) return
    const toDelete = items.filter((i) => i.category === cat)
    for (const item of toDelete) {
      try { await deleteMenuItem(item.id) } catch { /* segue */ }
    }
    if (customCategories.includes(cat)) persistCats(customCategories.filter((c) => c !== cat))
    setCategoryFilter('Todas')
    await load()
  }`
  if (reDel.test(s)) { s = s.replace(reDel, delNew); ok('deleteCategory limpa extras') } else warn('deleteCategory limpa extras')

  fs.writeFileSync(p + '.bak62', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== CSS: travar a toolbar em uma linha =====
{
  const cp = 'src/styles/global.css'
  let css = fs.readFileSync(cp, 'utf8')
  const extra = `
/* v62: toolbar do cardapio em uma linha unica */
.menu-toolbar-card .toolbar-row{display:flex;flex-wrap:nowrap !important;align-items:center;gap:10px;overflow-x:auto;padding-bottom:2px}
.menu-toolbar-card .toolbar-row .search-field{flex:1 1 180px;min-width:140px}
.menu-toolbar-card .toolbar-row select{flex:0 0 auto;max-width:180px}
.menu-toolbar-card .toolbar-row .month-field{flex:0 0 auto}
`
  if (!css.includes('v62:')) { fs.writeFileSync(cp, css + extra, 'utf8'); ok('CSS toolbar em uma linha') }
  else warn('CSS v62 ja aplicado')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')