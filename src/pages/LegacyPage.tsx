export function LegacyPage() {
  return (
    <div className="legacy-page">
      <div className="legacy-toolbar">
        <div><span className="eyebrow">Compatibilidade</span><h1>Sistema atual</h1><p>Versão completa preservada durante a migração.</p></div>
        <a href="/legacy/index.html" target="_blank" rel="noreferrer">Abrir em nova aba</a>
      </div>
      <iframe title="Sistema atual da Cia. do Caldinho" src="/legacy/index.html" />
    </div>
  )
}
