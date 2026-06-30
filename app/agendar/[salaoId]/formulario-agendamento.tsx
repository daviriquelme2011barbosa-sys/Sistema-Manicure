'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { montarNumeroInternacional } from '@/lib/whatsapp'
import { CampoSenha } from '@/components/CampoSenha'
import { IconeCasa, IconeAgenda, IconeLista, IconeRelogio, IconePessoa, IconeAlerta } from '@/components/icons'

type EstadoAuth = 'carregando' | 'login' | 'verificando' | 'pendente' | 'nao_encontrado' | 'autenticado'
type Secao = 'inicio' | 'agendar' | 'agendamentos' | 'historico' | 'perfil'
type EtapaAgendar =
  | 'calendario'
  | 'horarios_carregando'
  | 'horarios'
  | 'servico'
  | 'confirmando'
  | 'confirmado'

type ClienteInfo = { id: string; nome: string; email: string }

type AgendamentoCliente = {
  id: string
  data: string
  horario: string | null
  servico: string | null
  status: string
}

type Props = {
  salaoId: string
  nomeSalao: string
  corPrimaria: string
  nomeManicure?: string | null
  whatsappManicure?: string | null
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const NOMES_MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const LABELS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const SECOES_MENU: { id: Secao; label: string; Icone: () => React.ReactElement; cor: string }[] = [
  { id: 'inicio', label: 'Início', Icone: IconeCasa, cor: '#2563EB' },
  { id: 'agendar', label: 'Agendar', Icone: IconeAgenda, cor: '#14B8A6' },
  { id: 'agendamentos', label: 'Meus Agendamentos', Icone: IconeLista, cor: '#F59E0B' },
  { id: 'historico', label: 'Histórico', Icone: IconeRelogio, cor: '#64748B' },
  { id: 'perfil', label: 'Meu Perfil', Icone: IconePessoa, cor: '#8B5CF6' },
]

function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function dataHojeISO(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function badgeStatus(status: string): { label: string; classes: string } {
  switch (status) {
    case 'pendente':   return { label: 'Pendente',   classes: 'bg-amber-100 text-amber-700' }
    case 'confirmado': return { label: 'Confirmado', classes: 'bg-green-100 text-green-700' }
    case 'compareceu': return { label: 'Compareceu', classes: 'bg-green-100 text-green-700' }
    case 'faltou':     return { label: 'Faltou',     classes: 'bg-red-100 text-red-600' }
    case 'cancelado':  return { label: 'Cancelado',  classes: 'bg-red-100 text-red-600' }
    default:           return { label: status,       classes: 'bg-slate-100 text-slate-500' }
  }
}

export default function FormularioAgendamento({
  salaoId,
  nomeSalao,
  nomeManicure,
  whatsappManicure,
}: Props) {
  const [supabaseLocal] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { auth: { persistSession: false } },
    ),
  )

  // ── Auth state ───────────────────────────────────────────────────────────────
  const [estadoAuth, setEstadoAuth] = useState<EstadoAuth>('carregando')
  const [cliente, setCliente] = useState<ClienteInfo | null>(null)
  const [accessToken, setAccessToken] = useState('')

  // ── Login form ───────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [secao, setSecao] = useState<Secao>('inicio')
  const [menuAberto, setMenuAberto] = useState(false)

  // ── Booking (seção Agendar) ──────────────────────────────────────────────────
  const hoje = new Date()
  const [diasAtivos, setDiasAtivos] = useState<Set<number>>(new Set())
  const [etapaAgendar, setEtapaAgendar] = useState<EtapaAgendar>('calendario')
  const [calAno, setCalAno] = useState(hoje.getFullYear())
  const [calMes, setCalMes] = useState(hoje.getMonth())
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [servico, setServico] = useState('')
  const [erroServico, setErroServico] = useState('')
  const [erroConfirmar, setErroConfirmar] = useState('')
  const [erroHorarios, setErroHorarios] = useState('')

  // ── Agendamentos ─────────────────────────────────────────────────────────────
  const [agendamentos, setAgendamentos] = useState<AgendamentoCliente[]>([])
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<AgendamentoCliente | null>(null)
  const [cancelando, setCancelando] = useState(false)

  // ── Perfil ───────────────────────────────────────────────────────────────────
  const [nomeEditado, setNomeEditado] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null)

  function mostrarToast(texto: string, tipo: 'sucesso' | 'erro') {
    setToast({ texto, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Session check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabaseLocal.auth.getSession()
      if (!session) {
        setEstadoAuth('login')
        return
      }
      setEstadoAuth('verificando')
      await executarVerificacao(session.access_token)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load agendamentos after login ────────────────────────────────────────────
  useEffect(() => {
    if (estadoAuth === 'autenticado' && accessToken) {
      carregarAgendamentos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoAuth])

  // ── Sync nomeEditado when entering perfil ────────────────────────────────────
  useEffect(() => {
    if (secao === 'perfil' && cliente) {
      setNomeEditado(cliente.nome)
    }
  }, [secao, cliente])

  // ── Auth functions ───────────────────────────────────────────────────────────

  async function executarVerificacao(token: string) {
    setAccessToken(token)
    try {
      const resp = await fetch('/api/agendar/verificar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salaoId }),
      })
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroLogin('Erro ao verificar cadastro. Tente novamente.')
        setEstadoAuth('login')
        return
      }

      if (resultado.status === 'is_owner') {
        await supabaseLocal.auth.signOut()
        return
      } else if (resultado.status === 'aprovado') {
        setCliente({ id: resultado.clienteId, nome: resultado.clienteNome, email: '' })
        setDiasAtivos(new Set<number>(resultado.diasAtivos as number[]))
        setEstadoAuth('autenticado')
      } else if (resultado.status === 'pendente') {
        setEstadoAuth('pendente')
      } else {
        setEstadoAuth('nao_encontrado')
      }
    } catch {
      setErroLogin('Sem conexão. Verifique a internet e tente novamente.')
      setEstadoAuth('login')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErroLogin('')

    if (!email.trim() || !senha) {
      setErroLogin('Preencha e-mail e senha')
      return
    }

    setEstadoAuth('verificando')

    const { data, error } = await supabaseLocal.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error || !data.session) {
      setErroLogin('E-mail ou senha incorretos')
      setEstadoAuth('login')
      return
    }

    await executarVerificacao(data.session.access_token)
  }

  async function sairDaConta() {
    await supabaseLocal.auth.signOut()
    setEstadoAuth('login')
    setAccessToken('')
    setCliente(null)
    setEmail('')
    setSenha('')
    setErroLogin('')
    setAgendamentos([])
    setSecao('inicio')
    resetarAgendar()
  }

  // ── Agendamentos functions ───────────────────────────────────────────────────

  async function carregarAgendamentos() {
    setCarregandoAgendamentos(true)
    try {
      const resp = await fetch(`/api/agendar/meus-agendamentos?salaoId=${salaoId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const dados = await resp.json()
      if (resp.ok) {
        setAgendamentos(dados.agendamentos as AgendamentoCliente[])
        if (dados.clienteEmail) {
          setCliente((prev) => (prev ? { ...prev, email: dados.clienteEmail as string } : prev))
        }
      }
    } catch {
      // silently fail — agendamentos ficam vazios
    } finally {
      setCarregandoAgendamentos(false)
    }
  }

  async function executarCancelar(agendamentoId: string) {
    setCancelando(true)
    try {
      const resp = await fetch('/api/agendar/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ agendamentoId, salaoId }),
      })
      if (resp.ok) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === agendamentoId ? { ...a, status: 'cancelado' } : a)),
        )
        mostrarToast('Agendamento cancelado', 'sucesso')
        setConfirmandoCancelar(null)
      } else {
        const dados = (await resp.json()) as { erro?: string }
        mostrarToast(dados.erro ?? 'Erro ao cancelar. Tente novamente.', 'erro')
      }
    } catch {
      mostrarToast('Sem conexão. Tente novamente.', 'erro')
    } finally {
      setCancelando(false)
    }
  }

  // ── Perfil functions ─────────────────────────────────────────────────────────

  async function salvarNome() {
    if (!nomeEditado.trim() || nomeEditado.trim() === cliente?.nome) return
    setSalvandoNome(true)
    try {
      const resp = await fetch('/api/agendar/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ nome: nomeEditado.trim(), salaoId }),
      })
      if (resp.ok) {
        setCliente((prev) => (prev ? { ...prev, nome: nomeEditado.trim() } : prev))
        mostrarToast('Nome atualizado', 'sucesso')
      } else {
        mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      }
    } catch {
      mostrarToast('Sem conexão. Tente novamente.', 'erro')
    } finally {
      setSalvandoNome(false)
    }
  }

  // ── Booking functions ────────────────────────────────────────────────────────

  function resetarAgendar() {
    setEtapaAgendar('calendario')
    setDataSelecionada('')
    setHorarioSelecionado('')
    setServico('')
    setErroServico('')
    setErroConfirmar('')
    setErroHorarios('')
  }

  function diaDisponivel(ano: number, mes: number, dia: number): boolean {
    const dataISO = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (dataISO < dataHojeISO()) return false
    const dayOfWeek = new Date(ano, mes, dia).getDay()
    return diasAtivos.has(dayOfWeek)
  }

  function formatDataISO(ano: number, mes: number, dia: number): string {
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function mesAnterior() {
    if (calMes === 0) { setCalMes(11); setCalAno(calAno - 1) }
    else setCalMes(calMes - 1)
  }

  function proximoMes() {
    if (calMes === 11) { setCalMes(0); setCalAno(calAno + 1) }
    else setCalMes(calMes + 1)
  }

  const podeMesAnterior =
    calAno > hoje.getFullYear() ||
    (calAno === hoje.getFullYear() && calMes > hoje.getMonth())

  async function selecionarData(dataISO: string) {
    setDataSelecionada(dataISO)
    setEtapaAgendar('horarios_carregando')
    setErroHorarios('')

    try {
      const resp = await fetch(`/api/agendar/horarios?salaoId=${salaoId}&data=${dataISO}`)
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroHorarios('Não foi possível carregar os horários. Tente novamente.')
        setEtapaAgendar('calendario')
        return
      }

      setHorariosDisponiveis((resultado.horarios as string[]) ?? [])
      setHorarioSelecionado('')
      setEtapaAgendar('horarios')
    } catch {
      setErroHorarios('Sem conexão. Verifique a internet e tente novamente.')
      setEtapaAgendar('calendario')
    }
  }

  async function confirmarAgendamento() {
    if (!servico.trim()) {
      setErroServico('Informe o serviço desejado')
      return
    }

    setErroConfirmar('')
    setEtapaAgendar('confirmando')

    try {
      const resp = await fetch('/api/agendar/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ salaoId, data: dataSelecionada, horario: horarioSelecionado, servico }),
      })
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroConfirmar((resultado as { erro?: string }).erro ?? 'Erro ao agendar. Tente novamente.')
        setEtapaAgendar('servico')
        return
      }

      setEtapaAgendar('confirmado')
      await carregarAgendamentos()
    } catch {
      setErroConfirmar('Sem conexão. Verifique a internet e tente novamente.')
      setEtapaAgendar('servico')
    }
  }

  function linkWhatsApp(): string {
    if (!whatsappManicure) return '#'
    const mensagem = `Olá! 😊 Passando aqui para confirmar meu agendamento para ${formatarDataBR(dataSelecionada)} às ${horarioSelecionado} - ${servico}. Até lá!`
    return `https://wa.me/${montarNumeroInternacional(whatsappManicure)}?text=${encodeURIComponent(mensagem)}`
  }

  // ── Derived data (computed during render) ────────────────────────────────────

  const hojeISO = dataHojeISO()
  const agendamentosAtivos = agendamentos
    .filter((a) => a.data >= hojeISO && (a.status === 'pendente' || a.status === 'confirmado'))
    .sort((a, b) => {
      const d = a.data.localeCompare(b.data)
      return d !== 0 ? d : (a.horario ?? '').localeCompare(b.horario ?? '')
    })
  const proximoAgendamento = agendamentosAtivos[0] ?? null
  const realizados = agendamentos.filter((a) => a.status === 'compareceu')
  const mesAtualNum = hoje.getMonth() + 1
  const anoAtualNum = hoje.getFullYear()
  const realizadosMesAtual = realizados.filter((a) => {
    const [y, m] = a.data.split('-').map(Number)
    return y === anoAtualNum && m === mesAtualNum
  }).length
  const mesAntNum = mesAtualNum === 1 ? 12 : mesAtualNum - 1
  const anoAntNum = mesAtualNum === 1 ? anoAtualNum - 1 : anoAtualNum
  const realizadosMesAnterior = realizados.filter((a) => {
    const [y, m] = a.data.split('-').map(Number)
    return y === anoAntNum && m === mesAntNum
  }).length
  const historicoAgendamentos = agendamentos
    .filter(
      (a) => !(a.data >= hojeISO && (a.status === 'pendente' || a.status === 'confirmado')),
    )
    .sort((a, b) => b.data.localeCompare(a.data))

  const nomeExibido = nomeManicure ?? nomeSalao

  // ── Section renderers ────────────────────────────────────────────────────────

  function renderInicio() {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Olá, {cliente?.nome.split(' ')[0]}!
        </h2>

        {/* Próximo agendamento */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Próximo agendamento
          </p>
          {carregandoAgendamentos ? (
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ) : proximoAgendamento ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                📅 {formatarDataBR(proximoAgendamento.data)}
                {proximoAgendamento.horario ? ` às ${proximoAgendamento.horario}` : ''}
              </p>
              {proximoAgendamento.servico && (
                <p className="mt-1 text-sm text-slate-700">✂️ {proximoAgendamento.servico}</p>
              )}
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeStatus(proximoAgendamento.status).classes}`}
              >
                {badgeStatus(proximoAgendamento.status).label}
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-400">Nenhum agendamento futuro</p>
              <button
                onClick={() => setSecao('agendar')}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
              >
                Agendar agora
              </button>
            </div>
          )}
        </div>

        {/* Métricas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Seus números
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600"
                aria-hidden="true"
              >
                ✓
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{realizados.length}</span>
                <span className="text-sm text-slate-500">atendimentos realizados</span>
              </div>
            </div>
            <div className="flex gap-6 border-t border-slate-100 pt-3">
              <div>
                <p className="text-xs text-slate-400">{NOMES_MESES_CURTOS[mesAtualNum - 1]}</p>
                <p className="text-lg font-semibold text-slate-900">{realizadosMesAtual}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{NOMES_MESES_CURTOS[mesAntNum - 1]}</p>
                <p className="text-lg font-semibold text-slate-400">{realizadosMesAnterior}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Atalho rápido */}
        <button
          onClick={() => { setSecao('agendar'); resetarAgendar() }}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
        >
          📅 Fazer novo agendamento
        </button>
      </div>
    )
  }

  function renderAgendar() {
    if (etapaAgendar === 'horarios_carregando' || etapaAgendar === 'confirmando') {
      const label = etapaAgendar === 'horarios_carregando'
        ? 'Buscando horários disponíveis…'
        : 'Confirmando agendamento…'
      return (
        <div className="flex flex-col items-center gap-4 py-16 px-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      )
    }

    if (etapaAgendar === 'calendario') {
      const primeiroDia = new Date(calAno, calMes, 1).getDay()
      const ultimoDia = new Date(calAno, calMes + 1, 0).getDate()
      const cells: (number | null)[] = []
      for (let i = 0; i < primeiroDia; i++) cells.push(null)
      for (let d = 1; d <= ultimoDia; d++) cells.push(d)
      while (cells.length % 7 !== 0) cells.push(null)

      return (
        <div className="flex flex-col gap-4 px-4 py-5">
          <h2 className="text-base font-semibold text-slate-900">Escolha uma data</h2>
          {erroHorarios && (
            <p role="alert" className="form-error"><IconeAlerta />{erroHorarios}</p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={mesAnterior}
                disabled={!podeMesAnterior}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {NOMES_MESES[calMes]} {calAno}
              </span>
              <button
                onClick={proximoMes}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors duration-200 hover:bg-slate-100"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {LABELS_DIAS.map((d, i) => (
                <div key={i} className="py-1 text-center text-xs font-medium text-slate-400">
                  {d}
                </div>
              ))}
              {cells.map((dia, i) => {
                if (!dia) return <div key={`e-${i}`} />
                const disponivel = diaDisponivel(calAno, calMes, dia)
                const dataISO = formatDataISO(calAno, calMes, dia)
                const selecionado = dataISO === dataSelecionada
                return (
                  <button
                    key={dia}
                    onClick={() => disponivel && selecionarData(dataISO)}
                    disabled={!disponivel}
                    className={`h-10 w-full rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selecionado
                        ? 'bg-blue-600 text-white'
                        : disponivel
                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        : 'cursor-default text-slate-300'
                    }`}
                  >
                    {dia}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    if (etapaAgendar === 'horarios') {
      return (
        <div className="flex flex-col gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEtapaAgendar('calendario')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              aria-label="Voltar"
            >
              ‹
            </button>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Horários disponíveis</h2>
              <p className="text-sm text-slate-500">{formatarDataBR(dataSelecionada)}</p>
            </div>
          </div>

          {horariosDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <p className="text-3xl">😔</p>
              <p className="text-sm font-medium text-slate-700">Nenhum horário disponível</p>
              <p className="text-xs text-slate-400">Escolha outro dia</p>
              <button
                onClick={() => setEtapaAgendar('calendario')}
                className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
              >
                Voltar ao calendário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {horariosDisponiveis.map((h) => {
                const selecionado = h === horarioSelecionado
                return (
                  <button
                    key={h}
                    onClick={() => setHorarioSelecionado(h)}
                    className={`flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition-colors duration-200 ${
                      selecionado
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {h}
                  </button>
                )
              })}
            </div>
          )}

          {horarioSelecionado && (
            <button
              onClick={() => setEtapaAgendar('servico')}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
            >
              Continuar → {horarioSelecionado}
            </button>
          )}
        </div>
      )
    }

    if (etapaAgendar === 'servico') {
      return (
        <div className="flex flex-col gap-5 px-4 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEtapaAgendar('horarios')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              aria-label="Voltar"
            >
              ‹
            </button>
            <h2 className="text-base font-semibold text-slate-900">Qual serviço você quer fazer?</h2>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              📅 {formatarDataBR(dataSelecionada)} às {horarioSelecionado}
            </p>
          </div>

          <div className="flex flex-col">
            <label htmlFor="servico" className="form-label">
              Serviço desejado <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="servico"
              type="text"
              value={servico}
              onChange={(e) => { setServico(e.target.value); setErroServico('') }}
              placeholder="Ex: manicure, pedicure, unhas em gel…"
              className={`form-input${erroServico ? ' form-input-erro' : ''}`}
            />
            {erroServico && (
              <span role="alert" className="form-error"><IconeAlerta />{erroServico}</span>
            )}
          </div>

          {erroConfirmar && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {erroConfirmar}
            </p>
          )}

          <button
            onClick={confirmarAgendamento}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
          >
            Confirmar agendamento
          </button>
        </div>
      )
    }

    if (etapaAgendar === 'confirmado') {
      const temWhatsApp = !!whatsappManicure
      return (
        <div className="flex flex-col items-center gap-5 px-4 py-8 text-center">
          <p className="text-5xl">✅</p>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agendamento solicitado!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sua solicitação foi enviada. A profissional irá confirmar em breve.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
            <p className="text-sm font-medium text-slate-700">
              📅 {formatarDataBR(dataSelecionada)} às {horarioSelecionado}
            </p>
            <p className="mt-1 text-sm text-slate-600">✂️ {servico}</p>
          </div>

          {temWhatsApp && (
            <a
              href={linkWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-sm transition-colors duration-200"
              style={{ backgroundColor: '#25D366' }}
            >
              <span>📱</span> Confirmar pelo WhatsApp
            </a>
          )}

          <button
            onClick={() => { setSecao('agendamentos'); resetarAgendar() }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
          >
            Ver meus agendamentos
          </button>
        </div>
      )
    }

    return null
  }

  function renderMeusAgendamentos() {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <h2 className="text-base font-semibold text-slate-900">Meus Agendamentos</h2>

        {carregandoAgendamentos ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : agendamentosAtivos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-4xl">📭</p>
            <p className="text-sm font-medium text-slate-700">Nenhum agendamento ativo</p>
            <p className="text-xs text-slate-400">Seus próximos agendamentos aparecerão aqui.</p>
            <button
              onClick={() => { setSecao('agendar'); resetarAgendar() }}
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
            >
              Agendar agora
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {agendamentosAtivos.map((ag) => {
              const badge = badgeStatus(ag.status)
              return (
                <li key={ag.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        📅 {formatarDataBR(ag.data)}{ag.horario ? ` às ${ag.horario}` : ''}
                      </p>
                      {ag.servico && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">✂️ {ag.servico}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmandoCancelar(ag)}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-xl border border-red-200 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                  >
                    Cancelar agendamento
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  function renderHistorico() {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <h2 className="text-base font-semibold text-slate-900">Histórico</h2>

        {carregandoAgendamentos ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : historicoAgendamentos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-4xl">🕐</p>
            <p className="text-sm font-medium text-slate-700">Nenhum histórico ainda</p>
            <p className="text-xs text-slate-400">Seus agendamentos passados aparecerão aqui.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {historicoAgendamentos.map((ag) => {
              const badge = badgeStatus(ag.status)
              return (
                <li key={ag.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">
                        📅 {formatarDataBR(ag.data)}{ag.horario ? ` às ${ag.horario}` : ''}
                      </p>
                      {ag.servico && (
                        <p className="mt-0.5 truncate text-sm text-slate-400">✂️ {ag.servico}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  function renderPerfil() {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        <h2 className="text-base font-semibold text-slate-900">Meu Perfil</h2>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400">E-mail</p>
              <p className="mt-0.5 text-sm text-slate-700">{cliente?.email || '—'}</p>
            </div>

            <div className="flex flex-col">
              <label htmlFor="nomeEditado" className="form-label">
                Nome
              </label>
              <input
                id="nomeEditado"
                type="text"
                value={nomeEditado}
                onChange={(e) => setNomeEditado(e.target.value)}
                disabled={salvandoNome}
                className="form-input"
              />
            </div>

            <button
              onClick={salvarNome}
              disabled={salvandoNome || !nomeEditado.trim() || nomeEditado.trim() === cliente?.nome}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvandoNome && <span className="form-spinner" aria-hidden="true" />}
              {salvandoNome ? 'Salvando...' : 'Salvar nome'}
            </button>
          </div>
        </div>

        <button
          onClick={sairDaConta}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-red-500 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-600"
        >
          Sair da conta
        </button>
      </div>
    )
  }

  // ── Authenticated app shell ──────────────────────────────────────────────────

  if (estadoAuth === 'autenticado') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed left-4 right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.tipo === 'sucesso' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.texto}
          </div>
        )}

        {/* Fixed header */}
        <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
          <span className="truncate text-sm font-semibold text-slate-900">{nomeSalao}</span>
          <button
            onClick={() => setMenuAberto(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect y="3" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="15" width="20" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        </header>

        {/* Hamburger menu overlay */}
        {menuAberto && (
          <>
            <div
              onClick={() => setMenuAberto(false)}
              className="fixed inset-0 z-40 bg-black/30"
              aria-hidden="true"
            />
            <div className="fixed bottom-0 left-0 top-0 z-50 w-72 bg-white shadow-2xl">
              <div className="flex h-14 items-center border-b border-slate-200 px-4">
                <span className="text-sm font-semibold text-slate-900">{nomeSalao}</span>
              </div>
              <nav className="flex flex-col py-2">
                {SECOES_MENU.map((item) => {
                  const ativo = secao === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSecao(item.id)
                        setMenuAberto(false)
                      }}
                      className={`flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors duration-200 ${
                        ativo
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="flex-shrink-0" style={{ color: item.cor }}>
                        <item.Icone />
                      </span>
                      {item.label}
                    </button>
                  )
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
                <p className="truncate text-xs text-slate-400">{cliente?.nome}</p>
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 pt-14 pb-8">
          {secao === 'inicio' && renderInicio()}
          {secao === 'agendar' && renderAgendar()}
          {secao === 'agendamentos' && renderMeusAgendamentos()}
          {secao === 'historico' && renderHistorico()}
          {secao === 'perfil' && renderPerfil()}
        </main>

        {/* Cancel confirmation modal */}
        {confirmandoCancelar && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4 sm:pb-4"
            onClick={() => !cancelando && setConfirmandoCancelar(null)}
          >
            <div
              className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-slate-900">Cancelar agendamento</h3>
              <p className="mt-2 text-sm text-slate-500">
                Tem certeza que deseja cancelar o agendamento do dia{' '}
                <strong>{formatarDataBR(confirmandoCancelar.data)}</strong>
                {confirmandoCancelar.horario ? ` às ${confirmandoCancelar.horario}` : ''}?
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setConfirmandoCancelar(null)}
                  disabled={cancelando}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Manter
                </button>
                <button
                  onClick={() => executarCancelar(confirmandoCancelar.id)}
                  disabled={cancelando}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-600 disabled:opacity-50"
                >
                  {cancelando && <span className="form-spinner" aria-hidden="true" />}
                  {cancelando ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Unauthenticated screens ──────────────────────────────────────────────────

  const estiloScroll: React.CSSProperties = { position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 1 }

  function renderTelaAuth() {
    if (estadoAuth === 'carregando' || estadoAuth === 'verificando') {
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">
            {estadoAuth === 'carregando' ? 'Carregando…' : 'Verificando seu cadastro…'}
          </p>
        </div>
      )
    }

    if (estadoAuth === 'login') {
      return (
        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Entrar na sua conta</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acesse sua conta para gerenciar seus agendamentos com {nomeExibido}
            </p>
          </div>

          <div className="flex flex-col">
            <label htmlFor="email-login" className="form-label">E-mail</label>
            <input
              id="email-login"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="form-input"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="senha-login" className="form-label">Senha</label>
            <CampoSenha
              id="senha-login"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erroLogin && (
            <p role="alert" className="form-error rounded-xl bg-red-50 px-4 py-3">
              <IconeAlerta />
              {erroLogin}
            </p>
          )}

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
          >
            Entrar
          </button>

          <p className="text-center text-sm text-slate-500">
            Não tem cadastro?{' '}
            <Link
              href={`/cadastro/${salaoId}`}
              className="font-semibold text-blue-600 underline hover:text-blue-700"
            >
              Fazer cadastro
            </Link>
          </p>
        </form>
      )
    }

    if (estadoAuth === 'pendente') {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-5xl">⏳</p>
          <h2 className="text-base font-semibold text-slate-900">Cadastro em análise</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Seu cadastro está aguardando aprovação da profissional. Assim que for aprovado, você poderá agendar!
          </p>
          <button onClick={sairDaConta} className="mt-2 text-sm font-medium text-slate-400 underline">
            Voltar ao início
          </button>
        </div>
      )
    }

    if (estadoAuth === 'nao_encontrado') {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-5xl">📋</p>
          <h2 className="text-base font-semibold text-slate-900">Cadastro não encontrado</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Você ainda não tem cadastro com {nomeExibido}. Faça seu cadastro primeiro para poder agendar.
          </p>
          <Link
            href={`/cadastro/${salaoId}`}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
          >
            Fazer cadastro
          </Link>
          <button onClick={sairDaConta} className="text-sm font-medium text-slate-400 underline">
            Voltar ao início
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div style={estiloScroll} className="bg-gradient-to-b from-blue-50/60 via-white to-slate-50">
      <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-slate-900">{nomeSalao}</h1>
          </div>
          {renderTelaAuth()}
        </div>
      </div>
    </div>
  )
}
