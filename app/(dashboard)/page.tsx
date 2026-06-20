'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type DadosDashboard = {
  clientesAtivas: number
  clientesSumidas: number
  aniversariantesDoMes: number
  atendimentosDoMes: number
  faturamentoDoMes: number
  totalClientes: number
  movimentacoesHoje: number
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function gradienteGreeting(): string {
  const hora = new Date().getHours()
  if (hora < 12)
    return 'from-amber-50 via-rose-50 to-pink-50 dark:from-amber-950/20 dark:via-rose-950/20 dark:to-pink-950/20'
  if (hora < 18)
    return 'from-sky-50 via-rose-50 to-pink-50 dark:from-sky-950/20 dark:via-rose-950/20 dark:to-pink-950/20'
  return 'from-violet-50 via-rose-50 to-pink-50 dark:from-violet-950/20 dark:via-rose-950/20 dark:to-pink-950/20'
}

function formatarMoedaCompacta(valor: number): string {
  if (valor >= 10000) return `R$ ${Math.round(valor / 1000)}k`
  if (valor >= 1000)
    return `R$ ${(valor / 1000).toFixed(1).replace('.', ',')}k`
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)
}

function SkeletonCard() {
  return (
    <div className="shimmer h-[116px] rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
  )
}

function CartaoDado({
  icone,
  numero,
  rotulo,
  href,
  classeBadge,
  classeFundo,
  animClass,
}: {
  icone: React.ReactNode
  numero: string | number
  rotulo: string
  href: string
  classeBadge: string
  classeFundo: string
  animClass: string
}) {
  return (
    <Link href={href} className={`dash-card ${classeFundo} ${animClass}`}>
      <div className={`dash-icon-badge ${classeBadge}`} aria-hidden="true">
        {icone}
      </div>
      <span className="text-2xl font-bold leading-none text-zinc-900 dark:text-zinc-50">
        {numero}
      </span>
      <span className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {rotulo}
      </span>
    </Link>
  )
}

