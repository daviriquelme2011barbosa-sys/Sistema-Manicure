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
import { AvatarCliente } from '@/components/AvatarCliente'
import type { StatusCliente } from '@/types'

type ClienteRecente = {
  id: string
  nome: string
  ultima_visita: string | null
  status: StatusCliente
  foto_url: string | null
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
  clientesAtivasCard: number
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
const MESES_PT_COMPLETO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function gerarEstruturaMeses(qtd: number, referencia: Date = new Date()): { chave: string; label: string }[] {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(referencia.getFullYear(), referencia.getMonth() - (qtd - 1 - i), 1)
    return {
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MESES_PT[d.getMonth()],
    }
  })
}

// Opções do filtro de período: "Resumo geral" + cada mês do ano corrente até o mês atual.
function gerarOpcoesPeriodo(): { valor: string; label: string }[] {
  const agora = new Date()
  const opcoes: { valor: string; label: string }[] = [{ valor: 'geral', label: 'Resumo geral' }]
  for (let m = 0; m <= agora.getMonth(); m++) {
    opcoes.push({
      valor: `${agora.getFullYear()}-${String(m + 1).padStart(2, '0')}`,
      label: MESES_PT_COMPLETO[m],
    })
  }
  return opcoes
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
    <div className="shimmer h-[116px] rounded-2xl bg-surface-2" />
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
  corIcone,
  fundoIcone,
  serie,
  animClass,
}: {
  icone: React.ReactNode
  numero: string | number
  rotulo: string
  href: string
  cor: string
  corIcone: string
  fundoIcone: string
  serie: number[]
  animClass: string
}) {
  return (
    <Link href={href} className={`dash-card dash-card-kpi dash-card-interactive ${animClass}`}>
      <div
        className="dash-icon-badge"
        style={{ backgroundColor: fundoIcone, color: corIcone }}
        aria-hidden="true"
      >
        {icone}
      </div>
      <span className="text-3xl font-bold leading-none tracking-tight tabular-nums text-text">
        {numero}
      </span>
      <span className="mt-2 text-sm font-medium text-text-muted">
        {rotulo}
      </span>
      <Sparkline data={serie} cor={cor} />
    </Link>
  )
}

/* ── Carrossel de KPIs ─────────────────────────────── */

type KpiItem = {
  key: string
  icone: React.ReactNode
  numero: string | number
  rotulo: string
  href: string
  cor: string
  corIcone: string
  fundoIcone: string
  serie: number[]
}

function agruparEmTrios(itens: KpiItem[]): KpiItem[][] {
  const grupos: KpiItem[][] = []
  for (let i = 0; i < itens.length; i += 3) grupos.push(itens.slice(i, i + 3))
  return grupos
}

