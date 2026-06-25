'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'

type ChaveDia = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

type ConfigDia = {
  ativo: boolean
  inicio: string
  fim: string
  pausaAtivo: boolean
  pausaInicio: string
  pausaFim: string
}

type Agendamento = {
  id: string
  cliente_id: string
  data: string
  horario: string | null
  servico: string | null
  status: string
  observacoes: string | null
  clientes: { nome: string } | null
}

const DIAS: { key: ChaveDia; label: string }[] = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const PADRAO_DIA: ConfigDia = {
  ativo: false,
  inicio: '09:00',
  fim: '18:00',
  pausaAtivo: false,
  pausaInicio: '12:00',
  pausaFim: '13:00',
}

function diasPadrao(): Record<ChaveDia, ConfigDia> {
  return {
    segunda: { ...PADRAO_DIA },
    terca: { ...PADRAO_DIA },
    quarta: { ...PADRAO_DIA },
    quinta: { ...PADRAO_DIA },
    sexta: { ...PADRAO_DIA },
    sabado: { ...PADRAO_DIA },
    domingo: { ...PADRAO_DIA },
  }
}

function parsearDiaJsonb(raw: unknown): ConfigDia {
  if (!raw || typeof raw !== 'object') return { ...PADRAO_DIA }
  const d = raw as Record<string, unknown>
  const pausaInicio = typeof d.pausa_inicio === 'string' ? d.pausa_inicio : ''
  const pausaFim = typeof d.pausa_fim === 'string' ? d.pausa_fim : ''
  return {
    ativo: Boolean(d.ativo),
    inicio: typeof d.inicio === 'string' ? d.inicio : '09:00',
    fim: typeof d.fim === 'string' ? d.fim : '18:00',
    pausaAtivo: pausaInicio !== '' && pausaInicio !== null,
    pausaInicio: pausaInicio || '12:00',
    pausaFim: pausaFim || '13:00',
  }
}

function serializarDia(config: ConfigDia): object {
  return {
    ativo: config.ativo,
    inicio: config.inicio,
    fim: config.fim,
    pausa_inicio: config.ativo && config.pausaAtivo ? config.pausaInicio : null,
    pausa_fim: config.ativo && config.pausaAtivo ? config.pausaFim : null,
  }
}

