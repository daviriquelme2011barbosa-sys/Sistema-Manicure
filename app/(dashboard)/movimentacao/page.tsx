'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SkeletonLista } from '@/components/SkeletonLista'
import type { FiltroMovimentacao, ItemMovimentacao, TipoMovimentacao } from '@/types'

function calcularCutoff(filtro: FiltroMovimentacao): Date {
  const agora = new Date()
  if (filtro === '24h') return new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  if (filtro === 'semana') return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function iconeParaTipo(tipo: TipoMovimentacao): string {
  const mapa: Record<TipoMovimentacao, string> = {
    cadastro: '👤',
    atendimento: '✂️',
    reativacao: '💬',
    aniversario: '🎂',
    resumo_mes: '📅',
  }
  return mapa[tipo]
}

const OPCOES_FILTRO: { valor: FiltroMovimentacao; rotulo: string }[] = [
  { valor: '24h', rotulo: 'Últimas 24h' },
  { valor: 'semana', rotulo: 'Última semana' },
  { valor: 'mes', rotulo: 'Último mês' },
]

export default function MovimentacaoPage() {
  const [filtro, setFiltro] = useState<FiltroMovimentacao>('24h')
  const [itens, setItens] = useState<ItemMovimentacao[]>([])
  const [cardResumoMes, setCardResumoMes] = useState<ItemMovimentacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')

    try {
      const { data: configData, error: configError } = await supabase
        .from('salao_config')
        .select('id')
        .single()

      if (configError) throw configError
      const salaoId = configData.id

      const cutoff = calcularCutoff(filtro).toISOString()
      const agora = new Date()
      const mesAtual = agora.getMonth() + 1
      const diaAtual = agora.getDate()

      const [
        { data: cadastrosData, error: cadastrosError },
        { data: atendimentosData, error: atendimentosError },
        { data: reativacoesData, error: reativacoesError },
        { data: aniversariantesData, error: aniversariantesError },
      ] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome, criado_em')
          .eq('salao_id', salaoId)
          .eq('origem', 'formulario')
          .gte('criado_em', cutoff),
        supabase
          .from('atendimentos')
          .select('id, servico, criado_em, clientes(nome)')
          .eq('salao_id', salaoId)
          .gte('criado_em', cutoff),
        supabase
          .from('reativacoes')
          .select('id, criado_em, clientes(nome)')
          .eq('salao_id', salaoId)
          .gte('criado_em', cutoff),
        supabase
          .from('clientes')
          .select('id, nome, data_nascimento')
          .eq('salao_id', salaoId)
          .not('data_nascimento', 'is', null),
      ])

      if (cadastrosError) throw cadastrosError
      if (atendimentosError) throw atendimentosError
      if (reativacoesError) throw reativacoesError
      if (aniversariantesError) throw aniversariantesError

      const resultado: ItemMovimentacao[] = []

      for (const c of cadastrosData ?? []) {
        const row = c as { id: string; nome: string; criado_em: string }
        resultado.push({
          id: `cadastro-${row.id}`,
          tipo: 'cadastro',
          descricao: `${row.nome} se cadastrou pelo formulário`,
          criado_em: row.criado_em,
        })
      }

      for (const a of atendimentosData ?? []) {
        const row = (a as unknown) as {
          id: string
          servico: string
          criado_em: string
          clientes: { nome: string } | { nome: string }[] | null
        }
        const clienteNome = Array.isArray(row.clientes)
          ? row.clientes[0]?.nome
          : row.clientes?.nome
        const nomeCliente = clienteNome ?? 'Cliente'
        resultado.push({
          id: `atendimento-${row.id}`,
          tipo: 'atendimento',
          descricao: `Atendimento de ${nomeCliente} registrado — ${row.servico}`,
          criado_em: row.criado_em,
        })
      }

      for (const r of reativacoesData ?? []) {
        const row = (r as unknown) as {
          id: string
          criado_em: string
          clientes: { nome: string } | { nome: string }[] | null
        }
        const clienteNome = Array.isArray(row.clientes)
          ? row.clientes[0]?.nome
          : row.clientes?.nome
        const nomeCliente = clienteNome ?? 'Cliente'
        resultado.push({
          id: `reativacao-${row.id}`,
          tipo: 'reativacao',
          descricao: `Reativação enviada para ${nomeCliente}`,
          criado_em: row.criado_em,
        })
      }

      const todosAniversariantes = (aniversariantesData ?? []) as {
        id: string
        nome: string
        data_nascimento: string
      }[]

      const aniversariantesHoje = todosAniversariantes.filter((c) => {
        const partes = c.data_nascimento.split('-')
        return (
          parseInt(partes[1], 10) === mesAtual &&
          parseInt(partes[2], 10) === diaAtual
        )
      })

      for (const a of aniversariantesHoje) {
        resultado.push({
          id: `aniversario-${a.id}`,
          tipo: 'aniversario',
          descricao: `Hoje é aniversário de ${a.nome}!`,
          criado_em: agora.toISOString(),
          href: '/aniversariantes',
        })
      }

      resultado.sort((a, b) => b.criado_em.localeCompare(a.criado_em))
      setItens(resultado)

      if (diaAtual === 1) {
        const totalAnivers = todosAniversariantes.filter(
          (c) => parseInt(c.data_nascimento.split('-')[1], 10) === mesAtual
        ).length

        setCardResumoMes({
          id: 'resumo-mes',
          tipo: 'resumo_mes',
          descricao: `Este mês tem ${totalAnivers} ${totalAnivers === 1 ? 'aniversariante' : 'aniversariantes'}`,
          criado_em: agora.toISOString(),
          href: '/aniversariantes',
        })
      } else {
        setCardResumoMes(null)
      }
    } catch {
      setErro('Não foi possível carregar. Tente novamente.')
    }

    setCarregando(false)
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Movimentação
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Atividades recentes do seu salão
        </p>
      </header>

      <div className="border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-2">
          {OPCOES_FILTRO.map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => setFiltro(opcao.valor)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                filtro === opcao.valor
                  ? 'bg-pink-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={5} />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : itens.length === 0 && !cardResumoMes ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">
              🔍
            </span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhuma atividade neste período
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Registre um atendimento ou reative uma cliente para aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cardResumoMes && <CardMovimentacao item={cardResumoMes} />}
            {itens.map((item) => (
              <CardMovimentacao key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function CardMovimentacao({ item }: { item: ItemMovimentacao }) {
  const conteudo = (
    <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm transition dark:bg-zinc-800">
      <span className="flex-shrink-0 text-xl" aria-hidden="true">
        {iconeParaTipo(item.tipo)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {item.descricao}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          {formatarDataHora(item.criado_em)}
        </p>
      </div>
      {item.href && (
        <span className="flex-shrink-0 text-xs font-medium text-pink-500 dark:text-pink-400">
          Ver →
        </span>
      )}
    </div>
  )

  if (item.href) {
    return <Link href={item.href}>{conteudo}</Link>
  }
  return conteudo
}
