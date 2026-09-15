const fs = require('fs')

// AppLayout
const ap = 'src/layouts/AppLayout.tsx'
const original = fs.readFileSync(ap, 'utf8')
let a = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

const impOld = "X } from 'lucide-react'"
const impNew = "X, ChevronsLeft, ChevronsRight } from 'lucide-react'"
if (a.includes(impOld)) { a = a.split(impOld).join(impNew); ok('import dos icones de minimizar') } else warn('import de lucide')

const stOld = 'const [open, setOpen] = useState(false)'
const stNew = 'const [open, setOpen] = useState(false); const [collapsed, setCollapsed] = useState(false)'
if (a.includes(stOld)) { a = a.split(stOld).join(stNew); ok('estado collapsed') } else warn('estado open')

const shOld = 'return <div className="app-shell">'
const shNew = `return <div className={'app-shell' + (collapsed ? ' sidebar-collapsed' : '')}>`
if (a.includes(shOld)) { a = a.split(shOld).join(shNew); ok('classe no app-shell') } else warn('app-shell')

const btOld = '<button className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></button>'
const btNew = `<button className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></button><button className="collapse-button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}>{collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}</button>`
if (a.includes(btOld)) { a = a.split(btOld).join(btNew); ok('botao de minimizar no topbar') } else warn('botao do menu')

fs.writeFileSync(ap + '.bak53', original, 'utf8')
fs.writeFileSync(ap, a, 'utf8')

// CSS
const cp = 'src/styles/global.css'
let css = fs.readFileSync(cp, 'utf8')
const extra = `
/* v53: menu minimizavel */
.collapse-button{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--line);background:#fff;border-radius:11px;color:var(--green-800)}
.app-shell.sidebar-collapsed{grid-template-columns:76px minmax(0,1fr)}
.app-shell.sidebar-collapsed .sidebar{padding:22px 10px}
.app-shell.sidebar-collapsed .sidebar nav a{justify-content:center;padding:12px;gap:0}
.app-shell.sidebar-collapsed .sidebar nav a span,
.app-shell.sidebar-collapsed .brand-block span,
.app-shell.sidebar-collapsed .user-chip>div:last-child,
.app-shell.sidebar-collapsed .sidebar-footer>button{display:none}
.app-shell.sidebar-collapsed .brand-block img{height:46px}
.app-shell.sidebar-collapsed .sidebar-footer{padding:16px 0 0;place-items:center}
@media(max-width:780px){.collapse-button{display:none}}
`
if (!css.includes('v53:')) {
  fs.writeFileSync(cp, css + extra, 'utf8')
  ok('CSS do menu minimizavel')
} else warn('CSS v53 ja aplicado')

console.log('Concluido: ' + count + ' alteracoes no AppLayout')