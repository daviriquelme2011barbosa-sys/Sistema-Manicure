'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { dataHoje, parsearPreco } from '@/lib/formatters'
import { SERVICOS_SUGERIDOS } from '@/lib/constantes'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'
import { IconeFechar } from '@/components/icons'
import { useHeader } from '@/lib/header-context'

type ClienteBusca = {
  id: string
  nome: string
  whatsapp: string
}

function BuscaCliente({
  clientes,
  carregando,
  onSelecionar,
}: {
  clientes: ClienteBusca[]
  carregando: boolean
  onSelecionar: (cliente: ClienteBusca) => void
}) {
  const [busca, setBusca] = useState('')

  const listaFiltrada = busca.trim()
    ? clientes.filter((c) =>
        c.nome.toLowerCase().includes(busca.trim().toLowerCase())
      )
    : clientes

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="busca-cliente"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Buscar cliente pelo nome
        </label>
        <input
          id="busca-cliente"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome da cliente…"
          autoComplete="off"
          className="mt-1 h-12 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="shimmer h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Nenhuma cliente encontrada
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          {listaFiltrada.map((c) => (
            <li key={c.id} className="border-b border-zinc-50 dark:border-zinc-800 last:border-0">
              <button
                type="button"
                onClick={() => onSelecionar(c)}
                className="w-full px-4 py-3 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 transition hover:bg-pink-50 dark:hover:bg-pink-950/20 active:bg-pink-100"
              >
                {c.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CadastroPage() {
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteBusca | null>(null)
  const [todasClientes, setTodasClientes] = useState<ClienteBusca[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [servico, setServico] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(dataHoje)
  const [horario, setHorario] = useState('')
  const [preco, setPreco] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const { toast, mostrarToast } = useToast()
  const { definirAcaoVoltar } = useHeader()
  const router = useRouter()

  useEffect(() => {
    async function inicializar() {
      const [configResult, clientesResult] = await Promise.all([
        supabase.from('salao_config').select('id, plano').single(),
        supabase.from('clientes').select('id, nome, whatsapp').order('nome'),
      ])

      if (configResult.data) {
        const plano = (configResult.data.plano as string | null) ?? 'basic'
        if (plano === 'profissional' || plano === 'master') {
          router.replace('/agenda')
          return
        }
        setSalaoId(configResult.data.id)
      }
      setTodasClientes((clientesResult.data ?? []) as ClienteBusca[])
      setCarregandoClientes(false)
    }

    inicializar()
  }, [])

  const limpar = useCallback(() => {
    setClienteSelecionado(null)
    setServico('')
    setDataAtendimento(dataHoje)
    setHorario('')
    setPreco('')
    setFormaPagamento('')
    setErros({})
  }, [])

  useEffect(() => {
    definirAcaoVoltar(clienteSelecionado ? limpar : null)
  }, [clienteSelecionado, limpar, definirAcaoVoltar])

  useEffect(() => {
    return () => { definirAcaoVoltar(null) }
  }, [definirAcaoVoltar])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const novosErros: Record<string, string> = {}
    if (!servico.trim()) novosErros.servico = 'Selecione ou descreva o serviço'

    const precoNum = preco.trim() ? parsearPreco(preco) : null
    if (preco.trim() && (precoNum === null || precoNum < 0)) {
      novosErros.preco = 'Valor inválido'
    }

    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setSalvando(true)

    const { error } = await supabase.from('atendimentos').insert({
      cliente_id: clienteSelecionado!.id,
      servico: servico.trim(),
      data_atendimento: dataAtendimento,
      horario: horario || null,
      preco: precoNum,
      forma_pagamento: formaPagamento || null,
      salao_id: salaoId,
    })

    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      setSalvando(false)
      return
    }

    mostrarToast(
      `Atendimento salvo para ${clienteSelecionado!.nome.split(' ')[0]}`,
      'sucesso',
    )
    setSalvando(false)
    limpar()
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <ToastView toast={toast} />

      <header className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Registrar Atendimento
        </h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-6">
        {!clienteSelecionado ? (
          <BuscaCliente
            clientes={todasClientes}
            carregando={carregandoClientes}
            onSelecionar={setClienteSelecionado}
          />
        ) : (
          <>
            {/* Cliente selecionado */}
            <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Registrando atendimento para
                </p>
                <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {clienteSelecionado.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={limpar}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Trocar cliente"
              >
                <IconeFechar />
              </button>
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

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dataAtendimento"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Data <span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    id="dataAtendimento"
                    type="date"
                    value={dataAtendimento}
                    onChange={(e) => setDataAtendimento(e.target.value)}
                    disabled={salvando}
                    className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="horario"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Horário
                    <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
                  </label>
                  <input
                    id="horario"
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    disabled={salvando}
                    className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                  />
                </div>
              </div>

              {/* Preço */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="preco"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Preço
                  <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-base text-zinc-400 dark:text-zinc-500">
                    R$
                  </span>
                  <input
                    id="preco"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    disabled={salvando}
                    placeholder="0,00"
                    className={`h-12 w-full rounded-lg border pl-10 pr-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                      erros.preco ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                  />
                </div>
                {erros.preco && (
                  <span role="alert" className="text-sm text-red-600">
                    {erros.preco}
                  </span>
                )}
              </div>

              {/* Forma de pagamento */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="formaPagamento"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Forma de pagamento
                  <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
                </label>
                <select
                  id="formaPagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  disabled={salvando}
                  className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                >
                  <option value="">Selecionar…</option>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="h-12 rounded-lg bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : 'Registrar atendimento'}
              </button>

              <button
                type="button"
                onClick={limpar}
                disabled={salvando}
                className="h-12 rounded-lg border border-zinc-300 bg-white font-semibold text-zinc-700 transition hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar registro
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
