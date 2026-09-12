const fs = require('fs')
const p = 'src/pages/EstoquePage.tsx'
let s = fs.readFileSync(p, 'utf8')
const oldImp = "import { useMemo, useState } from 'react'"
const newImp = "import { useEffect, useMemo, useState } from 'react'"
if (s.includes(oldImp)) { s = s.split(oldImp).join(newImp) }
const anchor = 'const lines = useMemo(() => computeStock('
const insert = 'useEffect(() => { void load() }, [])\n'
if (s.includes(anchor) && !s.includes('void load()')) {
  s = s.split(anchor).join(insert + anchor)
}
fs.writeFileSync(p, s, 'utf8')
const check = fs.readFileSync(p, 'utf8')
console.log('useEffect no import:', check.includes('useEffect'))
console.log('useEffect chamando load:', check.includes('void load()'))