function formatarDataBR(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarPreco(digits: string): string {
  const centavos = parseInt(digits || '0', 10)
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AgendaPage() {
  const [idSalao, setIdSalao] = useState<string | null>(null)
  const [plano, setPlano] = useState<string>('basic')
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'configurar' | 'agendamentos'>('configurar')

  const [dias, setDias] = useState<Record<ChaveDia, ConfigDia>>(diasPadrao())
  const [duracaoAtendimento, setDuracaoAtendimento] = useState<number>(60)
  const [intervaloEntre, setIntervaloEntre] = useState<number>(0)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [linkAgendamento, setLinkAgendamento] = useState('')
  const [copiado, setCopiado] = useState(false)

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [processando, setProcessando] = useState<Record<string, boolean>>({})
  const [modalCompareceu, setModalCompareceu] = useState<Agendamento | null>(null)
  const [precoInput, setPrecoInput] = useState('')
  const [formaPagamentoModal, setFormaPagamentoModal] = useState('')

  const { toast, mostrarToast } = useToast()

  useEffect(() => {
    async function carregar() {
      const { data: config } = await supabase
        .from('salao_config')
        .select('id, plano')
        .single()

      if (!config) {
        setCarregando(false)
        return
      }

      const planoAtual = (config.plano as string | null) ?? 'basic'
      setPlano(planoAtual)
      setIdSalao(config.id)
      setLinkAgendamento(`${window.location.origin}/agendar/${config.id}`)

      if (planoAtual !== 'profissional' && planoAtual !== 'master') {
        setCarregando(false)
        return
      }

      const hoje = new Date().toISOString().split('T')[0]

      const [{ data: horarios }, { data: agData }] = await Promise.all([
        supabase
          .from('horarios_disponiveis')
          .select('*')
          .maybeSingle(),
        supabase
          .from('agendamentos')
          .select('id, cliente_id, data, horario, servico, status, observacoes, clientes(nome)')
          .eq('salao_id', config.id)
          .gte('data', hoje)
          .order('data', { ascending: true })
          .order('horario', { ascending: true, nullsFirst: false }),
      ])

      if (horarios) {
        const novosDias = diasPadrao()
        for (const chave of Object.keys(novosDias) as ChaveDia[]) {
          novosDias[chave] = parsearDiaJsonb((horarios as Record<string, unknown>)[chave])
        }
        setDias(novosDias)
        setDuracaoAtendimento((horarios.duracao_atendimento as number | null) ?? 60)
        setIntervaloEntre((horarios.intervalo_entre as number | null) ?? 0)
      }

      setAgendamentos((agData ?? []) as unknown as Agendamento[])
      setCarregando(false)
    }

    carregar()
  }, [])

  async function salvarConfig() {
    if (!idSalao) return
    setSalvandoConfig(true)

    const payload: Record<string, unknown> = {
      duracao_atendimento: duracaoAtendimento,
      intervalo_entre: intervaloEntre,
    }
    for (const chave of Object.keys(dias) as ChaveDia[]) {
      payload[chave] = serializarDia(dias[chave])
    }

    const { data: existing } = await supabase
      .from('horarios_disponiveis')
      .select('salao_id')
      .maybeSingle()

    let error
    if (existing) {
      ;({ error } = await supabase
        .from('horarios_disponiveis')
        .update(payload)
        .eq('salao_id', idSalao))
    } else {
      ;({ error } = await supabase
        .from('horarios_disponiveis')
        .insert({ ...payload, salao_id: idSalao }))
    }

    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
    } else {
      mostrarToast('Configuração salva', 'sucesso')
    }
    setSalvandoConfig(false)
  }

  async function marcarCompareceu(ag: Agendamento, preco: number | null, formaPagamento: string | null) {
    if (!idSalao) return
    setProcessando((prev) => ({ ...prev, [ag.id]: true }))

    const [{ error: errStatus }, { error: errAt }] = await Promise.all([
      supabase
        .from('agendamentos')
        .update({ status: 'compareceu' })
        .eq('id', ag.id),
      supabase.from('atendimentos').insert({
        cliente_id: ag.cliente_id,
        salao_id: idSalao,
        servico: ag.servico ?? '',
        data_atendimento: ag.data,
        horario: ag.horario,
        preco,
        forma_pagamento: formaPagamento,
      }),
    ])

    if (errStatus || errAt) {
      mostrarToast('Não foi possível registrar. Tente novamente.', 'erro')
      setProcessando((prev) => ({ ...prev, [ag.id]: false }))
      return
    }

    setAgendamentos((prev) =>
      prev.map((a) => (a.id === ag.id ? { ...a, status: 'compareceu' } : a)),
    )
    mostrarToast('Atendimento registrado', 'sucesso')
    setProcessando((prev) => ({ ...prev, [ag.id]: false }))
  }

  async function marcarFaltou(id: string) {
    setProcessando((prev) => ({ ...prev, [id]: true }))

    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'faltou' })
      .eq('id', id)

    if (error) {
      mostrarToast('Não foi possível registrar. Tente novamente.', 'erro')
      setProcessando((prev) => ({ ...prev, [id]: false }))
      return
    }

    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'faltou' } : a)),
    )
    mostrarToast('Registrado como faltou', 'sucesso')
    setProcessando((prev) => ({ ...prev, [id]: false }))
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkAgendamento)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function atualizarDia(chave: ChaveDia, campo: keyof ConfigDia, valor: string | boolean) {
    setDias((prev) => ({
      ...prev,
      [chave]: { ...prev[chave], [campo]: valor },
    }))
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    )
  }

  if (plano !== 'profissional' && plano !== 'master') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Recurso exclusivo
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          A Agenda está disponível nos planos Profissional e Master.
        </p>
      </div>
    )
  }

  const agendamentosPendentes = agendamentos.filter((a) => a.status === 'pendente')
  const agendamentosProcessados = agendamentos.filter(
    (a) => a.status === 'compareceu' || a.status === 'faltou',
  )

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24 dark:bg-zinc-950">
      <ToastView toast={toast} />

      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Agenda</h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Configure seus horários e gerencie agendamentos
        </p>
      </header>

      {/* Abas */}
      <div className="sticky top-14 z-10 flex border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setAba('configurar')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            aba === 'configurar'
              ? 'border-b-2 border-pink-500 text-pink-600 dark:text-pink-400'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Configurar
        </button>
        <button
          onClick={() => setAba('agendamentos')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            aba === 'agendamentos'
              ? 'border-b-2 border-pink-500 text-pink-600 dark:text-pink-400'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Agendamentos
          {agendamentosPendentes.length > 0 && (
            <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
              {agendamentosPendentes.length}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 px-4 pt-4">
        {aba === 'configurar' && (
          <div className="flex flex-col gap-5">
            {/* Link de agendamento */}
            {linkAgendamento && (
              <div className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Link de agendamento
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Compartilhe para que suas clientes possam agendar online
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {linkAgendamento}
                  </span>
                  <button
                    onClick={copiarLink}
                    className="flex-shrink-0 rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700"
                  >
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* Configurações gerais */}
            <div className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Configurações gerais
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Duração do atendimento
                  </label>
                  <select
                    value={duracaoAtendimento}
                    onChange={(e) => setDuracaoAtendimento(Number(e.target.value))}
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Intervalo entre atendimentos
                  </label>
                  <select
                    value={intervaloEntre}
                    onChange={(e) => setIntervaloEntre(Number(e.target.value))}
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value={0}>Sem intervalo</option>
                    <option value={10}>10 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dias da semana */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Dias e horários
              </p>
              {DIAS.map(({ key, label }) => {
                const dia = dias[key]
                return (
                  <div
                    key={key}
                    className={`rounded-xl border bg-white p-4 transition dark:bg-zinc-900 ${
                      dia.ativo
                        ? 'border-pink-200 dark:border-pink-900/40'
                        : 'border-zinc-100 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {label}
                      </span>
                      <button
                        role="switch"
                        aria-checked={dia.ativo}
                        onClick={() => atualizarDia(key, 'ativo', !dia.ativo)}
                        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                          dia.ativo ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            dia.ativo ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {dia.ativo && (
                      <div className="mt-4 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Início
                            </label>
                            <input
                              type="time"
                              value={dia.inicio}
                              onChange={(e) => atualizarDia(key, 'inicio', e.target.value)}
                              className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Fim
                            </label>
                            <input
                              type="time"
                              value={dia.fim}
                              onChange={(e) => atualizarDia(key, 'fim', e.target.value)}
                              className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            role="switch"
                            aria-checked={dia.pausaAtivo}
                            onClick={() => atualizarDia(key, 'pausaAtivo', !dia.pausaAtivo)}
                            className={`relative flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${
                              dia.pausaAtivo ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                dia.pausaAtivo ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Pausa / almoço
                          </span>
                        </div>

                        {dia.pausaAtivo && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Pausa início
                              </label>
                              <input
                                type="time"
                                value={dia.pausaInicio}
                                onChange={(e) =>
                                  atualizarDia(key, 'pausaInicio', e.target.value)
                                }
                                className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Pausa fim
                              </label>
                              <input
                                type="time"
                                value={dia.pausaFim}
                                onChange={(e) => atualizarDia(key, 'pausaFim', e.target.value)}
                                className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={salvarConfig}
              disabled={salvandoConfig}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-pink-500 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvandoConfig ? 'Salvando…' : 'Salvar configuração'}
            </button>
          </div>
        )}

        {aba === 'agendamentos' && (
          <div className="flex flex-col gap-4">
            {agendamentos.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-4">
                <span className="text-4xl" aria-hidden="true">📅</span>
                <p className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">
                  Nenhum agendamento ainda
                </p>
                <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                  Configure seus horários de trabalho acima e compartilhe o link de agendamento com suas clientes. Os agendamentos marcados aparecerão aqui.
                </p>
              </div>
            ) : (
              <>
                {agendamentosPendentes.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Aguardando confirmação
                    </h2>
                    <ul className="flex flex-col gap-3">
                      {agendamentosPendentes.map((ag) => (
                        <li
                          key={ag.id}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/30 dark:bg-amber-950/20"
                        >
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {ag.clientes?.nome ?? '—'}
                          </p>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              📅 {formatarDataBR(ag.data)}
                              {ag.horario ? ` às ${ag.horario}` : ''}
                            </p>
                            {ag.servico && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                ✂️ {ag.servico}
                              </p>
                            )}
                            {ag.observacoes && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                📝 {ag.observacoes}
                              </p>
                            )}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => { setModalCompareceu(ag); setPrecoInput(''); setFormaPagamentoModal('') }}
                              disabled={processando[ag.id]}
                              className="flex h-9 flex-1 items-center justify-center rounded-lg bg-green-500 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processando[ag.id] ? '…' : '✅ Compareceu'}
                            </button>
                            <button
                              onClick={() => marcarFaltou(ag.id)}
                              disabled={processando[ag.id]}
                              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              {processando[ag.id] ? '…' : '❌ Faltou'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {agendamentosProcessados.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Concluídos
                    </h2>
                    <ul className="flex flex-col gap-3">
                      {agendamentosProcessados.map((ag) => (
                        <li
                          key={ag.id}
                          className="rounded-xl border border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {ag.clientes?.nome ?? '—'}
                            </p>
                            <span
                              className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                ag.status === 'compareceu'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                              }`}
                            >
                              {ag.status === 'compareceu' ? 'Compareceu' : 'Faltou'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              📅 {formatarDataBR(ag.data)}
                              {ag.horario ? ` às ${ag.horario}` : ''}
                            </p>
                            {ag.servico && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                ✂️ {ag.servico}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {modalCompareceu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4 sm:pb-4"
          onClick={() => setModalCompareceu(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-6 dark:bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Registrar atendimento
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {modalCompareceu.clientes?.nome ?? '—'}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Valor do serviço (opcional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={precoInput ? formatarPreco(precoInput) : ''}
                  placeholder="R$ 0,00"
                  onChange={(e) => setPrecoInput(e.target.value.replace(/\D/g, ''))}
                  className="h-11 rounded-xl border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Forma de pagamento (opcional)
                </label>
                <select
                  value={formaPagamentoModal}
                  onChange={(e) => setFormaPagamentoModal(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Selecionar…</option>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  const ag = modalCompareceu
                  setModalCompareceu(null)
                  marcarCompareceu(ag, null, null)
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Pular
              </button>
              <button
                onClick={() => {
                  const ag = modalCompareceu
                  const preco = precoInput ? parseInt(precoInput, 10) / 100 : null
                  const fp = formaPagamentoModal || null
                  setModalCompareceu(null)
                  setPrecoInput('')
                  setFormaPagamentoModal('')
                  marcarCompareceu(ag, preco, fp)
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-green-500 text-sm font-semibold text-white transition hover:bg-green-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
