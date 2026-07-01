'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData, formatarWhatsApp, normalizarWhatsApp } from '@/lib/formatters'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'

type ClienteCadastrado = {
  id: string
  nome: string
  whatsapp: string
  email: string | null
  data_nascimento: string | null
  observacoes: string | null
  autoriza_contato: boolean
  status_cadastro: 'pendente' | 'aprovado'
}

export default function CadastrosPage() {
  const [clientes, setClientes] = useState<ClienteCadastrado[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<Record<string, boolean>>({})
  const [confirmarRemoverId, setConfirmarRemoverId] = useState<string | null>(null)
  const { toast, mostrarToast } = useToast()

  useEffect(() => {
    async function buscar() {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, whatsapp, email, data_nascimento, observacoes, autoriza_contato, status_cadastro')
        .eq('origem', 'formulario')
        .order('nome')

      setClientes((data ?? []) as ClienteCadastrado[])
      setCarregando(false)
    }
    buscar()
  }, [])

  async function aprovar(id: string) {
    setProcessando((prev) => ({ ...prev, [id]: true }))
    const { error } = await supabase
      .from('clientes')
      .update({ status_cadastro: 'aprovado' })
      .eq('id', id)

    if (error) {
      mostrarToast('Não foi possível aprovar. Tente novamente.', 'erro')
      setProcessando((prev) => ({ ...prev, [id]: false }))
      return
    }

    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status_cadastro: 'aprovado' as const } : c))
    )
    mostrarToast('Cliente aprovada', 'sucesso')
    setProcessando((prev) => ({ ...prev, [id]: false }))
  }

  async function remover(id: string) {
    setProcessando((prev) => ({ ...prev, [id]: true }))
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) {
      mostrarToast('Não foi possível remover. Tente novamente.', 'erro')
      setProcessando((prev) => ({ ...prev, [id]: false }))
      return
    }

    setClientes((prev) => prev.filter((c) => c.id !== id))
    mostrarToast('Cliente removida', 'sucesso')
    setProcessando((prev) => ({ ...prev, [id]: false }))
  }

  const termo = busca.trim().toLowerCase()
  const filtrar = (lista: ClienteCadastrado[]) =>
    termo
      ? lista.filter(
          (c) =>
            c.nome.toLowerCase().includes(termo) ||
            normalizarWhatsApp(c.whatsapp).includes(normalizarWhatsApp(termo))
        )
      : lista

  const pendentes = filtrar(clientes.filter((c) => c.status_cadastro === 'pendente'))
  const aprovadas = filtrar(clientes.filter((c) => c.status_cadastro === 'aprovado'))
  const totalAprovadas = clientes.filter((c) => c.status_cadastro === 'aprovado').length

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24 dark:bg-slate-900">
      <ToastView toast={toast} />

      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Cadastrados</h1>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Clientes cadastradas pelo formulário público
        </p>
      </header>

      <main className="flex-1 px-4 pt-4">
        <div className="mb-4">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp…"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {carregando ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : pendentes.length === 0 && aprovadas.length === 0 ? (
          busca.trim() ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma cliente encontrada com essa busca.
              </p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-2 text-center px-4">
              <span className="text-4xl" aria-hidden="true">📋</span>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Nenhum cadastro ainda
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Quando uma cliente preencher o formulário público, ela aparecerá aqui aguardando sua aprovação.
              </p>
            </div>
          )
        ) : (
          <>
            {pendentes.length > 0 && (
              <section className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Aguardando aprovação
                  </h2>
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-white">
                    {pendentes.length}
                  </span>
                </div>

                <ul className="flex flex-col gap-3">
                  {pendentes.map((cliente) => (
                    <li
                      key={cliente.id}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/30 dark:bg-amber-950/20"
                    >
                      <p className="font-medium text-slate-900 dark:text-slate-100">{cliente.nome}</p>

                      <div className="mt-2 flex flex-col gap-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          📱 {formatarWhatsApp(cliente.whatsapp)}
                        </p>
                        {cliente.email && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            ✉️ {cliente.email}
                          </p>
                        )}
                        {cliente.data_nascimento && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            🎂 {formatarData(cliente.data_nascimento)}
                          </p>
                        )}
                        {cliente.observacoes && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            📝 {cliente.observacoes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => aprovar(cliente.id)}
                          disabled={processando[cliente.id]}
                          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-green-500 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processando[cliente.id] ? '…' : '✅ Aprovar'}
                        </button>
                        <button
                          onClick={() => setConfirmarRemoverId(cliente.id)}
                          disabled={processando[cliente.id]}
                          className="flex h-9 flex-1 items-center justify-center rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          {processando[cliente.id] ? '…' : '❌ Não conheço'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {totalAprovadas > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Cadastradas
                </h2>

                {aprovadas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                    Nenhuma cliente encontrada com essa busca.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {aprovadas.map((cliente) => (
                      <li
                        key={cliente.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <p className="font-medium text-slate-900 dark:text-slate-100">{cliente.nome}</p>

                        <div className="mt-2 flex flex-col gap-1">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            📱 {formatarWhatsApp(cliente.whatsapp)}
                          </p>
                          {cliente.email && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              ✉️ {cliente.email}
                            </p>
                          )}
                          {cliente.data_nascimento && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              🎂 {formatarData(cliente.data_nascimento)}
                            </p>
                          )}
                          {cliente.observacoes && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              📝 {cliente.observacoes}
                            </p>
                          )}
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {cliente.autoriza_contato
                              ? '✅ Autoriza contato via WhatsApp'
                              : '❌ Não autoriza contato via WhatsApp'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {confirmarRemoverId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-titulo"
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center"
          style={{ background: 'rgba(9,9,11,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2
              id="dialog-titulo"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Tem certeza?
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Esta ação é permanente e não pode ser desfeita. A cliente será removida do sistema.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmarRemoverId(null)}
                className="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = confirmarRemoverId
                  setConfirmarRemoverId(null)
                  remover(id)
                }}
                disabled={processando[confirmarRemoverId]}
                className="flex h-11 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processando[confirmarRemoverId] ? '…' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
