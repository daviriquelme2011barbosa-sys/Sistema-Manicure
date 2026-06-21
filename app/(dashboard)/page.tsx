'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type DadosMes = {
  mes: string
  clientesNovos: number
  clientesAtivas: number
  reativacoesBemsucedidas: number
  agendamentos: number
  faturamento: number
}

type DadosDashboard = {
  clientesAtivas: number
  clientesSumidas: number
  aniversariantesDoMes: number
  atendimentosDoMes: number
  faturamentoDoMes: number
  totalClientes: number
  movimentacoesHoje: number
  dadosMeses: DadosMes[]
  plano: string
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

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function gerarEstruturaMeses(qtd: number): { chave: string; label: string }[] {
  const agora = new Date()
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (qtd - 1 - i), 1)
    return {
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MESES_PT[d.getMonth()],
    }
  })
}

function contarPorMes(
  items: { criado_em: string }[],
  estrutura: { chave: string; label: string }[],
): Record<string, number> {
  const contagem: Record<string, number> = {}
  for (const m of estrutura) contagem[m.chave] = 0
  for (const item of items) {
    const chave = item.criado_em.slice(0, 7)
    if (chave in contagem) contagem[chave]++
  }
  return contagem
}

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}

function contarAtivosDistintosPorMes(
  atendimentos: { cliente_id: string; data_atendimento: string }[],
  estrutura: { chave: string; label: string }[],
): Record<string, number> {
  const sets: Record<string, Set<string>> = {}
  for (const m of estrutura) sets[m.chave] = new Set()
  for (const a of atendimentos) {
    const chave = a.data_atendimento.slice(0, 7)
    if (chave in sets) sets[chave].add(a.cliente_id)
  }
  const resultado: Record<string, number> = {}
  for (const m of estrutura) resultado[m.chave] = sets[m.chave].size
  return resultado
}

function contarReativacoesBemsucedidas(
  reativacoes: { cliente_id: string; criado_em: string }[],
  atendimentos: { cliente_id: string; data_atendimento: string }[],
  estrutura: { chave: string; label: string }[],
): Record<string, number> {
  const atendPorCliente: Record<string, string[]> = {}
  for (const a of atendimentos) {
    if (!atendPorCliente[a.cliente_id]) atendPorCliente[a.cliente_id] = []
    atendPorCliente[a.cliente_id].push(a.data_atendimento)
  }
  const contagem: Record<string, number> = {}
  for (const m of estrutura) contagem[m.chave] = 0
  for (const r of reativacoes) {
    const chave = r.criado_em.slice(0, 7)
    if (!(chave in contagem)) continue
    const dataReativacao = r.criado_em.slice(0, 10)
    const voltou = (atendPorCliente[r.cliente_id] ?? []).some((d) => d >= dataReativacao)
    if (voltou) contagem[chave]++
  }
  return contagem
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

/* ── Gráfico ─────────────────────────────────────── */

type TooltipEntrada = { name?: string; value?: number; color?: string }

function TooltipDoGrafico({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntrada[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm dark:border-zinc-700/50 dark:bg-zinc-900/95">
      <p className="mb-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}:{' '}
          <span className="font-bold">{p.value ?? 0}</span>
        </p>
      ))}
    </div>
  )
}

