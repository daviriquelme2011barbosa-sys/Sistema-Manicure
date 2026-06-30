'use client'

import { useState, useEffect, useId } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatarData, dataHoje } from '@/lib/formatters'
import {
  IconePessoa,
  IconeCoracao,
  IconeRelogio,
  IconeEngrenagem,
  IconeAgenda,
  IconeAusente,
} from '@/components/icons'
import type { StatusCliente } from '@/types'

type ClienteRecente = {
  id: string
  nome: string
  ultima_visita: string | null
  status: StatusCliente
}

type AgendamentoHoje = {
  id: string
  horario: string | null
  servico: string | null
  status: string
  clientes: { nome: string } | null
}

type SeriesKPI = {
  ativas: number[]
  sumidas: number[]
  aniversariantes: number[]
  atendimentos: number[]
  faturamento: number[]
  total: number[]
}

type DadosDashboard = {
  clientesAtivas: number
  clientesAtencao: number
  clientesSumidas: number
  aniversariantesDoMes: number
  atendimentosDoMes: number
  faturamentoDoMes: number
  totalClientes: number
  movimentacoesHoje: number
  series: SeriesKPI
  plano: string
  clientesPendentes: number
  clientesRecentes: ClienteRecente[]
  agendamentosHoje: AgendamentoHoje[]
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
    return 'from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20'
  if (hora < 18)
    return 'from-blue-50 via-sky-50 to-cyan-50 dark:from-blue-950/20 dark:via-sky-950/20 dark:to-cyan-950/20'
  return 'from-indigo-50 via-blue-50 to-slate-100 dark:from-indigo-950/20 dark:via-blue-950/20 dark:to-slate-900/40'
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

function SkeletonCard() {
  return (
    <div className="shimmer h-[116px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
  )
}

function Sparkline({ data, cor }: { data: number[]; cor: string }) {
  const gid = useId()
  if (!data || data.length < 2) return <div className="mt-4 h-7" aria-hidden="true" />

  const w = 100
  const h = 28
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pontos = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return [x, y] as const
  })
  const linha = pontos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')
  const area = `${linha} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-4 h-7 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
          <stop offset="100%" stopColor={cor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={linha}
        fill="none"
        stroke={cor}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CartaoDado({
  icone,
  numero,
  rotulo,
  href,
  cor,
  serie,
  animClass,
}: {
  icone: React.ReactNode
  numero: string | number
  rotulo: string
  href: string
  cor: string
  serie: number[]
  animClass: string
}) {
  return (
    <Link href={href} className={`dash-card ${animClass}`}>
      <div
        className="dash-icon-badge"
        style={{ backgroundColor: `${cor}1A`, color: cor }}
        aria-hidden="true"
      >
        {icone}
      </div>
      <span className="text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
        {numero}
      </span>
      <span className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {rotulo}
      </span>
      <Sparkline data={serie} cor={cor} />
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

/* ── Gráfico de status (donut) ───────────────────── */

type FatiaStatus = { nome: string; valor: number; cor: string }

function TooltipDonut({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: { payload: FatiaStatus }[]
  total: number
}) {
  if (!active || !payload?.length) return null
  const f = payload[0].payload
  const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-slate-600/50 dark:bg-slate-800/95">
      <p className="text-sm font-medium" style={{ color: f.cor }}>
        {f.nome}: <span className="font-bold">{f.valor}</span>{' '}
        <span className="text-slate-400 dark:text-slate-500">({pct}%)</span>
      </p>
    </div>
  )
}

function DonutStatus({
  ativas,
  atencao,
  sumidas,
}: {
  ativas: number
  atencao: number
  sumidas: number
}) {
  const total = ativas + atencao + sumidas
  const fatias: FatiaStatus[] = [
    { nome: 'Ativas', valor: ativas, cor: '#22C55E' },
    { nome: 'Atenção', valor: atencao, cor: '#F59E0B' },
    { nome: 'Sumidas', valor: sumidas, cor: '#EF4444' },
  ]
  const fatiasComValor = fatias.filter((f) => f.valor > 0)

  return (
    <div className="dash-card dash-anim-8 col-span-2 lg:col-span-3">
      <div className="mb-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Clientes por status
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Distribuição atual da sua base
        </p>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
          Nenhuma cliente para exibir ainda.
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          {/* Donut */}
          <div className="relative h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fatiasComValor}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={fatiasComValor.length > 1 ? 3 : 0}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {fatiasComValor.map((f) => (
                    <Cell key={f.nome} fill={f.cor} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <TooltipDonut
                      active={props.active}
                      payload={props.payload as unknown as { payload: FatiaStatus }[]}
                      total={total}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold leading-none text-slate-900 dark:text-slate-50">
                {total}
              </span>
              <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                clientes
              </span>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex w-full flex-1 flex-col gap-3">
            {fatias.map((f) => {
              const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0
              return (
                <div key={f.nome} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: f.cor }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{f.nome}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {f.valor}
                  </span>
                  <span className="w-10 text-right text-xs text-slate-400 dark:text-slate-500">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Colunas inferiores (recentes · agenda · ações) ─ */

const INFO_STATUS_CLIENTE: Record<StatusCliente, { label: string; cor: string }> = {
  verde: { label: 'Ativa', cor: '#22C55E' },
  amarelo: { label: 'Atenção', cor: '#F59E0B' },
  vermelho: { label: 'Sumida', cor: '#EF4444' },
  sem_atendimento: { label: 'Nova', cor: '#94A3B8' },
}

const INFO_STATUS_AGENDAMENTO: Record<string, { label: string; cor: string }> = {
  pendente: { label: 'Pendente', cor: '#F59E0B' },
  confirmado: { label: 'Confirmado', cor: '#2563EB' },
  compareceu: { label: 'Compareceu', cor: '#22C55E' },
  faltou: { label: 'Faltou', cor: '#EF4444' },
  cancelado: { label: 'Cancelado', cor: '#94A3B8' },
}

function inicialNome(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || '?'
}

function PilulaStatus({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${cor}1A`, color: cor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
      {label}
    </span>
  )
}

