'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SkeletonLista } from '@/components/SkeletonLista'
import { formatarData, formatarPreco, dataHoje } from '@/lib/formatters'
import type { AtendimentoHistorico } from '@/types'

// Data de ontem no formato yyyy-mm-dd (fuso local) — só para o rótulo de
// agrupamento visual da timeline (Hoje/Ontem/data); não afeta a consulta.
function dataOntem(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function rotuloGrupo(dataISO: string, hojeStr: string, ontemStr: string): string {
  if (dataISO === hojeStr) return 'Hoje'
  if (dataISO === ontemStr) return 'Ontem'
  return formatarData(dataISO)
}

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function HistoricoPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [anos, setAnos] = useState<number[]>([hoje.getFullYear()])
  const [atendimentos, setAtendimentos] = useState<AtendimentoHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarAnos() {
      const { data } = await supabase.from('atendimentos').select('data_atendimento')

      if (data && data.length > 0) {
        const anosUnicos = [
          ...new Set(
            data.map((d) => new Date(d.data_atendimento + 'T00:00:00').getFullYear()),
          ),
        ].sort((a, b) => b - a)
        setAnos(anosUnicos)
      }
    }

    carregarAnos()
  }, [])

  useEffect(() => {
    async function carregarAtendimentos() {
      setCarregando(true)
      setErro('')

      const mesPadded = String(mes).padStart(2, '0')
      const inicio = `${ano}-${mesPadded}-01`
      const proximoMes =
        mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('atendimentos')
        .select('id, data_atendimento, servico, preco, horario, forma_pagamento, clientes(nome, whatsapp)')
        .gte('data_atendimento', inicio)
        .lt('data_atendimento', proximoMes)
        .order('data_atendimento', { ascending: false })
        .order('criado_em', { ascending: false })

      if (error) {
        setErro('Não foi possível carregar o histórico. Tente novamente.')
      } else {
        setAtendimentos((data ?? []) as unknown as AtendimentoHistorico[])
      }

      setCarregando(false)
    }

    carregarAtendimentos()
  }, [mes, ano])

  const hojeStr = dataHoje()
  const ontemStr = dataOntem()

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <h1 className="text-base font-semibold text-text">Histórico</h1>
        <p className="mt-0.5 text-xs text-text-muted">
          Todos os atendimentos do período
        </p>
      </header>

      <div className="flex gap-3 px-4 pt-4">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="form-select h-11 w-44 flex-shrink-0 text-sm"
        >
          {MESES.map((nome, i) => (
            <option key={i + 1} value={i + 1}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="form-select h-11 w-28 text-sm"
        >
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-danger">
            {erro}
          </p>
        ) : atendimentos.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <span className="text-4xl" aria-hidden="true">📋</span>
            <p className="font-medium text-text">
              Nenhum atendimento em {MESES[mes - 1]} {ano}
            </p>
            <p className="text-sm text-text-muted">
              Registre atendimentos para visualizar o histórico aqui.
            </p>
          </div>
        ) : (
          <ul className="animar-lista flex flex-col gap-4">
            {atendimentos.map((atendimento, i) => {
              const grupo = rotuloGrupo(atendimento.data_atendimento, hojeStr, ontemStr)
              const grupoMudou =
                i === 0 ||
                rotuloGrupo(atendimentos[i - 1].data_atendimento, hojeStr, ontemStr) !== grupo

              return (
                <li key={atendimento.id}>
                  {grupoMudou && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {grupo}
                    </p>
                  )}
                  <div className="rounded-xl border border-border bg-surface px-4 py-4 shadow-sm transition hover:bg-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {atendimento.clientes.nome}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-text-secondary">
                          {atendimento.servico}
                        </p>
                        {atendimento.horario && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {atendimento.horario.slice(0, 5)}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-text-muted">
                          {formatarData(atendimento.data_atendimento)}
                        </p>
                        {atendimento.preco !== null && (
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-text">
                            {formatarPreco(atendimento.preco)}
                          </p>
                        )}
                        {atendimento.forma_pagamento && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {FORMA_PAGAMENTO_LABEL[atendimento.forma_pagamento] ?? atendimento.forma_pagamento}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
