'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SERVICOS_SUGERIDOS = [
  'Manicure',
  'Pedicure',
  'Manicure e pedicure',
  'Spa dos pés',
  'Blindagem',
  'Alongamento de unhas',
  'Nail art',
  'Esmaltação em gel',
]

function dataHoje(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

type Toast = { mensagem: string; tipo: 'sucesso' | 'erro' } | null

function CadastroAtendimento() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteId = searchParams.get('clienteId')

  const [nomeCliente, setNomeCliente] = useState<string | null>(null)
  const [carregandoCliente, setCarregandoCliente] = useState(!!clienteId)
  const [servico, setServico] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(dataHoje)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    if (!clienteId) return
    supabase
      .from('clientes')
      .select('nome')
      .eq('id', clienteId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setNomeCliente(data.nome)
        setCarregandoCliente(false)
      })
  }, [clienteId])

  function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const novosErros: Record<string, string> = {}
    if (!servico.trim()) novosErros.servico = 'Selecione ou descreva o serviço'
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setSalvando(true)

    const { error } = await supabase.from('atendimentos').insert({
      cliente_id: clienteId,
      servico: servico.trim(),
      data_atendimento: dataAtendimento,
    })

    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      setSalvando(false)
      return
    }

    mostrarToast(
      `Atendimento salvo para ${nomeCliente?.split(' ')[0] ?? 'cliente'}`,
      'sucesso',
    )
    setTimeout(() => router.push('/clientes'), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-4 sm:w-80 ${
            toast.tipo === 'sucesso' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.mensagem}
        </div>
      )}

      {/* Cabeçalho */}
      <header className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
        <Link
          href="/clientes"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Voltar para lista de clientes"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Novo atendimento
        </h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-6">
        {!clienteId ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-4xl">💅</p>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Selecione uma cliente na aba Cadastros para registrar o atendimento.
            </p>
            <Link
              href="/clientes"
              className="mt-6 rounded-lg bg-pink-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-pink-600"
            >
              Ver clientes
            </Link>
          </div>
        ) : carregandoCliente ? (
          <div className="flex flex-col gap-4">
            <div className="h-16 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ) : (
          <>
            {/* Nome da cliente */}
            <div className="mb-6 rounded-xl border border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Registrando atendimento para
              </p>
              <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {nomeCliente ?? '—'}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              {/* Serviço */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="servico"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Serviço <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="servico"
                  type="text"
                  list="lista-servicos"
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  disabled={salvando}
                  placeholder="Ex: Manicure, Pedicure…"
                  className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                    erros.servico ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                />
                <datalist id="lista-servicos">
                  {SERVICOS_SUGERIDOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {erros.servico && (
                  <span role="alert" className="text-sm text-red-600">
                    {erros.servico}
                  </span>
                )}
              </div>

              {/* Data do atendimento */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="dataAtendimento"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Data do atendimento <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="dataAtendimento"
                  type="date"
                  value={dataAtendimento}
                  onChange={(e) => setDataAtendimento(e.target.value)}
                  disabled={salvando}
                  className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                />
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="h-12 rounded-lg bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : 'Salvar atendimento'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroAtendimento />
    </Suspense>
  )
}