function SetaCarrossel({
  direcao,
  onClick,
  desabilitada,
}: {
  direcao: 'anterior' | 'proximo'
  onClick: () => void
  desabilitada: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      aria-label={direcao === 'anterior' ? 'Grupo anterior' : 'Próximo grupo'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points={direcao === 'anterior' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
      </svg>
    </button>
  )
}

function CarrosselKPIs({ itens }: { itens: KpiItem[] }) {
  const [pagina, setPagina] = useState(0)
  const grupos = agruparEmTrios(itens)
  const totalPaginas = grupos.length
  const paginaAtual = Math.min(pagina, Math.max(0, totalPaginas - 1))

  return (
    <div className="pt-4">
      <div className="overflow-hidden px-4 lg:px-8">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${paginaAtual * 100}%)` }}
        >
          {grupos.map((grupo, gi) => (
            <div
              key={gi}
              aria-hidden={gi !== paginaAtual}
              className={`grid w-full flex-shrink-0 grid-cols-2 gap-5 transition-opacity duration-300 lg:grid-cols-3 lg:gap-6 ${
                gi === paginaAtual ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {grupo.map((kpi, idx) => (
                <CartaoDado
                  key={kpi.key}
                  icone={kpi.icone}
                  numero={kpi.numero}
                  rotulo={kpi.rotulo}
                  href={kpi.href}
                  cor={kpi.cor}
                  corIcone={kpi.corIcone}
                  fundoIcone={kpi.fundoIcone}
                  serie={kpi.serie}
                  animClass={`dash-anim-${(idx % 3) + 1}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-1.5">
            {grupos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPagina(i)}
                aria-label={`Ir para o grupo ${i + 1} de ${totalPaginas}`}
                aria-current={i === paginaAtual}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === paginaAtual
                    ? 'w-5 bg-primary'
                    : 'w-2 bg-border-strong hover:bg-text-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SetaCarrossel
              direcao="anterior"
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              desabilitada={paginaAtual === 0}
            />
            <SetaCarrossel
              direcao="proximo"
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              desabilitada={paginaAtual === totalPaginas - 1}
            />
          </div>
        </div>
      )}
    </div>
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
    <div className="rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-medium" style={{ color: f.cor }}>
        {f.nome}: <span className="font-bold">{f.valor}</span>{' '}
        <span className="text-text-muted">({pct}%)</span>
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
    { nome: 'Ativas', valor: ativas, cor: 'var(--color-success)' },
    { nome: 'Atenção', valor: atencao, cor: 'var(--color-warning)' },
    { nome: 'Sumidas', valor: sumidas, cor: 'var(--color-danger)' },
  ]
  const fatiasComValor = fatias.filter((f) => f.valor > 0)

  return (
    <div className="dash-card dash-card-compact dash-anim-1">
      <div className="mb-1">
        <p className="text-sm font-semibold text-text">
          Clientes por status
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          Distribuição atual da sua base
        </p>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">
          Nenhuma cliente para exibir ainda.
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-6 sm:flex-row sm:gap-8 lg:flex-col lg:gap-6">
          {/* Donut */}
          <div className="relative h-48 w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fatiasComValor}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={92}
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
              <span className="text-3xl font-bold leading-none text-text">
                {total}
              </span>
              <span className="mt-1 text-xs font-medium text-text-secondary">
                clientes
              </span>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex w-full flex-1 flex-col gap-4">
            {fatias.map((f) => {
              const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0
              return (
                <div key={f.nome} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: f.cor }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm text-text-secondary">{f.nome}</span>
                  <span className="text-sm font-semibold text-text">
                    {f.valor}
                  </span>
                  <span className="w-10 text-right text-xs text-text-muted">
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
  verde: { label: 'Ativa', cor: 'var(--color-success)' },
  amarelo: { label: 'Atenção', cor: 'var(--color-warning)' },
  vermelho: { label: 'Sumida', cor: 'var(--color-danger)' },
  sem_atendimento: { label: 'Nova', cor: 'var(--color-text-muted)' },
}

const INFO_STATUS_AGENDAMENTO: Record<string, { label: string; cor: string }> = {
  pendente: { label: 'Pendente', cor: 'var(--color-warning)' },
  confirmado: { label: 'Confirmado', cor: 'var(--color-info)' },
  compareceu: { label: 'Compareceu', cor: 'var(--color-success)' },
  faltou: { label: 'Faltou', cor: 'var(--color-danger)' },
  cancelado: { label: 'Cancelado', cor: 'var(--color-text-muted)' },
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
      <p className="text-sm font-semibold text-text">{titulo}</p>
      {href && rotuloLink && (
        <Link
          href={href}
          className="flex-shrink-0 text-xs font-medium text-primary transition hover:text-primary-hover hover:underline"
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
    <div className={`dash-card dash-card-compact dash-anim-2 ${className}`}>
      <CabecalhoColuna titulo="Clientes recentes" rotuloLink="Ver todos" href="/clientes" />
      {clientes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="text-3xl" aria-hidden="true">👥</span>
          <p className="mt-2 text-sm text-text-muted">
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
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-hover"
              >
                <AvatarCliente fotoUrl={c.foto_url} nome={c.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {c.nome}
                  </p>
                  <p className="text-xs text-text-muted">
                    {c.ultima_visita
                      ? `Último atendimento: ${formatarData(c.ultima_visita)}`
                      : '—'}
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
    <div className="dash-card dash-card-compact dash-anim-3">
      <CabecalhoColuna titulo="Agenda de hoje" rotuloLink="Ver agenda" href="/agenda" />
      {agendamentos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <IconeAgenda size={28} className="text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">
            Nenhum agendamento para hoje
          </p>
          <Link
            href="/agenda"
            className="mt-3 text-xs font-medium text-primary transition hover:text-primary-hover hover:underline"
          >
            Ver agenda
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {agendamentos.map((a) => {
            const info =
              INFO_STATUS_AGENDAMENTO[a.status] ?? { label: a.status, cor: '#94A3B8' }
            return (
              <li
                key={a.id}
                className="flex flex-col gap-1.5 rounded-xl px-2 py-2 transition hover:bg-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-6 flex-shrink-0 items-center rounded-lg bg-surface-2 px-2 text-xs font-semibold text-text-secondary">
                    {a.horario ? a.horario.slice(0, 5) : '—'}
                  </span>
                  <PilulaStatus label={info.label} cor={info.cor} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {a.clientes?.nome ?? '—'}
                  </p>
                  {a.servico && (
                    <p className="truncate text-xs text-text-muted">
                      {a.servico}
                    </p>
                  )}
                </div>
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
  href,
  onClick,
}: {
  icone: React.ReactNode
  label: string
  href?: string
  onClick?: () => void
}) {
  const classes =
    'flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface-2 p-2.5 text-center transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-primary-soft hover:shadow-sm'
  const conteudo = (
    <>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"
        aria-hidden="true"
      >
        {icone}
      </span>
      <span className="text-xs font-medium leading-tight text-text-secondary">{label}</span>
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
    <div className="dash-card dash-card-compact dash-anim-4">
      <p className="mb-3 text-sm font-semibold text-text">
        Ações rápidas
      </p>
      <div className="grid grid-cols-2 gap-2">
        <AcaoRapida icone={<IconePessoa />} label="Novo cliente" href="/cadastrados" />
        <AcaoRapida icone={<IconeCoracao />} label="Reativar clientes" href="/reativar" />
        <AcaoRapida icone={<IconeRelogio />} label="Ver histórico" href="/historico" />
        <AcaoRapida
          icone={<IconeEngrenagem />}
          label="Configurações"
          onClick={() => window.dispatchEvent(new CustomEvent('abrir-configuracoes'))}
        />
        {temAgenda && (
          <AcaoRapida icone={<IconeAgenda />} label="Novo agendamento" href="/agenda" />
        )}
        {temAgenda && (
          <AcaoRapida icone={<IconeAusente />} label="Ver faltaram" href="/faltaram" />
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
  const [periodo, setPeriodo] = useState('geral')

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const agora = new Date()
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
        { data: recentesData, error: recentesError },
      ] = await Promise.all([
        supabase.from('salao_config').select('id, nome_salao, nome_manicure, plano').single(),
        supabase.from('clientes_status').select('status'),
        supabase.from('clientes').select('data_nascimento').not('data_nascimento', 'is', null),
        // Faturamento/atendimentos totais (histórico completo) — usados no "Resumo geral".
        supabase.from('atendimentos').select('preco'),
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

      if (recentesError) {
        console.error('Erro ao buscar clientes recentes:', recentesError)
      }

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

      const clientesRecentesBase = (recentesData ?? []) as Omit<ClienteRecente, 'foto_url'>[]

      // foto_url é buscada em consulta separada e tolera a coluna ainda não existir
      // (pendente da migration sql/add-foto-url-clientes.sql) sem quebrar o card.
      let fotosPorId: Record<string, string | null> = {}
      if (clientesRecentesBase.length > 0) {
        const { data: fotosData, error: fotosError } = await supabase
          .from('clientes')
          .select('id, foto_url')
          .in('id', clientesRecentesBase.map((c) => c.id))
        if (fotosError) {
          console.error('Erro ao buscar fotos das clientes recentes:', fotosError)
        } else {
          fotosPorId = Object.fromEntries(
            ((fotosData ?? []) as { id: string; foto_url: string | null }[]).map((f) => [
              f.id,
              f.foto_url,
            ]),
          )
        }
      }

      const clientesRecentes: ClienteRecente[] = clientesRecentesBase.map((c) => ({
        ...c,
        foto_url: fotosPorId[c.id] ?? null,
      }))

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

      // Totais históricos (todos os atendimentos, sem filtro de data) — usados no "Resumo geral".
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

      // Filtro de período: quando um mês específico está selecionado, sobrescreve
      // faturamento, atendimentos, clientes ativas (e suas sparklines) e a lista de
      // clientes recentes para refletirem apenas aquele mês. O donut de status e a
      // agenda de hoje nunca são afetados pelo filtro.
      let faturamentoPeriodo: number | null = null
      let atendCountPeriodo: number | null = null
      let ativasPeriodo: number | null = null
      let seriePeriodo: { ativas: number[]; atendimentos: number[]; faturamento: number[] } | null = null
      let clientesRecentesPeriodo: ClienteRecente[] | null = null

      if (periodo !== 'geral') {
        const [anoRef, mesRef] = periodo.split('-').map(Number)
        const mesReferenciaData = new Date(anoRef, mesRef - 1, 1)
        const chaveReferencia = `${anoRef}-${String(mesRef).padStart(2, '0')}`
        const fimPeriodo = new Date(anoRef, mesRef, 1).toISOString().slice(0, 10)
        const inicioGraficoPeriodo = new Date(anoRef, mesRef - 1 - 5, 1).toISOString().slice(0, 10)

        const { data: atendGraficoPeriodo } = await supabase
          .from('atendimentos')
          .select('cliente_id, data_atendimento, preco')
          .gte('data_atendimento', inicioGraficoPeriodo)
          .lt('data_atendimento', fimPeriodo)

        const atendItemsPeriodo = (atendGraficoPeriodo ?? []) as {
          cliente_id: string
          data_atendimento: string
          preco: number | null
        }[]

        const estruturaMesesPeriodo = gerarEstruturaMeses(6, mesReferenciaData)
        const ativosPorMesPeriodo = contarAtivosDistintosPorMes(atendItemsPeriodo, estruturaMesesPeriodo)
        const atendDoMesPeriodo = atendItemsPeriodo.filter(
          (a) => a.data_atendimento.slice(0, 7) === chaveReferencia,
        )

        faturamentoPeriodo = atendDoMesPeriodo.reduce((s, a) => s + (a.preco ?? 0), 0)
        atendCountPeriodo = atendDoMesPeriodo.length
        ativasPeriodo = ativosPorMesPeriodo[chaveReferencia] ?? 0

        seriePeriodo = {
          ativas: estruturaMesesPeriodo.map(({ chave }) => ativosPorMesPeriodo[chave]),
          atendimentos: estruturaMesesPeriodo.map(
            ({ chave }) => atendItemsPeriodo.filter((a) => a.data_atendimento.slice(0, 7) === chave).length,
          ),
          faturamento: estruturaMesesPeriodo.map(({ chave }) =>
            atendItemsPeriodo
              .filter((a) => a.data_atendimento.slice(0, 7) === chave)
              .reduce((s, a) => s + (a.preco ?? 0), 0),
          ),
        }

        // Clientes recentes do período: distintas, ordenadas pelo atendimento mais
        // recente dentro do mês selecionado.
        const maisRecentePorCliente = new Map<string, string>()
        for (const a of atendDoMesPeriodo) {
          const atual = maisRecentePorCliente.get(a.cliente_id)
          if (!atual || a.data_atendimento > atual) {
            maisRecentePorCliente.set(a.cliente_id, a.data_atendimento)
          }
        }
        const idsRecentesPeriodo = [...maisRecentePorCliente.entries()]
          .sort((a, b) => b[1].localeCompare(a[1]))
          .slice(0, 5)
          .map(([id]) => id)

        if (idsRecentesPeriodo.length > 0) {
          const { data: statusPeriodoData, error: erroStatusPeriodo } = await supabase
            .from('clientes_status')
            .select('id, nome, status')
            .in('id', idsRecentesPeriodo)
          if (erroStatusPeriodo) {
            console.error('Erro ao buscar clientes recentes do período:', erroStatusPeriodo)
          }
          const statusPorId = Object.fromEntries(
            ((statusPeriodoData ?? []) as { id: string; nome: string; status: StatusCliente }[]).map(
              (c) => [c.id, c],
            ),
          )
          const { data: fotosPeriodoData, error: erroFotosPeriodo } = await supabase
            .from('clientes')
            .select('id, foto_url')
            .in('id', idsRecentesPeriodo)
          if (erroFotosPeriodo) {
            console.error('Erro ao buscar fotos das clientes recentes do período:', erroFotosPeriodo)
          }
          const fotosPeriodoPorId = Object.fromEntries(
            ((fotosPeriodoData ?? []) as { id: string; foto_url: string | null }[]).map((f) => [
              f.id,
              f.foto_url,
            ]),
          )
          clientesRecentesPeriodo = idsRecentesPeriodo
            .filter((id) => statusPorId[id])
            .map((id) => ({
              id,
              nome: statusPorId[id].nome,
              status: statusPorId[id].status,
              ultima_visita: maisRecentePorCliente.get(id) ?? null,
              foto_url: fotosPeriodoPorId[id] ?? null,
            }))
        } else {
          clientesRecentesPeriodo = []
        }
      }

      setDados({
        clientesAtivas: ativas,
        clientesAtivasCard: ativasPeriodo ?? ativas,
        clientesAtencao: atencao,
        clientesSumidas: sumidas,
        aniversariantesDoMes: aniversariantes,
        atendimentosDoMes: atendCountPeriodo ?? atendCount,
        faturamentoDoMes: faturamentoPeriodo ?? faturamento,
        totalClientes: total,
        movimentacoesHoje,
        series: {
          ativas: seriePeriodo?.ativas ?? serieAtivas,
          sumidas: serieSumidas,
          aniversariantes: serieAniversariantes,
          atendimentos: seriePeriodo?.atendimentos ?? serieAtendimentos,
          faturamento: seriePeriodo?.faturamento ?? serieFaturamento,
          total: serieTotal,
        },
        plano: planoDoSalao,
        clientesPendentes: pendentesCount ?? 0,
        clientesRecentes: clientesRecentesPeriodo ?? clientesRecentes,
        agendamentosHoje,
      })
      setCarregando(false)
    }

    carregar()
  }, [periodo])

  const cumprimento = saudacao()
  const temAgenda = dados?.plano === 'profissional' || dados?.plano === 'master'
  const opcoesPeriodo = gerarOpcoesPeriodo()
  const labelPeriodo = periodo === 'geral' ? null : MESES_PT_COMPLETO[Number(periodo.split('-')[1]) - 1]
  const rotuloFaturamento = labelPeriodo ? `Faturamento em ${labelPeriodo}` : 'Faturamento total'
  const rotuloAtendimentos = labelPeriodo ? `Atendimentos em ${labelPeriodo}` : 'Atendimentos totais'
  const rotuloAtivas = labelPeriodo ? `Clientes ativas em ${labelPeriodo}` : 'Clientes ativas'

  // Ícones dos KPIs usam violeta (acento único da marca); apenas "Sumidas" mantém
  // vermelho por ser um status real. As sparklines conservam a cor do próprio dado.
  const iconeMarca = { corIcone: 'var(--color-primary)', fundoIcone: 'var(--color-primary-soft)' }
  const iconeSumidas = { corIcone: 'var(--color-danger)', fundoIcone: 'var(--color-danger-soft)' }

  const kpis: KpiItem[] = dados
    ? [
        { key: 'ativas', icone: <IcAtivas />, numero: dados.clientesAtivasCard, rotulo: rotuloAtivas, href: '/clientes', cor: '#7C3AE3', ...iconeMarca, serie: dados.series.ativas },
        { key: 'sumidas', icone: <IcSumidas />, numero: dados.clientesSumidas, rotulo: 'Sumidas', href: '/reativar', cor: '#EF4444', ...iconeSumidas, serie: dados.series.sumidas },
        { key: 'aniversariantes', icone: <IcAniversariantes />, numero: dados.aniversariantesDoMes, rotulo: 'Aniversariantes do mês', href: '/aniversariantes', cor: '#F59E0B', ...iconeMarca, serie: dados.series.aniversariantes },
        { key: 'atendimentos', icone: <IcAtendimentos />, numero: dados.atendimentosDoMes, rotulo: rotuloAtendimentos, href: '/historico', cor: '#14B8A6', ...iconeMarca, serie: dados.series.atendimentos },
        { key: 'faturamento', icone: <IcFaturamento />, numero: formatarMoedaCompacta(dados.faturamentoDoMes), rotulo: rotuloFaturamento, href: '/historico', cor: '#22C55E', ...iconeMarca, serie: dados.series.faturamento },
        { key: 'total', icone: <IcTotal />, numero: dados.totalClientes, rotulo: 'Total de clientes', href: '/cadastrados', cor: '#2563EB', ...iconeMarca, serie: dados.series.total },
        { key: 'movimentacoes', icone: <IcMovimentacao />, numero: dados.movimentacoesHoje, rotulo: 'Movimentações hoje', href: '/movimentacao', cor: '#3B82F6', ...iconeMarca, serie: [] },
      ]
    : []

  return (
    <div className="dash-page">
      <div className="dash-content">
        {/* Saudação com faixa neutra sutil de marca — transparente no dark */}
        <div className="dash-greeting bg-primary-soft px-5 py-7">
          <p className="text-2xl font-bold tracking-tight text-text">
            {cumprimento}{nome ? `, ${nome}` : ''}!
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Aqui está o resumo do seu salão hoje
          </p>
        </div>

        {/* Banner de clientes pendentes */}
        {dados && dados.clientesPendentes > 0 && (
          <Link
            href="/cadastrados"
            className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 lg:mx-8"
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

        {/* Cabeçalho do resumo + filtro de período */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:px-8">
          <h2 className="text-base font-semibold text-text">Resumo geral</h2>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={carregando}
            aria-label="Filtrar período do resumo"
            className="form-select h-11 w-auto min-w-[9.5rem] text-sm font-medium"
          >
            {opcoesPeriodo.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Carrossel de KPIs (grupos de 3) */}
        {carregando ? (
          <div className="grid grid-cols-2 gap-5 px-4 pt-4 lg:grid-cols-3 lg:gap-6 lg:px-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : dados ? (
          <CarrosselKPIs itens={kpis} />
        ) : null}

        {/* Donut de status + colunas: clientes recentes · agenda de hoje · ações rápidas */}
        {carregando ? (
          <div className="grid grid-cols-1 gap-5 px-4 pt-6 pb-4 lg:grid-cols-4 lg:gap-6 lg:px-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="shimmer h-64 rounded-2xl bg-surface-2"
              />
            ))}
          </div>
        ) : dados ? (
          <div className="grid grid-cols-1 gap-5 px-4 pt-6 pb-4 lg:grid-cols-4 lg:gap-6 lg:px-8">
            <DonutStatus
              ativas={dados.clientesAtivas}
              atencao={dados.clientesAtencao}
              sumidas={dados.clientesSumidas}
            />
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
