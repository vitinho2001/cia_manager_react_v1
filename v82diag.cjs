const fs = require('fs')

function show(title, text, keys) {
  console.log('\n===== ' + title + ' =====')
  const lines = text.split(/\r?\n/)
  lines.forEach((l, i) => { if (keys.some((k) => l.includes(k))) console.log((i + 1) + ': ' + l.trim()) })
}

// 1) Tipo Sale completo: revela todas as colunas que o app conhece
try {
  console.log('===== src/types/sales.ts (completo) =====')
  console.log(fs.readFileSync('src/types/sales.ts', 'utf8'))
} catch { console.log('src/types/sales.ts: NAO ENCONTRADO') }

// 2) Servico: o que o listSales le do banco e o que o insert grava
try {
  show('src/services/sales.ts', fs.readFileSync('src/services/sales.ts', 'utf8'),
    ['select(', 'menu_item', 'item_name', 'manual', 'original', 'raw', 'csv', 'nome', 'CreateSaleInput', 'export type Sale', 'export interface'])
} catch { console.log('src/services/sales.ts: NAO ENCONTRADO') }

// 3) Pagina: fluxo de importacao do CSV e modal de edicao da associacao
try {
  show('src/pages/SalesPage.tsx', fs.readFileSync('src/pages/SalesPage.tsx', 'utf8'),
    ['FileReader', 'readAsText', 'csv', 'CSV', 'produto', 'quantidade', 'createSales', 'origem', 'item_name', 'manual_name', 'original_name', 'raw_name', 'nome_original', 'source_name', 'showModal', 'setShowModal', 'modalQuery', 'editItemId', 'setEditItemId', 'editQuery', 'Editar', 'Vincular', 'associ', 'sem link', 'Sem link'])
} catch { console.log('src/pages/SalesPage.tsx: NAO ENCONTRADO') }