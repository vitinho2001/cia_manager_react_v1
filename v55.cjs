const fs = require('fs')

const ap = 'src/layouts/AppLayout.tsx'
const original = fs.readFileSync(ap, 'utf8')
let a = original
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

const tbOld = '<button className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></button><button className="collapse-button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed ? \'Expandir menu\' : \'Minimizar menu\'}>{collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}</button>'
const tbNew = '<button className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></button>'
if (a.includes(tbOld)) { a = a.split(tbOld).join(tbNew); ok('botao removido do topbar') } else warn('botao do topbar')

const sbOld = '<aside className={`sidebar ${open ? \'sidebar-open\' : \'\'}`}>\n      <button className="sidebar-close"'
const sbNew = '<aside className={`sidebar ${open ? \'sidebar-open\' : \'\'}`}>\n      <button className="sidebar-collapse" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed ? \'Expandir menu\' : \'Minimizar menu\'}>{collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}</button>\n      <button className="sidebar-close"'
if (a.includes(sbOld)) { a = a.split(sbOld).join(sbNew); ok('botao adicionado na sidebar') } else warn('sidebar')

fs.writeFileSync(ap + '.bak55', original, 'utf8')
fs.writeFileSync(ap, a, 'utf8')

const cp = 'src/styles/global.css'
let css = fs.readFileSync(cp, 'utf8')
const extra = `
/* v55: botao de colapsar na sidebar + rotulo de intervalo */
.sidebar-collapse{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff14;color:#d9e8e2;display:grid;place-items:center;z-index:2;cursor:pointer}
.sidebar-collapse:hover{background:#ffffff26;color:#fff}
.app-shell.sidebar-collapsed .sidebar-collapse{right:auto;left:50%;transform:translateX(-50%)}
.range-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#68746e;text-transform:uppercase;letter-spacing:.05em}
.range-label .select-control{width:auto}
@media(max-width:780px){.sidebar-collapse{display:none}}
`
if (!css.includes('v55:')) {
  fs.writeFileSync(cp, css + extra, 'utf8')
  ok('CSS do botao na sidebar e rotulo')
} else warn('CSS v55 ja aplicado')

console.log('Concluido: ' + count + ' alteracoes no AppLayout')