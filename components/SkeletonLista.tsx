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
          <li key={i} className="animate-pulse rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="flex gap-3">
              <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-700/60" />
              </div>
            </div>
            <div className="mt-3 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-700/60" />
          </li>
        ) : (
          <li
            key={i}
            className="flex gap-3 rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm animate-pulse"
          >
            <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-700/60" />
            </div>
          </li>
        ),
      )}
    </ul>
  )
}
