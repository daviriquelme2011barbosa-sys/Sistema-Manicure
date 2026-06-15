import { formatarData, textoUltimaVisita } from '@/lib/formatters'
import { IconeLapis, IconeNota } from '@/components/icons'
import type { ClienteStatus, StatusCliente } from '@/types'

const BORDA_STATUS: Record<StatusCliente, string> = {
  verde: 'border-l-green-500',
  amarelo: 'border-l-yellow-400',
  vermelho: 'border-l-red-500',
  sem_atendimento: 'border-l-zinc-300 dark:border-l-zinc-600',
}

export function ClienteCard({
  cliente,
  onEditar,
}: {
  cliente: ClienteStatus
  onEditar: (cliente: ClienteStatus) => void
}) {
  return (
    <li
      className={`flex gap-4 rounded-xl bg-white dark:bg-zinc-800 p-5 shadow-sm border-l-4 ${BORDA_STATUS[cliente.status]}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{cliente.nome}</p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {cliente.ultima_visita ? (
            <>
              Última visita: {formatarData(cliente.ultima_visita)}
              {' · '}
              {textoUltimaVisita(cliente.dias_desde_ultima_visita!)}
              {cliente.ultimo_servico && ` · ${cliente.ultimo_servico}`}
            </>
          ) : (
            'Sem atendimentos registrados'
          )}
        </p>
        {cliente.data_nascimento && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            🎂 {formatarData(cliente.data_nascimento)}
          </p>
        )}
        {cliente.observacoes && (
          <p className="mt-1 flex items-start gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            <IconeNota className="mt-px flex-shrink-0" />
            <span className="line-clamp-2">{cliente.observacoes}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => onEditar(cliente)}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
        aria-label={`Editar ${cliente.nome}`}
      >
        <IconeLapis />
      </button>
    </li>
  )
}
