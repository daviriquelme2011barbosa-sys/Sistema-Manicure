'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SkeletonLista } from '@/components/SkeletonLista'
import { formatarData, formatarPreco } from '@/lib/formatters'
import type { AtendimentoHistorico } from '@/types'

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
        .select('id, data_atendimento, servico, preco, horario, clientes(nome, whatsapp)')
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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Histórico</h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Todos os atendimentos do período
        </p>
      </header>

      <div className="flex gap-3 px-4 pt-4">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
          className="h-11 w-28 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : atendimentos.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <span className="text-4xl" aria-hidden="true">📋</span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum atendimento em {MESES[mes - 1]} {ano}
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Registre atendimentos para visualizar o histórico aqui.
            </p>
          </div>
        ) : (
          <ul className="animar-lista flex flex-col gap-3">
            {atendimentos.map((atendimento) => (
              <li
                key={atendimento.id}
                className="rounded-xl bg-white px-4 py-4 shadow-sm dark:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {atendimento.clientes.nome}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {atendimento.servico}
                    </p>
                    {atendimento.horario && (
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {atendimento.horario}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatarData(atendimento.data_atendimento)}
                    </p>
                    {atendimento.preco !== null && (
                      <p className="mt-0.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatarPreco(atendimento.preco)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
