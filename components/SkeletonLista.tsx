// Skeleton de carregamento da lista. `comBotao` adiciona a barra do botão
// (usada no painel de reativação); sem ela é o layout simples da lista de clientes.
export function SkeletonLista({
  itens = 5,
  comBotao = false,
}: {
  itens?: number
  comBotao?: boolean
}) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Carregando…">
      {Array.from({ length: itens }, (_, i) => i).map((i) =>
        comBotao ? (
          <li key={i} className="shimmer rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex gap-3">
              <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-surface-2" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded bg-surface-2" />
                <div className="h-3 w-3/5 rounded bg-surface-2" />
              </div>
            </div>
            <div className="mt-3 h-11 rounded-lg bg-surface-2" />
          </li>
        ) : (
          <li
            key={i}
            className="shimmer flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-surface-2" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/5 rounded bg-surface-2" />
              <div className="h-3 w-3/5 rounded bg-surface-2" />
            </div>
          </li>
        ),
      )}
    </ul>
  )
}
