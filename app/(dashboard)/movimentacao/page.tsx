'use client'

import { useState, useEffect, useCallback, type ComponentType } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SkeletonLista } from '@/components/SkeletonLista'
import {
  IconePessoa,
  IconeTesoura,
  IconeMensagem,
  IconeBolo,
  IconeAgenda,
  IconeCancelar,
  IconeLupa,
} from '@/components/icons'
import type { FiltroMovimentacao, ItemMovimentacao, TipoMovimentacao } from '@/types'

function calcularCutoff(filtro: FiltroMovimentacao): Date {
  const agora = new Date()
  if (filtro === '24h') return new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  if (filtro === 'semana') return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
}

// Tempo relativo (há X min/h/dias) — mesmo padrão de textoUltimaVisita/textoSemAparecer
// em lib/formatters.ts, só que para timestamps completos em vez de contagem de dias.
function tempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffHoras = Math.round(diffMin / 60)
  if (diffHoras < 24) return `há ${diffHoras}h`
  const diffDias = Math.round(diffHoras / 24)
  return `há ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`
}

type IconeComponente = ComponentType<{ size?: number; className?: string }>

const CONFIG_TIPO: Record<TipoMovimentacao, { Icone: IconeComponente; bg: string; cor: string }> = {
  cadastro: { Icone: IconePessoa, bg: 'var(--color-primary-soft)', cor: 'var(--color-primary)' },
  atendimento: { Icone: IconeTesoura, bg: 'var(--color-success-soft)', cor: 'var(--color-success)' },
  reativacao: { Icone: IconeMensagem, bg: 'var(--color-warning-soft)', cor: 'var(--color-warning)' },
  aniversario: { Icone: IconeBolo, bg: 'var(--color-primary-soft)', cor: 'var(--color-primary)' },
  resumo_mes: { Icone: IconeAgenda, bg: 'var(--color-primary-soft)', cor: 'var(--color-primary)' },
  cancelamento: { Icone: IconeCancelar, bg: 'var(--color-danger-soft)', cor: 'var(--color-danger)' },
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
          .eq('status_cadastro', 'aprovado')
          .gte('criado_em', cutoff),
        supabase
          .from('atendimentos')
          .select('id, servico, criado_em, clientes(nome)')
          .eq('salao_id', salaoId)
          .gte('criado_em', cutoff),
        supabase
          .from('reativacoes')
          .select('id, criado_em, cliente_id, clientes(nome)')
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

      type RowReativacao = {
        id: string
        criado_em: string
        cliente_id: string
        clientes: { nome: string } | { nome: string }[] | null
      }

      const todasReativacoes = (reativacoesData ?? []) as unknown as RowReativacao[]

      if (todasReativacoes.length > 0) {
        const idsClientes = [...new Set(todasReativacoes.map((r) => r.cliente_id))]
        const dataMinima = todasReativacoes
          .reduce((min, r) => (r.criado_em < min ? r.criado_em : min), todasReativacoes[0].criado_em)
          .split('T')[0]

        const { data: atendimentosRetornoData } = await supabase
          .from('atendimentos')
          .select('cliente_id, data_atendimento')
          .eq('salao_id', salaoId)
          .in('cliente_id', idsClientes)
          .gte('data_atendimento', dataMinima)

        const atendimentosRetorno = (atendimentosRetornoData ?? []) as {
          cliente_id: string
          data_atendimento: string
        }[]

        const reativacoesFiltradas = todasReativacoes.filter((r) =>
          atendimentosRetorno.some(
            (a) => a.cliente_id === r.cliente_id && a.data_atendimento >= r.criado_em.split('T')[0]
          )
        )

        for (const row of reativacoesFiltradas) {
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

      // Cancelamentos de agendamento pela cliente (requer coluna cancelado_em — ignorado se ausente)
      const cancelamentosResult = await supabase
        .from('agendamentos')
        .select('id, data, horario, cancelado_em, clientes(nome)')
        .eq('salao_id', salaoId)
        .eq('status', 'cancelado')
        .not('cancelado_em', 'is', null)
        .gte('cancelado_em', cutoff)

      if (!cancelamentosResult.error) {
        type RowCancelamento = {
          id: string
          data: string
          horario: string | null
          cancelado_em: string
          clientes: { nome: string } | { nome: string }[] | null
        }
        for (const c of (cancelamentosResult.data ?? []) as unknown as RowCancelamento[]) {
          const nomeCliente = Array.isArray(c.clientes)
            ? (c.clientes[0]?.nome ?? 'Cliente')
            : (c.clientes?.nome ?? 'Cliente')
          const dataFormatada = c.data.split('-').reverse().join('/')
          const horario = c.horario ? ` às ${c.horario}` : ''
          resultado.push({
            id: `cancelamento-${c.id}`,
            tipo: 'cancelamento',
            descricao: `${nomeCliente} cancelou o agendamento do dia ${dataFormatada}${horario}`,
            criado_em: c.cancelado_em,
          })
        }
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
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <h1 className="text-base font-semibold text-text">
          Movimentação
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Atividades recentes do seu salão
        </p>
      </header>

      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex gap-2">
          {OPCOES_FILTRO.map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => setFiltro(opcao.valor)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                filtro === opcao.valor
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-text-secondary hover:bg-hover'
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
          <p role="alert" className="mt-8 text-center text-sm text-danger">
            {erro}
          </p>
        ) : itens.length === 0 && !cardResumoMes ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <IconeLupa size={40} className="text-text-muted" />
            <p className="font-medium text-text">
              Nenhuma movimentação ainda
            </p>
            <p className="text-sm text-text-muted">
              As ações do sistema aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="animar-lista flex flex-col gap-3">
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
  const config = CONFIG_TIPO[item.tipo]
  const conteudo = (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:bg-hover">
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: config.bg, color: config.cor }}
        aria-hidden="true"
      >
        <config.Icone size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">
          {item.descricao}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {tempoRelativo(item.criado_em)}
        </p>
      </div>
      {item.href && (
        <span className="flex-shrink-0 text-xs font-medium text-primary">
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