function CabecalhoColuna({
  titulo,
  rotuloLink,
  href,
}: {
  titulo: string
  rotuloLink?: string
  href?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{titulo}</p>
      {href && rotuloLink && (
        <Link
          href={href}
          className="flex-shrink-0 text-xs font-medium text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-400"
        >
          {rotuloLink}
        </Link>
      )}
    </div>
  )
}

function ColunaClientesRecentes({
  clientes,
  className = '',
}: {
  clientes: ClienteRecente[]
  className?: string
}) {
  return (
    <div className={`dash-card dash-anim-1 ${className}`}>
      <CabecalhoColuna titulo="Clientes recentes" rotuloLink="Ver todos" href="/clientes" />
      {clientes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="text-3xl" aria-hidden="true">👥</span>
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            Nenhum atendimento registrado ainda
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {clientes.map((c) => {
            const info = INFO_STATUS_CLIENTE[c.status]
            return (
              <Link
                key={c.id}
                href="/clientes"
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-semibold text-white">
                  {inicialNome(c.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {c.nome}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {c.ultima_visita ? formatarData(c.ultima_visita) : '—'}
                  </p>
                </div>
                <PilulaStatus label={info.label} cor={info.cor} />
              </Link>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ColunaAgendaHoje({ agendamentos }: { agendamentos: AgendamentoHoje[] }) {
  return (
    <div className="dash-card dash-anim-2">
      <CabecalhoColuna titulo="Agenda de hoje" rotuloLink="Ver agenda" href="/agenda" />
      {agendamentos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="text-3xl" aria-hidden="true">📅</span>
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            Nenhum agendamento para hoje
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {agendamentos.map((a) => {
            const info =
              INFO_STATUS_AGENDAMENTO[a.status] ?? { label: a.status, cor: '#94A3B8' }
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {a.horario ? a.horario.slice(0, 5) : '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {a.clientes?.nome ?? '—'}
                  </p>
                  {a.servico && (
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {a.servico}
                    </p>
                  )}
                </div>
                <PilulaStatus label={info.label} cor={info.cor} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function AcaoRapida({
  icone,
  label,
  cor,
  href,
  onClick,
}: {
  icone: React.ReactNode
  label: string
  cor: string
  href?: string
  onClick?: () => void
}) {
  const classes =
    'flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600 dark:hover:bg-slate-800'
  const conteudo = (
    <>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${cor}1A`, color: cor }}
        aria-hidden="true"
      >
        {icone}
      </span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {conteudo}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {conteudo}
    </button>
  )
}

function ColunaAcoesRapidas({ temAgenda }: { temAgenda: boolean }) {
  return (
    <div className="dash-card dash-anim-3">
      <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Ações rápidas
      </p>
      <div className="grid grid-cols-2 gap-2">
        <AcaoRapida icone={<IconePessoa />} label="Novo cliente" cor="#22C55E" href="/cadastro" />
        <AcaoRapida icone={<IconeCoracao />} label="Reativar clientes" cor="#EF4444" href="/reativar" />
        <AcaoRapida icone={<IconeRelogio />} label="Ver histórico" cor="#64748B" href="/historico" />
        <AcaoRapida
          icone={<IconeEngrenagem />}
          label="Configurações"
          cor="#3B82F6"
          onClick={() => window.dispatchEvent(new CustomEvent('abrir-configuracoes'))}
        />
        {temAgenda && (
          <AcaoRapida icone={<IconeAgenda />} label="Novo agendamento" cor="#14B8A6" href="/agenda" />
        )}
        {temAgenda && (
          <AcaoRapida icone={<IconeAusente />} label="Ver faltaram" cor="#F59E0B" href="/faltaram" />
        )}
      </div>
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
        { count: pendentesCount },
        { data: recentesData },
      ] = await Promise.all([
        supabase.from('salao_config').select('id, nome_salao, nome_manicure, plano').single(),
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
          .select('cliente_id, data_atendimento, preco')
          .gte('data_atendimento', inicioGrafico),
        supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('status_cadastro', 'pendente'),
        supabase
          .from('clientes_status')
          .select('id, nome, ultima_visita, status')
          .not('ultima_visita', 'is', null)
          .order('ultima_visita', { ascending: false })
          .limit(5),
      ])

      let planoDoSalao = 'basic'
      let idSalao: string | null = null
      if (config) {
        const cfg = config as {
          id: string
          nome_salao: string
          nome_manicure?: string | null
          plano?: string | null
        }
        const nomeBase = cfg.nome_manicure || cfg.nome_salao
        setNome(nomeBase.split(' ')[0])
        planoDoSalao = cfg.plano ?? 'basic'
        idSalao = cfg.id
      }

      const clientesRecentes = (recentesData ?? []) as ClienteRecente[]

      // Agenda de hoje — exclusivo dos planos Profissional e Master
      let agendamentosHoje: AgendamentoHoje[] = []
      if ((planoDoSalao === 'profissional' || planoDoSalao === 'master') && idSalao) {
        const { data: agData } = await supabase
          .from('agendamentos')
          .select('id, horario, servico, status, clientes(nome)')
          .eq('salao_id', idSalao)
          .eq('data', dataHoje())
          .order('horario', { ascending: true, nullsFirst: false })
        agendamentosHoje = (agData ?? []) as unknown as AgendamentoHoje[]
      }

      const clientes = (statusList ?? []) as { status: string }[]
      const ativas = clientes.filter((c) => c.status === 'verde').length
      const atencao = clientes.filter((c) => c.status === 'amarelo').length
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
      const atendItems = (atendimentosGrafico ?? []) as {
        cliente_id: string
        data_atendimento: string
        preco: number | null
      }[]
      const aniversItems = (todosClientes ?? []) as { data_nascimento: string | null }[]

      const cliPorMes = contarPorMes(cliItems, estruturaMeses)
      const ativosPorMes = contarAtivosDistintosPorMes(atendItems, estruturaMeses)

      // Séries de 6 meses para os sparklines dos cards (dados reais)
      const serieAtivas = estruturaMeses.map(({ chave }) => ativosPorMes[chave])
      const serieAtendimentos = estruturaMeses.map(
        ({ chave }) => atendItems.filter((a) => a.data_atendimento.slice(0, 7) === chave).length,
      )
      const serieFaturamento = estruturaMeses.map(({ chave }) =>
        atendItems
          .filter((a) => a.data_atendimento.slice(0, 7) === chave)
          .reduce((s, a) => s + (a.preco ?? 0), 0),
      )
      const serieAniversariantes = estruturaMeses.map(({ chave }) => {
        const mes = parseInt(chave.split('-')[1], 10)
        return aniversItems.filter(
          (c) => c.data_nascimento && parseInt(c.data_nascimento.split('-')[1], 10) === mes,
        ).length
      })

      // Total de clientes ao fim de cada mês (retroativo a partir do total atual)
      const serieTotal: number[] = new Array(estruturaMeses.length)
      let acumulado = total
      for (let i = estruturaMeses.length - 1; i >= 0; i--) {
        serieTotal[i] = acumulado
        acumulado -= cliPorMes[estruturaMeses[i].chave]
      }

      // Sumidas (60+ dias sem visita) ao fim de cada mês, pelo histórico disponível
      const visitasPorCliente: Record<string, string[]> = {}
      for (const a of atendItems) {
        ;(visitasPorCliente[a.cliente_id] ??= []).push(a.data_atendimento)
      }
      for (const k in visitasPorCliente) visitasPorCliente[k].sort()
      const serieSumidas = estruturaMeses.map(({ chave }) => {
        const [ano, mes] = chave.split('-').map(Number)
        let fim = new Date(ano, mes, 0)
        if (fim > agora) fim = agora
        const fimStr = fim.toISOString().slice(0, 10)
        let count = 0
        for (const k in visitasPorCliente) {
          const datas = visitasPorCliente[k]
          let ultima: string | undefined
          for (let i = datas.length - 1; i >= 0; i--) {
            if (datas[i] <= fimStr) {
              ultima = datas[i]
              break
            }
          }
          if (ultima) {
            const gap = Math.floor((fim.getTime() - new Date(ultima).getTime()) / 86400000)
            if (gap > 60) count++
          }
        }
        return count
      })

      setDados({
        clientesAtivas: ativas,
        clientesAtencao: atencao,
        clientesSumidas: sumidas,
        aniversariantesDoMes: aniversariantes,
        atendimentosDoMes: atendCount,
        faturamentoDoMes: faturamento,
        totalClientes: total,
        movimentacoesHoje,
        series: {
          ativas: serieAtivas,
          sumidas: serieSumidas,
          aniversariantes: serieAniversariantes,
          atendimentos: serieAtendimentos,
          faturamento: serieFaturamento,
          total: serieTotal,
        },
        plano: planoDoSalao,
        clientesPendentes: pendentesCount ?? 0,
        clientesRecentes,
        agendamentosHoje,
      })
      setCarregando(false)
    }

    carregar()
  }, [])

  const gradiente = gradienteGreeting()
  const cumprimento = saudacao()
  const temAgenda = dados?.plano === 'profissional' || dados?.plano === 'master'

  return (
    <div className="dash-page">
      <div className="dash-content">
        {/* Saudação com gradiente horário — transparente no dark */}
        <div className={`dash-greeting bg-gradient-to-br ${gradiente} px-5 py-7`}>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {cumprimento}{nome ? `, ${nome}` : ''}!
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aqui está o resumo do seu salão hoje
          </p>
        </div>

        {/* Banner de clientes pendentes */}
        {dados && dados.clientesPendentes > 0 && (
          <Link
            href="/cadastrados"
            className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-800/40 dark:text-amber-400" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
              Você tem <strong>{dados.clientesPendentes}</strong> cliente{dados.clientesPendentes > 1 ? 's' : ''} aguardando aprovação
            </p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-amber-500 dark:text-amber-400" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}

        {/* Grid de resumo + gráfico */}
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {carregando ? (
            <>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
              <div className="shimmer col-span-2 h-52 rounded-2xl bg-slate-100 dark:bg-slate-800 lg:col-span-3" />
            </>
          ) : dados ? (
            <>
              <CartaoDado
                icone={<IcAtivas />}
                numero={dados.clientesAtivas}
                rotulo="Clientes ativas"
                href="/clientes"
                cor="#8B5CF6"
                serie={dados.series.ativas}
                animClass="dash-anim-1"
              />
              <CartaoDado
                icone={<IcSumidas />}
                numero={dados.clientesSumidas}
                rotulo="Sumidas"
                href="/reativar"
                cor="#EF4444"
                serie={dados.series.sumidas}
                animClass="dash-anim-2"
              />
              <CartaoDado
                icone={<IcAniversariantes />}
                numero={dados.aniversariantesDoMes}
                rotulo="Aniversariantes do mês"
                href="/aniversariantes"
                cor="#F59E0B"
                serie={dados.series.aniversariantes}
                animClass="dash-anim-3"
              />
              <CartaoDado
                icone={<IcAtendimentos />}
                numero={dados.atendimentosDoMes}
                rotulo="Atendimentos este mês"
                href="/historico"
                cor="#14B8A6"
                serie={dados.series.atendimentos}
                animClass="dash-anim-4"
              />
              <CartaoDado
                icone={<IcFaturamento />}
                numero={formatarMoedaCompacta(dados.faturamentoDoMes)}
                rotulo="Faturamento do mês"
                href="/historico"
                cor="#22C55E"
                serie={dados.series.faturamento}
                animClass="dash-anim-5"
              />
              <CartaoDado
                icone={<IcTotal />}
                numero={dados.totalClientes}
                rotulo="Total de clientes"
                href="/cadastrados"
                cor="#2563EB"
                serie={dados.series.total}
                animClass="dash-anim-6"
              />
              <CartaoDado
                icone={<IcMovimentacao />}
                numero={dados.movimentacoesHoje}
                rotulo="Movimentações hoje"
                href="/movimentacao"
                cor="#3B82F6"
                serie={[]}
                animClass="dash-anim-7"
              />
              <DonutStatus
                ativas={dados.clientesAtivas}
                atencao={dados.clientesAtencao}
                sumidas={dados.clientesSumidas}
              />
            </>
          ) : null}
        </div>

        {/* Colunas: clientes recentes · agenda de hoje · ações rápidas */}
        {carregando ? (
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="shimmer h-64 rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : dados ? (
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-3">
            <ColunaClientesRecentes
              clientes={dados.clientesRecentes}
              className={temAgenda ? '' : 'lg:col-span-2'}
            />
            {temAgenda && <ColunaAgendaHoje agendamentos={dados.agendamentosHoje} />}
            <ColunaAcoesRapidas temAgenda={temAgenda} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
