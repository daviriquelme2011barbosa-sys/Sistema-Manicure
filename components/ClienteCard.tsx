import { formatarData, textoUltimaVisita } from '@/lib/formatters'
import { IconeLapis, IconeNota } from '@/components/icons'
import { AvatarCliente } from '@/components/AvatarCliente'
import type { ClienteStatus, StatusCliente } from '@/types'

const STATUS_PILL: Record<StatusCliente, { label: string; classes: string }> = {
  verde: { label: 'Ativa', classes: 'bg-success-soft text-success' },
  amarelo: { label: 'Atenção', classes: 'bg-warning-soft text-warning' },
  vermelho: { label: 'Sumida', classes: 'bg-danger-soft text-danger' },
  sem_atendimento: { label: 'Nova', classes: 'bg-surface-2 text-text-muted' },
}

export function ClienteCard({
  cliente,
  onEditar,
}: {
  cliente: ClienteStatus
  onEditar: (cliente: ClienteStatus) => void
}) {
  const statusInfo = STATUS_PILL[cliente.status]
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:bg-hover">
      <AvatarCliente fotoUrl={cliente.foto_url} nome={cliente.nome} className="mt-0.5 h-11 w-11 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold text-text">{cliente.nome}</p>
          <span
            className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusInfo.classes}`}
          >
            {statusInfo.label}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-text-secondary">
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
          <p className="mt-1 text-xs text-text-muted">
            🎂 {formatarData(cliente.data_nascimento)}
          </p>
        )}
        {cliente.observacoes && (
          <p className="mt-1 flex items-start gap-1 text-xs text-text-muted">
            <IconeNota className="mt-px flex-shrink-0" />
            <span className="line-clamp-2">{cliente.observacoes}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => onEditar(cliente)}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-hover hover:text-text"
        aria-label={`Editar ${cliente.nome}`}
      >
        <IconeLapis />
      </button>
    </li>
  )
}
