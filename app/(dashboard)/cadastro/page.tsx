'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { dataHoje, parsearPreco } from '@/lib/formatters'
import { SERVICOS_SUGERIDOS } from '@/lib/constantes'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'
import { IconeFechar, IconeAlerta } from '@/components/icons'
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
        <label htmlFor="busca-cliente" className="form-label">
          Buscar cliente pelo nome
        </label>
        <input
          id="busca-cliente"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome da cliente…"
          autoComplete="off"
          className="form-input"
        />
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="shimmer h-12 rounded-xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
          Nenhuma cliente encontrada
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          {listaFiltrada.map((c) => (
            <li key={c.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
              <button
                type="button"
                onClick={() => onSelecionar(c)}
                className="w-full px-4 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100 transition hover:bg-primary-soft dark:hover:bg-primary-soft active:bg-primary-soft"
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <ToastView toast={toast} />

      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
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
            <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Registrando atendimento para
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {clienteSelecionado.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={limpar}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                aria-label="Trocar cliente"
              >
                <IconeFechar />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              {/* Serviço */}
              <div className="flex flex-col">
                <label htmlFor="servico" className="form-label">
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
                  className={`form-input${erros.servico ? ' form-input-erro' : ''}`}
                />
                <datalist id="lista-servicos">
                  {SERVICOS_SUGERIDOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {erros.servico && (
                  <span role="alert" className="form-error">
                    <IconeAlerta />
                    {erros.servico}
                  </span>
                )}
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label htmlFor="dataAtendimento" className="form-label">
                    Data <span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    id="dataAtendimento"
                    type="date"
                    value={dataAtendimento}
                    onChange={(e) => setDataAtendimento(e.target.value)}
                    disabled={salvando}
                    className="form-input px-3"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="horario" className="form-label">
                    Horário
                    <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
                  </label>
                  <input
                    id="horario"
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    disabled={salvando}
                    className="form-input px-3"
                  />
                </div>
              </div>

              {/* Preço */}
              <div className="flex flex-col">
                <label htmlFor="preco" className="form-label">
                  Preço
                  <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-base text-slate-400 dark:text-slate-500">
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
                    className={`form-input pl-10${erros.preco ? ' form-input-erro' : ''}`}
                  />
                </div>
                {erros.preco && (
                  <span role="alert" className="form-error">
                    <IconeAlerta />
                    {erros.preco}
                  </span>
                )}
              </div>

              {/* Forma de pagamento */}
              <div className="flex flex-col">
                <label htmlFor="formaPagamento" className="form-label">
                  Forma de pagamento
                  <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
                </label>
                <select
                  id="formaPagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  disabled={salvando}
                  className="form-select"
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
                className="btn-primary active:scale-[0.98]"
              >
                {salvando && <span className="form-spinner" aria-hidden="true" />}
                {salvando ? 'Salvando...' : 'Registrar atendimento'}
              </button>

              <button
                type="button"
                onClick={limpar}
                disabled={salvando}
                className="btn-secondary"
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
