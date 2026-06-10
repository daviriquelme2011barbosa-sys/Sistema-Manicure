'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

type ClienteStatus = {
  id: string
  nome: string
  whatsapp: string
  observacoes: string | null
  ultima_visita: string | null
  dias_desde_ultima_visita: number | null
  ultimo_servico: string | null
  status: 'verde' | 'amarelo' | 'vermelho' | 'sem_atendimento'
}

type FiltroStatus = 'todos' | 'verde' | 'amarelo' | 'vermelho'

const ORDEM_STATUS: Record<ClienteStatus['status'], number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
  sem_atendimento: 3,
}

function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function textoElapsado(dias: number): string {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `${dias} dias atrás`
}

function BadgeStatus({ status }: { status: ClienteStatus['status'] }) {
  const classes: Record<ClienteStatus['status'], string> = {
    verde: 'bg-green-500',
    amarelo: 'bg-yellow-400',
    vermelho: 'bg-red-500',
    sem_atendimento: 'bg-zinc-300',
  }
  return (
    <span
      className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${classes[status]}`}
    />
  )
}

function SkeletonLista() {
  return (
    <ul className="flex flex-col gap-3" aria-label="Carregando…">
      {[1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm animate-pulse">
          <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-zinc-200" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/5 rounded bg-zinc-200" />
            <div className="h-3 w-3/5 rounded bg-zinc-100" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteStatus[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [nomeSalao, setNomeSalao] = useState('')

  useEffect(() => {
    async function carregar() {
      const [{ data: clientesData, error: clientesError }, { data: configData }] =
        await Promise.all([
          supabase.from('clientes_status').select('*'),
          supabase.from('salao_config').select('nome_salao').single(),
        ])

      if (clientesError) {
        setErro('Não foi possível carregar a lista. Tente novamente.')
      } else {
        setClientes((clientesData as ClienteStatus[]) ?? [])
      }

      if (configData) setNomeSalao(configData.nome_salao)

      setCarregando(false)
    }

    carregar()
  }, [])

  const clientesOrdenados = useMemo(
    () =>
      [...clientes].sort((a, b) => {
        const diff = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]
        if (diff !== 0) return diff
        return (b.dias_desde_ultima_visita ?? -1) - (a.dias_desde_ultima_visita ?? -1)
      }),
    [clientes],
  )

  const clientesFiltrados = useMemo(
    () =>
      clientesOrdenados.filter((c) => {
        const passaBusca =
          busca.trim() === '' || c.nome.toLowerCase().includes(busca.toLowerCase().trim())
        const passaFiltro = filtro === 'todos' || c.status === filtro
        return passaBusca && passaFiltro
      }),
    [clientesOrdenados, busca, filtro],
  )

  const contadores = useMemo(
    () => ({
      todos: clientes.length,
      verde: clientes.filter((c) => c.status === 'verde').length,
      amarelo: clientes.filter((c) => c.status === 'amarelo').length,
      vermelho: clientes.filter((c) => c.status === 'vermelho').length,
    }),
    [clientes],
  )

  const FILTROS: { chave: FiltroStatus; label: string }[] = [
    { chave: 'todos', label: 'Todas' },
    { chave: 'verde', label: 'Ativas' },
    { chave: 'amarelo', label: 'Atenção' },
    { chave: 'vermelho', label: 'Sumidas' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-white px-4 py-4">
        <h1 className="truncate text-base font-semibold text-zinc-900">
          {nomeSalao || 'Meu salão'}
        </h1>
        <div className="flex flex-shrink-0 gap-2">
          <a
            href="/reativar"
            className="flex h-10 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Reativar
          </a>
          <a
            href="/cadastro"
            className="flex h-10 items-center rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600"
          >
            + Novo
          </a>
        </div>
      </header>

      {/* Busca */}
      <div className="px-4 pt-4">
        <input
          type="search"
          placeholder="Buscar pelo nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
        {FILTROS.map(({ chave, label }) => (
          <button
            key={chave}
            onClick={() => setFiltro(chave)}
            className={`flex-shrink-0 h-9 rounded-full px-4 text-sm font-medium transition ${
              filtro === chave
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {label} ({contadores[chave] ?? contadores.todos})
          </button>
        ))}
      </div>

      {/* Lista */}
      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="mt-8 text-center text-sm text-zinc-500">
            {busca || filtro !== 'todos'
              ? 'Nenhuma cliente encontrada para essa busca.'
              : 'Nenhuma cliente cadastrada ainda.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clientesFiltrados.map((cliente) => (
              <li
                key={cliente.id}
                className="flex gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <BadgeStatus status={cliente.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{cliente.nome}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {cliente.ultima_visita ? (
                      <>
                        Última visita: {formatarData(cliente.ultima_visita)}
                        {' · '}
                        {textoElapsado(cliente.dias_desde_ultima_visita!)}
                        {cliente.ultimo_servico && ` · ${cliente.ultimo_servico}`}
                      </>
                    ) : (
                      'Sem atendimentos registrados'
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
