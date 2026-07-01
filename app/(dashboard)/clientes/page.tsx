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

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setBusca(q)
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
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
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 pr-14">
        <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
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
          className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:ring-2 focus:ring-primary/40"
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
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
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
          busca || filtro !== 'todos' ? (
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma cliente encontrada para essa busca.
            </p>
          ) : (
            <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
              <span className="text-4xl" aria-hidden="true">👥</span>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Nenhuma cliente ainda
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Suas clientes aparecerão aqui depois de se cadastrarem pelo formulário ou após você registrar um atendimento. Compartilhe o link do formulário com elas!
              </p>
            </div>
          )
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
