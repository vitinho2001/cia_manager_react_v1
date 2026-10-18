const fs = require('fs')
let count = 0
const ok = (n) => { count++; console.log('OK: ' + n) }
const warn = (n) => console.log('ATENCAO: ' + n)

// ===== 1) SalesPage.tsx =====
{
  const p = 'src/pages/SalesPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const stOld = 'const [totalCount, setTotalCount] = useState(0)'
  if (s.includes(stOld) && !s.includes('const [allSales, setAllSales]')) {
    s = s.split(stOld).join(stOld + '\n  const [allSales, setAllSales] = useState<Sale[]>([])')
    ok('estado allSales para o periodo completo')
  } else if (s.includes('const [allSales, setAllSales]')) ok('estado allSales ja existia')
  else warn('estado allSales')

  const fOld = 'const [from, setFrom] = useState(today())'
  if (s.includes(fOld)) { s = s.split(fOld).join("const [from, setFrom] = useState(() => localStorage.getItem('sales_from') || today())"); ok('De persiste entre telas') } else warn('De persiste')

  const tOld = 'const [to, setTo] = useState(today())'
  if (s.includes(tOld)) { s = s.split(tOld).join("const [to, setTo] = useState(() => localStorage.getItem('sales_to') || today())"); ok('Ate persiste entre telas') } else warn('Ate persiste')

  const hFrom = 'onChange={(e) => { setFrom(e.target.value); setPage(1) }}'
  const hFromNew = "onChange={(e) => { setFrom(e.target.value); setPage(1); localStorage.setItem('sales_from', e.target.value) }}"
  if (s.includes(hFrom)) { s = s.split(hFrom).join(hFromNew); ok('De salva no localStorage') } else warn('De salva')

  const hTo = 'onChange={(e) => { setTo(e.target.value); setPage(1) }}'
  const hToNew = "onChange={(e) => { setTo(e.target.value); setPage(1); localStorage.setItem('sales_to', e.target.value) }}"
  if (s.includes(hTo)) { s = s.split(hTo).join(hToNew); ok('Ate salva no localStorage') } else warn('Ate salva')

  const deOld = 'const [total, saleRows, menuRows] = await Promise.all(['
  const deNew = 'const [total, saleRows, menuRows, fullRows] = await Promise.all(['
  if (s.includes(deOld)) { s = s.split(deOld).join(deNew); ok('Promise.all desestrutura fullRows') } else warn('Promise.all desestrutura')

  const liOld = 'listSales(organizationId, from, to, page, pageSize),'
  const liNew = 'listSales(organizationId, from, to, page, pageSize),\n        listSales(organizationId, from, to),'
  if (s.includes(liOld)) { s = s.split(liOld).join(liNew); ok('busca do periodo completo') } else warn('busca do periodo completo')

  const setOld = 'setTotalCount(total)'
  if (s.includes(setOld)) { s = s.split(setOld).join('setTotalCount(total)\n      setAllSales(fullRows)'); ok('setAllSales no load') } else warn('setAllSales no load')

  const dayOld = 'if (dayList.length) rows = rows.filter((s) => dayList.includes(s.sale_date))'
  const dayNew = 'if (dayList.length) { rows = rows.filter((s) => dayList.includes(s.sale_date)); setAllSales(fullRows.filter((s) => dayList.includes(s.sale_date))) }'
  if (s.includes(dayOld)) { s = s.split(dayOld).join(dayNew); ok('dias selecionados filtram os totais') } else warn('dias selecionados filtram os totais')

  const head = 'const totals = useMemo(() => {'
  const ret = 'return { total, quantity, priced: sales.length, byChannel, qtyByChannel }'
  const hIdx = s.indexOf(head)
  const rIdx = hIdx >= 0 ? s.indexOf(ret, hIdx) : -1
  if (hIdx >= 0 && rIdx >= 0) {
    const cIdx = s.indexOf('}, [', rIdx)
    const eIdx = cIdx >= 0 ? s.indexOf(')', cIdx) : -1
    if (cIdx >= 0 && eIdx >= 0) {
      const block = s.slice(hIdx, eIdx + 1)
      const newBlock = block.split('sales').join('allSales')
      s = s.slice(0, hIdx) + newBlock + s.slice(eIdx + 1)
      ok('cards somam o periodo completo (nao apenas a pagina)')
    } else warn('fecho do useMemo totals')
  } else warn('useMemo totals')

  fs.writeFileSync(p + '.bak80', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

// ===== 2) DashboardPage.tsx =====
{
  const p = 'src/pages/DashboardPage.tsx'
  const original = fs.readFileSync(p, 'utf8')
  let s = original

  const fOld = 'const [from, setFrom] = useState(firstOfMonth())'
  if (s.includes(fOld)) { s = s.split(fOld).join("const [from, setFrom] = useState(() => localStorage.getItem('dash_from') || firstOfMonth())"); ok('Dash: De persiste') } else warn('Dash: De persiste')

  const tOld = 'const [to, setTo] = useState(today())'
  if (s.includes(tOld)) { s = s.split(tOld).join("const [to, setTo] = useState(() => localStorage.getItem('dash_to') || today())"); ok('Dash: Ate persiste') } else warn('Dash: Ate persiste')

  const hFrom = 'onChange={(e) => setFrom(e.target.value)}'
  const hFromNew = "onChange={(e) => { setFrom(e.target.value); localStorage.setItem('dash_from', e.target.value) }}"
  if (s.includes(hFrom)) { s = s.split(hFrom).join(hFromNew); ok('Dash: De salva no localStorage') } else warn('Dash: De salva')

  const hTo = 'onChange={(e) => setTo(e.target.value)}'
  const hToNew = "onChange={(e) => { setTo(e.target.value); localStorage.setItem('dash_to', e.target.value) }}"
  if (s.includes(hTo)) { s = s.split(hTo).join(hToNew); ok('Dash: Ate salva no localStorage') } else warn('Dash: Ate salva')

  fs.writeFileSync(p + '.bak80', original, 'utf8')
  fs.writeFileSync(p, s, 'utf8')
}

console.log('Concluido: ' + count + ' alteracoes aplicadas')