function IcAtivas() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IcSumidas() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IcAniversariantes() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function IcAtendimentos() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IcFaturamento() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IcMovimentacao() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IcTotal() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [dados, setDados] = useState<DadosDashboard | null>(null)

  useEffect(() => {
    async function carregar() {
      const agora = new Date()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
        .toISOString()
        .slice(0, 10)
      const mesAtual = agora.getMonth() + 1

      const cutoff24hISO = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()

      const [
        { data: config },
        { data: statusList },
        { data: todosClientes },
        { data: atendimentosList },
        { data: cadastros24h },
        { data: atendimentos24h },
        { data: reativacoes24h },
      ] = await Promise.all([
        supabase.from('salao_config').select('nome_salao, nome_manicure').single(),
        supabase.from('clientes_status').select('status'),
        supabase.from('clientes').select('data_nascimento').not('data_nascimento', 'is', null),
        supabase.from('atendimentos').select('preco').gte('data_atendimento', inicioMes),
        supabase.from('clientes').select('id').eq('origem', 'formulario').gte('criado_em', cutoff24hISO),
        supabase.from('atendimentos').select('id').gte('criado_em', cutoff24hISO),
        supabase.from('reativacoes').select('id').gte('criado_em', cutoff24hISO),
      ])

      if (config) {
        const cfg = config as { nome_salao: string; nome_manicure?: string | null }
        const nomeBase = cfg.nome_manicure || cfg.nome_salao
        setNome(nomeBase.split(' ')[0])
      }

      const clientes = (statusList ?? []) as { status: string }[]
      const ativas = clientes.filter((c) => c.status === 'verde').length
      const sumidas = clientes.filter((c) => c.status === 'vermelho').length
      const total = clientes.length

      const aniversariantes = (
        (todosClientes ?? []) as { data_nascimento: string | null }[]
      ).filter((c) => {
        if (!c.data_nascimento) return false
        const mes = parseInt(c.data_nascimento.split('-')[1], 10)
        return mes === mesAtual
      }).length

      const atendimentos = (atendimentosList ?? []) as { preco: number | null }[]
      const atendCount = atendimentos.length
      const faturamento = atendimentos.reduce((acc, a) => acc + (a.preco ?? 0), 0)

      const movimentacoesHoje =
        (cadastros24h?.length ?? 0) +
        (atendimentos24h?.length ?? 0) +
        (reativacoes24h?.length ?? 0)

      setDados({
        clientesAtivas: ativas,
        clientesSumidas: sumidas,
        aniversariantesDoMes: aniversariantes,
        atendimentosDoMes: atendCount,
        faturamentoDoMes: faturamento,
        totalClientes: total,
        movimentacoesHoje,
      })
      setCarregando(false)
    }

    carregar()
  }, [])

  const gradiente = gradienteGreeting()
  const cumprimento = saudacao()

  return (
    <div className="dash-page">
      {/* Orbs — visíveis apenas no modo escuro via CSS */}
      <div className="dash-orb-1" aria-hidden="true" />
      <div className="dash-orb-2" aria-hidden="true" />

      <div className="dash-content">
        {/* Saudação com gradiente horário — transparente no dark */}
        <div className={`dash-greeting bg-gradient-to-br ${gradiente} px-5 py-7`}>
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {cumprimento}{nome ? `, ${nome}` : ''}!
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Aqui está o resumo do seu salão hoje
          </p>
        </div>

        {/* Grid de resumo */}
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {carregando ? (
            Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
          ) : dados ? (
            <>
              <CartaoDado
                icone={<IcAtivas />}
                numero={dados.clientesAtivas}
                rotulo="Clientes ativas"
                href="/clientes"
                classeBadge="bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400"
                classeFundo="bg-white ring-2 ring-emerald-300 dark:ring-0"
                animClass="dash-anim-1"
              />
              <CartaoDado
                icone={<IcSumidas />}
                numero={dados.clientesSumidas}
                rotulo="Sumidas"
                href="/reativar"
                classeBadge="bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-400"
                classeFundo="bg-white ring-2 ring-rose-300 dark:ring-0"
                animClass="dash-anim-2"
              />
              <CartaoDado
                icone={<IcAniversariantes />}
                numero={dados.aniversariantesDoMes}
                rotulo="Aniversariantes do mês"
                href="/aniversariantes"
                classeBadge="bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-400"
                classeFundo="bg-white ring-2 ring-amber-300 dark:ring-0"
                animClass="dash-anim-3"
              />
              <CartaoDado
                icone={<IcAtendimentos />}
                numero={dados.atendimentosDoMes}
                rotulo="Atendimentos este mês"
                href="/historico"
                classeBadge="bg-sky-500 text-white dark:bg-sky-500/20 dark:text-sky-400"
                classeFundo="bg-white ring-2 ring-sky-300 dark:ring-0"
                animClass="dash-anim-4"
              />
              <CartaoDado
                icone={<IcFaturamento />}
                numero={formatarMoedaCompacta(dados.faturamentoDoMes)}
                rotulo="Faturamento do mês"
                href="/historico"
                classeBadge="bg-violet-500 text-white dark:bg-violet-500/20 dark:text-violet-400"
                classeFundo="bg-white ring-2 ring-violet-300 dark:ring-0"
                animClass="dash-anim-5"
              />
              <CartaoDado
                icone={<IcTotal />}
                numero={dados.totalClientes}
                rotulo="Total de clientes"
                href="/clientes"
                classeBadge="bg-pink-500 text-white dark:bg-pink-500/20 dark:text-pink-400"
                classeFundo="bg-white ring-2 ring-pink-300 dark:ring-0"
                animClass="dash-anim-6"
              />
              <CartaoDado
                icone={<IcMovimentacao />}
                numero={dados.movimentacoesHoje}
                rotulo="Movimentações hoje"
                href="/movimentacao"
                classeBadge="bg-teal-500 text-white dark:bg-teal-500/20 dark:text-teal-400"
                classeFundo="bg-white ring-2 ring-teal-300 dark:ring-0"
                animClass="dash-anim-7"
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