function BadgeVariacao({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  if (valor === null) return null
  const positivo = valor >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positivo
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
      }`}
    >
      {positivo ? '↑' : '↓'} {Math.abs(valor)}% {rotulo}
    </span>
  )
}

function GraficoDashboard({ dados, plano }: { dados: DadosMes[]; plano: string }) {
  const n = dados.length
  const varNovos =
    n >= 2 ? calcularVariacao(dados[n - 1].clientesNovos, dados[n - 2].clientesNovos) : null
  const varAtivas =
    n >= 2 ? calcularVariacao(dados[n - 1].clientesAtivas, dados[n - 2].clientesAtivas) : null
  const varBemsucedidas =
    n >= 2
      ? calcularVariacao(dados[n - 1].reativacoesBemsucedidas, dados[n - 2].reativacoesBemsucedidas)
      : null

  const mostrarAgendamentos = plano === 'profissional' || plano === 'master'
  const mostrarFaturamento = plano === 'master'

  return (
    <div className="dash-card dash-anim-8 col-span-2 bg-white ring-2 ring-zinc-100 dark:ring-0 lg:col-span-3">
      {/* Cabeçalho */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Evolução nos últimos 6 meses
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">Novas, ativas e reativações efetivas</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <BadgeVariacao valor={varNovos} rotulo="novas" />
          <BadgeVariacao valor={varAtivas} rotulo="ativas" />
          <BadgeVariacao valor={varBemsucedidas} rotulo="reativações" />
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
          Novas clientes
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          Clientes ativas
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full bg-[#9333ea]" />
          Reativações efetivas
        </span>
        {mostrarAgendamentos && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            Agendamentos
          </span>
        )}
        {mostrarFaturamento && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Faturamento
          </span>
        )}
      </div>

      {/* Área do gráfico */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={dados} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="gcClientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gcAtivas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gcReativacoes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gcAgendamentos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gcFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={(props) => (
              <TooltipDoGrafico
                active={props.active}
                label={props.label !== undefined ? String(props.label) : undefined}
                payload={
                  props.payload?.map((p) => ({
                    name: p.name !== undefined ? String(p.name) : undefined,
                    value: typeof p.value === 'number' ? p.value : undefined,
                    color: p.color,
                  })) ?? []
                }
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="clientesNovos"
            name="Novas clientes"
            stroke="#ec4899"
            strokeWidth={2}
            fill="url(#gcClientes)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#ec4899' }}
          />
          <Area
            type="monotone"
            dataKey="clientesAtivas"
            name="Clientes ativas"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gcAtivas)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
          />
          <Area
            type="monotone"
            dataKey="reativacoesBemsucedidas"
            name="Reativações efetivas"
            stroke="#9333ea"
            strokeWidth={2}
            fill="url(#gcReativacoes)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#9333ea' }}
          />
          {mostrarAgendamentos && (
            <Area
              type="monotone"
              dataKey="agendamentos"
              name="Agendamentos"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gcAgendamentos)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
            />
          )}
          {mostrarFaturamento && (
            <Area
              type="monotone"
              dataKey="faturamento"
              name="Faturamento"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gcFaturamento)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Página principal ────────────────────────────── */

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
      const inicioGrafico = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10)

      const [
        { data: config },
        { data: statusList },
        { data: todosClientes },
        { data: atendimentosList },
        { data: cadastros24h },
        { data: atendimentos24h },
        { data: reativacoes24h },
        { data: clientesGrafico },
        { data: atendimentosGrafico },
        { data: reavivacoesGrafico },
      ] = await Promise.all([
        supabase.from('salao_config').select('nome_salao, nome_manicure, plano').single(),
        supabase.from('clientes_status').select('status'),
        supabase.from('clientes').select('data_nascimento').not('data_nascimento', 'is', null),
        supabase.from('atendimentos').select('preco').gte('data_atendimento', inicioMes),
        supabase
          .from('clientes')
          .select('id')
          .eq('origem', 'formulario')
          .gte('criado_em', cutoff24hISO),
        supabase.from('atendimentos').select('id').gte('criado_em', cutoff24hISO),
        supabase.from('reativacoes').select('id').gte('criado_em', cutoff24hISO),
        supabase.from('clientes').select('criado_em').gte('criado_em', inicioGrafico),
        supabase
          .from('atendimentos')
          .select('cliente_id, data_atendimento')
          .gte('data_atendimento', inicioGrafico),
        supabase
          .from('reativacoes')
          .select('cliente_id, criado_em')
          .gte('criado_em', inicioGrafico),
      ])

      let planoDoSalao = 'basic'
      if (config) {
        const cfg = config as {
          nome_salao: string
          nome_manicure?: string | null
          plano?: string | null
        }
        const nomeBase = cfg.nome_manicure || cfg.nome_salao
        setNome(nomeBase.split(' ')[0])
        planoDoSalao = cfg.plano ?? 'basic'
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

      // Dados do gráfico
      const estruturaMeses = gerarEstruturaMeses(6)
      const cliItems = (clientesGrafico ?? []) as { criado_em: string }[]
      const atendItems = (atendimentosGrafico ?? []) as { cliente_id: string; data_atendimento: string }[]
      const reavItems = (reavivacoesGrafico ?? []) as { cliente_id: string; criado_em: string }[]

      const cliPorMes = contarPorMes(cliItems, estruturaMeses)
      const ativosPorMes = contarAtivosDistintosPorMes(atendItems, estruturaMeses)
      const bemsucedidasPorMes = contarReativacoesBemsucedidas(reavItems, atendItems, estruturaMeses)

      const dadosMeses: DadosMes[] = estruturaMeses.map(({ chave, label }) => ({
        mes: label,
        clientesNovos: cliPorMes[chave],
        clientesAtivas: ativosPorMes[chave],
        reativacoesBemsucedidas: bemsucedidasPorMes[chave],
        agendamentos: 0,
        faturamento: 0,
      }))

      setDados({
        clientesAtivas: ativas,
        clientesSumidas: sumidas,
        aniversariantesDoMes: aniversariantes,
        atendimentosDoMes: atendCount,
        faturamentoDoMes: faturamento,
        totalClientes: total,
        movimentacoesHoje,
        dadosMeses,
        plano: planoDoSalao,
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

        {/* Grid de resumo + gráfico */}
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {carregando ? (
            <>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
              <div className="shimmer col-span-2 h-52 rounded-2xl bg-zinc-100 dark:bg-zinc-800 lg:col-span-3" />
            </>
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
                href="/cadastrados"
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
              <GraficoDashboard dados={dados.dadosMeses} plano={dados.plano} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
