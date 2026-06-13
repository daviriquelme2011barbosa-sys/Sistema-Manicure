'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'
import { SkeletonLista } from '@/components/SkeletonLista'
import { ClienteCard } from '@/components/ClienteCard'
import { ModalEdicaoCliente } from '@/components/ModalEdicaoCliente'
import type { ClienteStatus, StatusCliente } from '@/types'

type FiltroStatus = 'todos' | 'verde' | 'amarelo' | 'vermelho'

const ORDEM_STATUS: Record<StatusCliente, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
  sem_atendimento: 3,
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteStatus[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [nomeSalao, setNomeSalao] = useState('')
  const { toast, mostrarToast } = useToast()
  const [clienteEditando, setClienteEditando] = useState<ClienteStatus | null>(null)

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

      if (configData) setNomeSalao((configData as { nome_salao: string }).nome_salao)

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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <ToastView toast={toast} />

      {clienteEditando && (
        <ModalEdicaoCliente
          key={clienteEditando.id}
          cliente={clienteEditando}
          onFechar={() => setClienteEditando(null)}
          onSalvo={(atualizado) =>
            setClientes((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)))
          }
          onExcluido={(id) => setClientes((prev) => prev.filter((c) => c.id !== id))}
          mostrarToast={mostrarToast}
        />
      )}

      {/* Barra superior */}
      <header className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 pr-14">
        <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {nomeSalao || 'Meu salão'}
        </h1>
      </header>

      {/* Busca */}
      <div className="px-4 pt-4">
        <input
          type="search"
          placeholder="Buscar pelo nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500"
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
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
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
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {busca || filtro !== 'todos'
              ? 'Nenhuma cliente encontrada para essa busca.'
              : 'Nenhuma cliente cadastrada ainda.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clientesFiltrados.map((cliente) => (
              <ClienteCard key={cliente.id} cliente={cliente} onEditar={setClienteEditando} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
