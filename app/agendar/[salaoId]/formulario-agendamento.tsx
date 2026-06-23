'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { normalizarWhatsApp } from '@/lib/formatters'

type Etapa =
  | 'login'
  | 'verificando'
  | 'pendente'
  | 'nao_encontrado'
  | 'calendario'
  | 'horarios_carregando'
  | 'horarios'
  | 'servico'
  | 'confirmando'
  | 'confirmado'

type ClienteInfo = { id: string; nome: string }

type Props = {
  salaoId: string
  nomeSalao: string
  corPrimaria: string
  fotoUrl?: string | null
  nomeManicure?: string | null
  genero?: string | null
  whatsappManicure?: string | null
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const LABELS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

export default function FormularioAgendamento({
  salaoId,
  nomeSalao,
  corPrimaria,
  fotoUrl,
  nomeManicure,
  genero,
  whatsappManicure,
}: Props) {
  const [supabaseLocal] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { auth: { persistSession: false } },
    ),
  )

  const [etapa, setEtapa] = useState<Etapa>('login')

  // Login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Dados do cliente verificado
  const [cliente, setCliente] = useState<ClienteInfo | null>(null)
  const [diasAtivos, setDiasAtivos] = useState<Set<number>>(new Set())
  const [accessToken, setAccessToken] = useState('')

  // Calendário
  const hoje = new Date()
  const [calAno, setCalAno] = useState(hoje.getFullYear())
  const [calMes, setCalMes] = useState(hoje.getMonth())
  const [dataSelecionada, setDataSelecionada] = useState('')

  // Horários
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [erroHorarios, setErroHorarios] = useState('')

  // Serviço
  const [servico, setServico] = useState('')
  const [erroServico, setErroServico] = useState('')
  const [erroConfirmar, setErroConfirmar] = useState('')

  // Verifica sessão existente ao montar
  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabaseLocal.auth.getSession()
      if (!session) return
      setEtapa('verificando')
      await executarVerificacao(session.access_token)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function executarVerificacao(token: string) {
    setAccessToken(token)
    try {
      const resp = await fetch('/api/agendar/verificar-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ salaoId }),
      })
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroLogin('Erro ao verificar cadastro. Tente novamente.')
        setEtapa('login')
        return
      }

      if (resultado.status === 'aprovado') {
        setCliente({ id: resultado.clienteId, nome: resultado.clienteNome })
        setDiasAtivos(new Set<number>(resultado.diasAtivos as number[]))
        setEtapa('calendario')
      } else if (resultado.status === 'pendente') {
        setEtapa('pendente')
      } else {
        setEtapa('nao_encontrado')
      }
    } catch {
      setErroLogin('Sem conexão. Verifique a internet e tente novamente.')
      setEtapa('login')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErroLogin('')

    if (!email.trim() || !senha) {
      setErroLogin('Preencha e-mail e senha')
      return
    }

    setEtapa('verificando')

    const { data, error } = await supabaseLocal.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error || !data.session) {
      setErroLogin('E-mail ou senha incorretos')
      setEtapa('login')
      return
    }

    await executarVerificacao(data.session.access_token)
  }

  async function sairDaConta() {
    await supabaseLocal.auth.signOut()
    setEtapa('login')
    setAccessToken('')
    setCliente(null)
    setDataSelecionada('')
    setHorarioSelecionado('')
    setServico('')
    setErroLogin('')
  }

  async function selecionarData(dataISO: string) {
    setDataSelecionada(dataISO)
    setEtapa('horarios_carregando')
    setErroHorarios('')

    try {
      const resp = await fetch(
        `/api/agendar/horarios?salaoId=${salaoId}&data=${dataISO}`,
      )
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroHorarios('Não foi possível carregar os horários. Tente novamente.')
        setEtapa('calendario')
        return
      }

      setHorariosDisponiveis(resultado.horarios ?? [])
      setHorarioSelecionado('')
      setEtapa('horarios')
    } catch {
      setErroHorarios('Sem conexão. Verifique a internet e tente novamente.')
      setEtapa('calendario')
    }
  }

  async function confirmarAgendamento() {
    if (!servico.trim()) {
      setErroServico('Informe o serviço desejado')
      return
    }

    setErroConfirmar('')
    setEtapa('confirmando')

    try {
      const resp = await fetch('/api/agendar/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          salaoId,
          data: dataSelecionada,
          horario: horarioSelecionado,
          servico,
        }),
      })
      const resultado = await resp.json()

      if (!resp.ok) {
        setErroConfirmar(resultado.erro ?? 'Erro ao agendar. Tente novamente.')
        setEtapa('servico')
        return
      }

      setEtapa('confirmado')
    } catch {
      setErroConfirmar('Sem conexão. Verifique a internet e tente novamente.')
      setEtapa('servico')
    }
  }

  // ── Calendário ───────────────────────────────────────────────────────────────

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
    if (calMes === 0) {
      setCalMes(11)
      setCalAno(calAno - 1)
    } else {
      setCalMes(calMes - 1)
    }
  }

  function proximoMes() {
    if (calMes === 11) {
      setCalMes(0)
      setCalAno(calAno + 1)
    } else {
      setCalMes(calMes + 1)
    }
  }

  const podeMesAnterior =
    calAno > hoje.getFullYear() ||
    (calAno === hoje.getFullYear() && calMes > hoje.getMonth())

  // ── WhatsApp link para confirmação ───────────────────────────────────────────

  function linkWhatsApp(): string {
    if (!whatsappManicure) return '#'
    const numero = normalizarWhatsApp(whatsappManicure)
    const mensagem = `Olá! 😊 Passando aqui para confirmar meu agendamento para ${formatarDataBR(dataSelecionada)} às ${horarioSelecionado} - ${servico}. Até lá!`
    return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`
  }

  // ── Visual compartilhado ─────────────────────────────────────────────────────

  const estiloAurora: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    backgroundColor: '#fdfbff',
    backgroundImage: `
      radial-gradient(ellipse 100% 70% at 50% -10%, ${hexToRgba(corPrimaria, 0.42)}, transparent 70%),
      radial-gradient(ellipse 75% 55% at 92% 100%, ${hexToRgba(corPrimaria, 0.28)}, transparent 60%),
      radial-gradient(ellipse 65% 50% at 8% 65%, ${hexToRgba(corPrimaria, 0.18)}, transparent 55%)
    `,
  }

  const estiloScroll: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    overflowY: 'auto',
    zIndex: 1,
  }

  const nomeExibido = nomeManicure ?? nomeSalao
  const pronome =
    genero === 'feminino' ? 'da ' : genero === 'masculino' ? 'do ' : ''

  // ── Conteúdo por etapa ───────────────────────────────────────────────────────

  function renderConteudo() {
    // Spinner genérico
    if (etapa === 'verificando' || etapa === 'horarios_carregando' || etapa === 'confirmando') {
      const label =
        etapa === 'verificando'
          ? 'Verificando seu cadastro…'
          : etapa === 'horarios_carregando'
            ? 'Buscando horários disponíveis…'
            : 'Confirmando agendamento…'
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: `${corPrimaria} transparent ${corPrimaria} ${corPrimaria}` }}
          />
          <p className="text-sm text-zinc-500">{label}</p>
        </div>
      )
    }

    // Login
    if (etapa === 'login') {
      return (
        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-800">Entrar para agendar</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Use o e-mail e senha que você cadastrou
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 rounded-lg border border-zinc-300 bg-white px-4 text-base text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 pr-12 text-base text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition focus:ring-2 focus:ring-pink-400"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {erroLogin && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {erroLogin}
            </p>
          )}

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-lg font-semibold text-white shadow-sm transition"
            style={{ backgroundColor: corPrimaria }}
          >
            Entrar
          </button>

          <div className="text-center">
            <p className="text-sm text-zinc-500">
              Não tem cadastro?{' '}
              <Link
                href={`/cadastro/${salaoId}`}
                className="font-semibold underline"
                style={{ color: corPrimaria }}
              >
                Fazer cadastro
              </Link>
            </p>
          </div>
        </form>
      )
    }

    // Aguardando aprovação
    if (etapa === 'pendente') {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-5xl">⏳</p>
          <h2 className="text-base font-semibold text-zinc-800">
            Cadastro em análise
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Seu cadastro está aguardando aprovação da profissional. Assim que for
            aprovado, você poderá agendar!
          </p>
          <button
            onClick={sairDaConta}
            className="mt-2 text-sm font-medium text-zinc-400 underline"
          >
            Voltar ao início
          </button>
        </div>
      )
    }

    // Sem cadastro neste salão
    if (etapa === 'nao_encontrado') {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-5xl">📋</p>
          <h2 className="text-base font-semibold text-zinc-800">
            Cadastro não encontrado
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Você ainda não tem cadastro {pronome}{nomeExibido}. Faça seu cadastro
            primeiro para poder agendar.
          </p>
          <Link
            href={`/cadastro/${salaoId}`}
            className="flex h-12 w-full items-center justify-center rounded-lg font-semibold text-white shadow-sm transition"
            style={{ backgroundColor: corPrimaria }}
          >
            Fazer cadastro
          </Link>
          <button
            onClick={sairDaConta}
            className="text-sm font-medium text-zinc-400 underline"
          >
            Voltar ao início
          </button>
        </div>
      )
    }

    // Calendário
    if (etapa === 'calendario') {
      const primeiroDia = new Date(calAno, calMes, 1).getDay()
      const ultimoDia = new Date(calAno, calMes + 1, 0).getDate()

      const cells: (number | null)[] = []
      for (let i = 0; i < primeiroDia; i++) cells.push(null)
      for (let d = 1; d <= ultimoDia; d++) cells.push(d)
      while (cells.length % 7 !== 0) cells.push(null)

      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-800">
              Olá, {cliente?.nome.split(' ')[0]}! Escolha uma data
            </h2>
            {erroHorarios && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {erroHorarios}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
            {/* Navegação de mês */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={mesAnterior}
                disabled={!podeMesAnterior}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-zinc-800">
                {NOMES_MESES[calMes]} {calAno}
              </span>
              <button
                onClick={proximoMes}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            {/* Grade */}
            <div className="grid grid-cols-7 gap-1">
              {LABELS_DIAS.map((d, i) => (
                <div
                  key={i}
                  className="py-1 text-center text-xs font-medium text-zinc-400"
                >
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
                    className={`h-10 w-full rounded-lg text-sm font-medium transition
                      ${
                        selecionado
                          ? 'text-white'
                          : disponivel
                            ? 'hover:opacity-80'
                            : 'cursor-default text-zinc-300'
                      }`}
                    style={
                      selecionado
                        ? { backgroundColor: corPrimaria }
                        : disponivel
                          ? {
                              backgroundColor: hexToRgba(corPrimaria, 0.12),
                              color: corPrimaria,
                            }
                          : {}
                    }
                  >
                    {dia}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={sairDaConta}
            className="text-center text-sm text-zinc-400 underline"
          >
            Sair da conta
          </button>
        </div>
      )
    }

    // Horários
    if (etapa === 'horarios') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEtapa('calendario')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              aria-label="Voltar"
            >
              ‹
            </button>
            <div>
              <h2 className="text-base font-semibold text-zinc-800">
                Horários disponíveis
              </h2>
              <p className="text-sm text-zinc-500">{formatarDataBR(dataSelecionada)}</p>
            </div>
          </div>

          {horariosDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-100 bg-white py-12 text-center">
              <p className="text-3xl">😔</p>
              <p className="text-sm font-medium text-zinc-700">
                Nenhum horário disponível para esta data
              </p>
              <p className="text-xs text-zinc-400">Escolha outro dia</p>
              <button
                onClick={() => setEtapa('calendario')}
                className="mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
                style={{ backgroundColor: corPrimaria }}
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
                    className="flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition"
                    style={
                      selecionado
                        ? { backgroundColor: corPrimaria, color: '#fff' }
                        : {
                            backgroundColor: hexToRgba(corPrimaria, 0.1),
                            color: corPrimaria,
                          }
                    }
                  >
                    {h}
                  </button>
                )
              })}
            </div>
          )}

          {horarioSelecionado && (
            <button
              onClick={() => setEtapa('servico')}
              className="flex h-12 w-full items-center justify-center rounded-xl font-semibold text-white transition"
              style={{ backgroundColor: corPrimaria }}
            >
              Continuar → {horarioSelecionado}
            </button>
          )}
        </div>
      )
    }

    // Serviço
    if (etapa === 'servico') {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEtapa('horarios')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              aria-label="Voltar"
            >
              ‹
            </button>
            <h2 className="text-base font-semibold text-zinc-800">
              Qual serviço você quer fazer?
            </h2>
          </div>

          {/* Resumo */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: hexToRgba(corPrimaria, 0.08) }}
          >
            <p className="text-sm font-medium" style={{ color: corPrimaria }}>
              📅 {formatarDataBR(dataSelecionada)} às {horarioSelecionado}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="servico" className="text-sm font-medium text-zinc-700">
              Serviço desejado{' '}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
            </label>
            <input
              id="servico"
              type="text"
              value={servico}
              onChange={(e) => {
                setServico(e.target.value)
                setErroServico('')
              }}
              placeholder="Ex: manicure, pedicure, unhas em gel…"
              className={`h-12 rounded-lg border px-4 text-base text-zinc-900 bg-white shadow-sm outline-none placeholder:text-zinc-400 transition focus:ring-2 focus:ring-pink-400 ${
                erroServico ? 'border-red-500' : 'border-zinc-300'
              }`}
            />
            {erroServico && (
              <span role="alert" className="text-sm text-red-600">
                {erroServico}
              </span>
            )}
          </div>

          {erroConfirmar && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {erroConfirmar}
            </p>
          )}

          <button
            onClick={confirmarAgendamento}
            className="flex h-12 w-full items-center justify-center rounded-xl font-semibold text-white transition"
            style={{ backgroundColor: corPrimaria }}
          >
            Confirmar agendamento
          </button>
        </div>
      )
    }

    // Confirmado
    if (etapa === 'confirmado') {
      const temWhatsApp = !!whatsappManicure
      return (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <p className="text-5xl">✅</p>
          <div>
            <h2 className="text-lg font-semibold text-zinc-800">
              Agendamento solicitado!
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Sua solicitação foi enviada. A profissional irá confirmar em breve.
            </p>
          </div>

          <div
            className="w-full rounded-xl p-4 text-left"
            style={{ backgroundColor: hexToRgba(corPrimaria, 0.08) }}
          >
            <p className="text-sm font-medium text-zinc-700">
              📅 {formatarDataBR(dataSelecionada)} às {horarioSelecionado}
            </p>
            <p className="mt-1 text-sm text-zinc-600">✂️ {servico}</p>
          </div>

          {temWhatsApp && (
            <a
              href={linkWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-sm transition"
              style={{ backgroundColor: '#25D366' }}
            >
              <span>📱</span>
              Confirmar pelo WhatsApp
            </a>
          )}

          <button
            onClick={() => {
              setEtapa('calendario')
              setDataSelecionada('')
              setHorarioSelecionado('')
              setServico('')
              setErroConfirmar('')
            }}
            className="text-sm text-zinc-400 underline"
          >
            Fazer outro agendamento
          </button>
        </div>
      )
    }

    return null
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div aria-hidden="true" style={estiloAurora} />

      <div style={estiloScroll}>
        <div className="relative flex min-h-full flex-col">
          {/* Cabeçalho */}
          <header
            className="overflow-hidden rounded-b-3xl px-6 py-8 text-center shadow-sm"
            style={{ backgroundColor: 'white', position: 'relative' }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                backgroundImage: `radial-gradient(circle at center, ${hexToRgba(corPrimaria, 0.3)}, transparent)`,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="mb-4 flex justify-center">
                {fotoUrl ? (
                  <Image
                    src={fotoUrl}
                    alt={nomeExibido}
                    width={80}
                    height={80}
                    className="rounded-full object-cover shadow-md"
                    style={{ border: `4px solid ${corPrimaria}` }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold shadow-md"
                    style={{ border: `4px solid ${corPrimaria}`, color: corPrimaria }}
                  >
                    {nomeExibido.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h1 className="text-base font-semibold" style={{ color: corPrimaria }}>
                Agendar horário {pronome}{nomeExibido} 😊
              </h1>
            </div>
          </header>

          {/* Conteúdo */}
          <main className="flex-1 px-4 pb-12 pt-6">{renderConteudo()}</main>
        </div>
      </div>
    </>
  )
}
