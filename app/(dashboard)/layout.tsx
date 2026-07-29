'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ToastView } from '@/components/Toast'
import {
  IconeEngrenagem,
  IconeFechar,
  IconeSol,
  IconeLua,
  IconeSair,
  IconeLista,
  IconePessoa,
  IconeMais,
  IconeCoracao,
  IconeRelogio,
  IconeHamburguer,
  IconeVoltar,
  IconeCasa,
  IconeBolo,
  IconeEstrela,
  IconeMovimentacao,
  IconeInfo,
  IconeDocumento,
  IconeEscudo,
  IconeChevronBaixo,
  IconeLivro,
  IconeAgenda,
  IconeAusente,
  IconeSino,
  IconeLupa,
  IconeCoroa,
} from '@/components/icons'
import {
  DDI_BRASIL,
  montarNumeroInternacional,
  normalizarWhatsAppCompleto,
  separarDdiNumero,
  validarNumeroWhatsApp,
} from '@/lib/whatsapp'
import { CampoWhatsApp } from '@/components/CampoWhatsApp'
import { HeaderProvider, useHeader } from '@/lib/header-context'
import { TutorialCarrossel } from '@/components/TutorialCarrossel'
import QRCode from 'qrcode'

type Tema = 'claro' | 'escuro'
type ModalSaibaMais = 'termos' | 'privacidade' | 'sobre' | null

// Cores por módulo — usadas apenas em ícones, indicadores e destaques de navegação
const COR_MODULO: Record<string, string> = {
  '/': '#7C3AE3', // Início (Dashboard) — cor primária da marca
  '/clientes': '#BB5CF6', // Clientes
  '/cadastrados': '#BB5CF6',
  '/agenda': '#14B8A6', // Agenda
  '/faltaram': '#F59E0B',
  '/cadastro': '#22C55E', // Registrar Atendimento
  '/reativar': '#EF4444',
  '/aniversariantes': '#BB5CF6',
  '/historico': '#64748B',
  '/movimentacao': '#3B82F6',
  '/changelog': '#F59E0B',
}

const TITULO_PAGINA: Record<string, string> = {
  '/': 'Início',
  '/clientes': 'Clientes',
  '/cadastrados': 'Cadastrados',
  '/agenda': 'Agenda',
  '/faltaram': 'Faltaram',
  '/cadastro': 'Registrar Atendimento',
  '/reativar': 'Reativar',
  '/aniversariantes': 'Aniversariantes',
  '/historico': 'Histórico',
  '/movimentacao': 'Movimentação',
  '/changelog': 'Novidades',
}

const ROTULO_PLANO: Record<string, string> = {
  basic: 'Basic',
  profissional: 'Profissional',
  master: 'Master',
}

type ResultadoCliente = { id: string; nome: string; whatsapp: string | null }
type ResultadoAgendamento = {
  id: string
  data: string
  horario: string | null
  nome: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </HeaderProvider>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { acaoVoltar } = useHeader()
  const router = useRouter()
  const pathname = usePathname()
  const [verificando, setVerificando] = useState(true)
  const [tema, setTema] = useState<Tema>('claro')
  const [menuAberto, setMenuAberto] = useState(false)
  const [painelAberto, setPainelAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [nomeSalao, setNomeSalao] = useState('')
  const [novoNomeSalao, setNovoNomeSalao] = useState('')
  const [idSalao, setIdSalao] = useState<string | null>(null)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [ddiWhatsapp, setDdiWhatsapp] = useState(DDI_BRASIL)
  const [numeroWhatsapp, setNumeroWhatsapp] = useState('')
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false)
  const [plano, setPlano] = useState<string>('basic')
  const [badgeAgenda, setBadgeAgenda] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [linkFormulario, setLinkFormulario] = useState('')
  const [badgeChangelog, setBadgeChangelog] = useState(0)
  const [badgeMovimentacao, setBadgeMovimentacao] = useState(0)
  const [badgeCadastrados, setBadgeCadastrados] = useState(0)
  const [fotoUrl, setFotoUrl] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#7C5CFF')
  const [corSelecionada, setCorSelecionada] = useState('#7C5CFF')
  const [salvandoFoto, setSalvandoFoto] = useState(false)
  const [removendoFoto, setRemovendoFoto] = useState(false)
  const [confirmandoRemoverFoto, setConfirmandoRemoverFoto] = useState(false)
  const [salvandoCor, setSalvandoCor] = useState(false)
  const [genero, setGenero] = useState<'feminino' | 'masculino' | 'nao_informar'>('nao_informar')
  const [salvandoGenero, setSalvandoGenero] = useState(false)
  const [opcoesFotoAbertas, setOpcoesFotoAbertas] = useState(false)
  const [submenuSaibaMaisAberto, setSubmenuSaibaMaisAberto] = useState(false)
  const [modalSaibaMais, setModalSaibaMais] = useState<ModalSaibaMais>(null)
  const [tutorialAberto, setTutorialAberto] = useState(false)
  const [modalPrimeirosPassosAberto, setModalPrimeirosPassosAberto] = useState(false)
  const [linkAgendamento, setLinkAgendamento] = useState('')
  const [copiadoFormularioModal, setCopiadoFormularioModal] = useState(false)
  const [copiadoAgendamentoModal, setCopiadoAgendamentoModal] = useState(false)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputGaleriaRef = useRef<HTMLInputElement>(null)
  const inputUploadRef = useRef<HTMLInputElement>(null)
  const { toast, mostrarToast } = useToast()

  // Sidebar recolhida (desktop) e dropdowns do header
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false)
  const [notifAberto, setNotifAberto] = useState(false)
  const [avatarAberto, setAvatarAberto] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  // Busca global
  const [buscaGlobal, setBuscaGlobal] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [buscandoGlobal, setBuscandoGlobal] = useState(false)
  const [resClientes, setResClientes] = useState<ResultadoCliente[]>([])
  const [resAgendamentos, setResAgendamentos] = useState<ResultadoAgendamento[]>([])
  const buscaDesktopRef = useRef<HTMLDivElement>(null)
  const buscaMobileRef = useRef<HTMLDivElement>(null)

  const totalNotificacoes =
    badgeCadastrados + badgeAgenda + badgeMovimentacao + badgeChangelog
  const tituloPagina = TITULO_PAGINA[pathname] ?? nomeSalao ?? 'Início'
  const temAgenda = plano === 'profissional' || plano === 'master'

  useEffect(() => {
    setMenuAberto(false)
    setNotifAberto(false)
    setAvatarAberto(false)
    setBuscaAberta(false)
    setBuscaGlobal('')
    const agora = new Date().toISOString()
    if (pathname === '/changelog') {
      localStorage.setItem('ultimo_acesso_changelog', agora)
      setBadgeChangelog(0)
    }
    if (pathname === '/movimentacao') {
      localStorage.setItem('ultimo_acesso_movimentacao', agora)
      setBadgeMovimentacao(0)
    }
    if (pathname === '/cadastrados') {
      setBadgeCadastrados(0)
    }
    if (pathname === '/agenda') {
      setBadgeAgenda(0)
    }
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : ''
    if (!menuAberto) setSubmenuSaibaMaisAberto(false)
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAberto])

  useEffect(() => {
    if (tutorialAberto) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [tutorialAberto])

  useEffect(() => {
    const temaSalvo = localStorage.getItem('tema')
    const escuro = temaSalvo
      ? temaSalvo === 'escuro'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    setTema(escuro ? 'escuro' : 'claro')
    document.documentElement.classList.toggle('dark', escuro)
  }, [])

  useEffect(() => {
    setSidebarRecolhida(localStorage.getItem('sidebar_recolhida') === 'true')
  }, [])

  // Permite que as Ações rápidas do dashboard abram o painel de configurações
  useEffect(() => {
    function abrir() {
      setPainelAberto(true)
    }
    window.addEventListener('abrir-configuracoes', abrir)
    return () => window.removeEventListener('abrir-configuracoes', abrir)
  }, [])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Node
      if (notifAberto && notifRef.current && !notifRef.current.contains(alvo)) {
        setNotifAberto(false)
      }
      if (avatarAberto && avatarRef.current && !avatarRef.current.contains(alvo)) {
        setAvatarAberto(false)
      }
      if (
        buscaAberta &&
        !buscaDesktopRef.current?.contains(alvo) &&
        !buscaMobileRef.current?.contains(alvo)
      ) {
        setBuscaAberta(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [notifAberto, avatarAberto, buscaAberta])

  // Busca global em tempo real (clientes + agendamentos), com debounce
  useEffect(() => {
    const termo = buscaGlobal.trim()
    if (!idSalao || termo.length < 2) {
      setResClientes([])
      setResAgendamentos([])
      setBuscandoGlobal(false)
      return
    }

    let cancelado = false
    setBuscandoGlobal(true)

    const timer = setTimeout(async () => {
      const padrao = `%${termo}%`
      const hoje = new Date().toISOString().split('T')[0]

      const [clientesRes, agendamentosRes] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome, whatsapp')
          .eq('salao_id', idSalao)
          .ilike('nome', padrao)
          .order('nome')
          .limit(5),
        supabase
          .from('agendamentos')
          .select('id, data, horario, clientes!inner(nome)')
          .eq('salao_id', idSalao)
          .gte('data', hoje)
          .ilike('clientes.nome', padrao)
          .order('data')
          .limit(5),
      ])

      if (cancelado) return

      setResClientes((clientesRes.data as ResultadoCliente[]) ?? [])

      type LinhaAg = {
        id: string
        data: string
        horario: string | null
        clientes: { nome: string } | { nome: string }[] | null
      }
      const ags = ((agendamentosRes.data as unknown) as LinhaAg[]) ?? []
      setResAgendamentos(
        ags.map((a) => ({
          id: a.id,
          data: a.data,
          horario: a.horario,
          nome: Array.isArray(a.clientes)
            ? a.clientes[0]?.nome ?? 'Cliente'
            : a.clientes?.nome ?? 'Cliente',
        })),
      )
      setBuscandoGlobal(false)
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [buscaGlobal, idSalao])

  useEffect(() => {
    async function inicializar() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        document.cookie = 'sb-logged-in=; path=/; Max-Age=0'
        router.replace('/login?sessao=expirada')
        return
      }

      setEmail(session.user.email ?? '')

      const { data: config } = await supabase
        .from('salao_config')
        .select('id, nome_salao, foto_url, cor_primaria, genero, whatsapp, plano, primeira_vez')
        .single()

      if (!config) {
        // Usuário autenticado sem salão — provavelmente cliente com conta Auth de salão pro/master.
        await supabase.auth.signOut()
        document.cookie = 'sb-logged-in=; path=/; Max-Age=0'
        router.replace('/login')
        return
      }

      if (config) {
        setNomeSalao(config.nome_salao)
        setNovoNomeSalao(config.nome_salao)
        setIdSalao(config.id)
        setLinkFormulario(`${window.location.origin}/cadastro/${config.id}`)
        setLinkAgendamento(`${window.location.origin}/agendar/${config.id}`)
        const fotoRaw = (config.foto_url as string | null) ?? ''
        setFotoUrl(fotoRaw ? `${fotoRaw}?t=${Date.now()}` : '')
        const corInicial = (config.cor_primaria as string | null) ?? '#7C5CFF'
        setCorPrimaria(corInicial)
        setCorSelecionada(corInicial)
        const generoInicial = (config.genero as 'feminino' | 'masculino' | 'nao_informar' | null) ?? 'nao_informar'
        setGenero(generoInicial)
        const whatsappInicial = (config.whatsapp as string | null) ?? ''
        setWhatsapp(whatsappInicial)
        const whatsappSeparado = separarDdiNumero(whatsappInicial)
        setDdiWhatsapp(whatsappSeparado.ddi)
        setNumeroWhatsapp(whatsappSeparado.numero)

        const planoConfig = (config.plano as string | null) ?? 'basic'
        setPlano(planoConfig)

        const agoraISO = new Date().toISOString()
        const ultimoChangelog = localStorage.getItem('ultimo_acesso_changelog')
        const ultimoMovimentacao = localStorage.getItem('ultimo_acesso_movimentacao')
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const corteMovimentacao =
          ultimoMovimentacao && ultimoMovimentacao > cutoff24h ? ultimoMovimentacao : cutoff24h

        const changelogQuery = ultimoChangelog
          ? supabase.from('changelog').select('*', { count: 'exact', head: true }).gt('criado_em', ultimoChangelog)
          : supabase.from('changelog').select('*', { count: 'exact', head: true })

        const salaoId = config.id
        const [
          { count: cChangelog },
          { count: cCadastros },
          { count: cAtendimentos },
          { count: cReativacoes },
          { count: cPendentes },
        ] = await Promise.all([
          changelogQuery,
          supabase.from('clientes').select('*', { count: 'exact', head: true })
            .eq('salao_id', salaoId).eq('origem', 'formulario').eq('status_cadastro', 'aprovado').gt('criado_em', corteMovimentacao),
          supabase.from('atendimentos').select('*', { count: 'exact', head: true })
            .eq('salao_id', salaoId).gt('criado_em', corteMovimentacao),
          supabase.from('reativacoes').select('*', { count: 'exact', head: true })
            .eq('salao_id', salaoId).gt('criado_em', corteMovimentacao),
          supabase.from('clientes').select('*', { count: 'exact', head: true })
            .eq('salao_id', salaoId).eq('origem', 'formulario').eq('status_cadastro', 'pendente'),
        ])

        if (pathname !== '/changelog') {
          setBadgeChangelog(cChangelog ?? 0)
        } else {
          localStorage.setItem('ultimo_acesso_changelog', agoraISO)
        }
        if (pathname !== '/movimentacao') {
          setBadgeMovimentacao((cCadastros ?? 0) + (cAtendimentos ?? 0) + (cReativacoes ?? 0))
        } else {
          localStorage.setItem('ultimo_acesso_movimentacao', agoraISO)
        }
        if (pathname !== '/cadastrados') {
          setBadgeCadastrados(cPendentes ?? 0)
        }

        if (
          (planoConfig === 'profissional' || planoConfig === 'master') &&
          pathname !== '/agenda'
        ) {
          const hoje = new Date().toISOString().split('T')[0]
          const { count: cAgenda } = await supabase
            .from('agendamentos')
            .select('*', { count: 'exact', head: true })
            .eq('salao_id', salaoId)
            .eq('status', 'pendente')
            .gte('data', hoje)
          setBadgeAgenda(cAgenda ?? 0)
        }
      }

      if (config?.primeira_vez === true) {
        setModalPrimeirosPassosAberto(true)
      }

      setVerificando(false)
    }

    inicializar()
  }, [router])

  function alternarTema() {
    const novoTema: Tema = tema === 'claro' ? 'escuro' : 'claro'
    setTema(novoTema)
    localStorage.setItem('tema', novoTema)
    document.documentElement.classList.toggle('dark', novoTema === 'escuro')
  }

  // No desktop o hambúrguer recolhe/expande a sidebar; no mobile abre o drawer.
  const alternarSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarRecolhida((v) => {
        const novo = !v
        localStorage.setItem('sidebar_recolhida', String(novo))
        return novo
      })
    } else {
      setMenuAberto(true)
    }
  }, [])

  const irPara = useCallback(
    (href: string) => {
      setNotifAberto(false)
      setAvatarAberto(false)
      setBuscaAberta(false)
      setMenuAberto(false)
      router.push(href)
    },
    [router],
  )

  async function salvarNomeSalao() {
    if (!novoNomeSalao.trim() || novoNomeSalao.trim() === nomeSalao || !idSalao) return
    setSalvandoNome(true)

    const { error } = await supabase
      .from('salao_config')
      .update({ nome_salao: novoNomeSalao.trim() })
      .eq('id', idSalao)

    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
    } else {
      setNomeSalao(novoNomeSalao.trim())
      mostrarToast('Nome do salão atualizado', 'sucesso')
    }
    setSalvandoNome(false)
  }

  async function salvarWhatsapp() {
    if (!idSalao) return
    const validacao = validarNumeroWhatsApp(ddiWhatsapp, numeroWhatsapp)
    if (!validacao.valido) {
      mostrarToast(validacao.erro ?? 'WhatsApp inválido.', 'erro')
      return
    }
    const normalizado = normalizarWhatsAppCompleto(ddiWhatsapp, numeroWhatsapp)
    if (normalizado === montarNumeroInternacional(whatsapp)) return
    setSalvandoWhatsapp(true)
    const { error } = await supabase
      .from('salao_config')
      .update({ whatsapp: normalizado })
      .eq('id', idSalao)
    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
    } else {
      setWhatsapp(normalizado)
      mostrarToast('WhatsApp atualizado', 'sucesso')
    }
    setSalvandoWhatsapp(false)
  }

  async function baixarQrCode() {
    const dataUrl = await QRCode.toDataURL(linkFormulario, { width: 500, margin: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qrcode-${nomeSalao.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkFormulario)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function fecharModalPrimeirosPassos() {
    setModalPrimeirosPassosAberto(false)
    if (!idSalao) return
    await supabase
      .from('salao_config')
      .update({ primeira_vez: false })
      .eq('id', idSalao)
  }

  async function copiarLinkFormularioModal() {
    await navigator.clipboard.writeText(linkFormulario)
    setCopiadoFormularioModal(true)
    setTimeout(() => setCopiadoFormularioModal(false), 2000)
  }

  async function copiarLinkAgendamentoModal() {
    await navigator.clipboard.writeText(linkAgendamento)
    setCopiadoAgendamentoModal(true)
    setTimeout(() => setCopiadoAgendamentoModal(false), 2000)
  }

  async function uploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    setOpcoesFotoAbertas(false)
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo || !idSalao) return

    const tiposPermitidos: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    if (!(arquivo.type in tiposPermitidos)) {
      mostrarToast('Formato não permitido. Use JPEG, PNG, WebP ou GIF.', 'erro')
      return
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      mostrarToast('A foto deve ter no máximo 5MB.', 'erro')
      return
    }

    setSalvandoFoto(true)
    const ext = tiposPermitidos[arquivo.type]
    const caminho = `${idSalao}/foto.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(caminho, arquivo, { upsert: true })
    if (uploadError) {
      mostrarToast('Não foi possível enviar a foto. Tente novamente.', 'erro')
      setSalvandoFoto(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(caminho)
    const novaUrl = urlData.publicUrl
    const { error: updateError } = await supabase
      .from('salao_config')
      .update({ foto_url: novaUrl })
      .eq('id', idSalao)
    if (updateError) {
      mostrarToast('Foto enviada mas não foi possível salvar. Tente novamente.', 'erro')
    } else {
      setFotoUrl(`${novaUrl}?t=${Date.now()}`)
      mostrarToast('Foto atualizada com sucesso', 'sucesso')
    }
    setSalvandoFoto(false)
  }

  async function removerFoto() {
    if (!idSalao) return
    setRemovendoFoto(true)
    const { error } = await supabase
      .from('salao_config')
      .update({ foto_url: null })
      .eq('id', idSalao)
    if (error) {
      mostrarToast('Não foi possível remover a foto. Tente novamente.', 'erro')
    } else {
      setFotoUrl('')
      mostrarToast('Foto removida', 'sucesso')
    }
    setConfirmandoRemoverFoto(false)
    setRemovendoFoto(false)
  }

  async function salvarCor() {
    if (!idSalao || corSelecionada === corPrimaria) return
    setSalvandoCor(true)
    const { error } = await supabase
      .from('salao_config')
      .update({ cor_primaria: corSelecionada })
      .eq('id', idSalao)
    if (error) {
      mostrarToast('Não foi possível salvar a cor. Tente novamente.', 'erro')
    } else {
      setCorPrimaria(corSelecionada)
      mostrarToast('Cor salva com sucesso', 'sucesso')
    }
    setSalvandoCor(false)
  }

  async function salvarGenero(novoGenero: 'feminino' | 'masculino' | 'nao_informar') {
    if (!idSalao || novoGenero === genero) return
    setSalvandoGenero(true)
    const { error } = await supabase
      .from('salao_config')
      .update({ genero: novoGenero })
      .eq('id', idSalao)
    if (error) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
    } else {
      setGenero(novoGenero)
      mostrarToast('Gênero salvo com sucesso', 'sucesso')
    }
    setSalvandoGenero(false)
  }

  async function fazerLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-logged-in=; path=/; Max-Age=0'
    router.replace('/login')
  }

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Inputs de foto fora de qualquer container fixed/overflow — necessário para iOS */}
      <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={uploadFoto} />
      <input ref={inputGaleriaRef} type="file" accept="image/*" className="sr-only" onChange={uploadFoto} />
      <input ref={inputUploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadFoto} />

      <ToastView toast={toast} />

      {/* Header fixo: hamburguer + título | busca global | notificações + avatar */}
      <header
        className={`chrome-header fixed right-0 top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-topbar px-2 backdrop-blur-md sm:gap-3 sm:px-4 left-0 ${
          sidebarRecolhida ? 'lg:left-[4.5rem]' : 'lg:left-64'
        }`}
      >
        {/* Esquerda: hamburguer + voltar + título */}
        <div className="flex min-w-0 flex-shrink items-center gap-1">
          <button
            onClick={alternarSidebar}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-2 hover:text-text"
            aria-label="Recolher ou expandir menu"
          >
            <IconeHamburguer />
          </button>
          {acaoVoltar && (
            <button
              onClick={acaoVoltar}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-2 hover:text-text"
              aria-label="Voltar"
            >
              <IconeVoltar />
            </button>
          )}
          <h1 className="ml-1 min-w-0 truncate text-base font-semibold text-text">
            {tituloPagina}
          </h1>
        </div>

        {/* Centro: busca global (sm+) */}
        <div ref={buscaDesktopRef} className="relative mx-auto hidden w-full max-w-md sm:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <IconeLupa />
          </span>
          <input
            type="search"
            value={buscaGlobal}
            onChange={(e) => setBuscaGlobal(e.target.value)}
            onFocus={() => setBuscaAberta(true)}
            placeholder="Buscar clientes, agendamentos..."
            className="h-10 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/30"
          />
          {buscaAberta && buscaGlobal.trim().length >= 2 && (
            <PainelResultadosBusca
              buscando={buscandoGlobal}
              clientes={resClientes}
              agendamentos={resAgendamentos}
              onIr={irPara}
            />
          )}
        </div>

        {/* Direita: busca (mobile) + notificações + avatar */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
          <button
            onClick={() => setBuscaAberta(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-2 hover:text-text sm:hidden"
            aria-label="Buscar"
          >
            <IconeLupa />
          </button>

          {/* Notificações */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifAberto((v) => !v)
                setAvatarAberto(false)
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-2 hover:text-text"
              aria-label="Notificações"
            >
              <IconeSino />
              {totalNotificacoes > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                  {totalNotificacoes > 9 ? '9+' : totalNotificacoes}
                </span>
              )}
            </button>
            {notifAberto && (
              <div className="chrome-pop absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                <div className="border-b border-divider px-4 py-3">
                  <p className="text-sm font-semibold text-text">
                    Notificações
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {totalNotificacoes === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-text-muted">
                      Tudo em dia ✨
                    </p>
                  ) : (
                    <>
                      {badgeCadastrados > 0 && (
                        <NotifItem
                          cor="#BB5CF6"
                          texto={`${badgeCadastrados} ${badgeCadastrados === 1 ? 'cliente aguardando' : 'clientes aguardando'} aprovação`}
                          onClick={() => irPara('/cadastrados')}
                        >
                          <IconePessoa />
                        </NotifItem>
                      )}
                      {temAgenda && badgeAgenda > 0 && (
                        <NotifItem
                          cor="#14B8A6"
                          texto={`${badgeAgenda} ${badgeAgenda === 1 ? 'agendamento pendente' : 'agendamentos pendentes'}`}
                          onClick={() => irPara('/agenda')}
                        >
                          <IconeAgenda />
                        </NotifItem>
                      )}
                      {badgeMovimentacao > 0 && (
                        <NotifItem
                          cor="#3B82F6"
                          texto={`${badgeMovimentacao} ${badgeMovimentacao === 1 ? 'nova atividade' : 'novas atividades'}`}
                          onClick={() => irPara('/movimentacao')}
                        >
                          <IconeMovimentacao />
                        </NotifItem>
                      )}
                      {badgeChangelog > 0 && (
                        <NotifItem
                          cor="#F59E0B"
                          texto={`${badgeChangelog} ${badgeChangelog === 1 ? 'novidade no sistema' : 'novidades no sistema'}`}
                          onClick={() => irPara('/changelog')}
                        >
                          <IconeEstrela />
                        </NotifItem>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar + dropdown */}
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => {
                setAvatarAberto((v) => !v)
                setNotifAberto(false)
              }}
              className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 transition hover:bg-surface-2 sm:pr-2"
              aria-label="Abrir menu da conta"
            >
              <Avatar fotoUrl={fotoUrl} nome={nomeSalao} />
              <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                <span className="max-w-[10rem] truncate text-sm font-semibold text-text">
                  {nomeSalao || 'Minha conta'}
                </span>
                <span className="text-xs text-text-muted">Administrador</span>
              </span>
              <span className="hidden text-text-muted sm:block">
                <IconeChevronBaixo />
              </span>
            </button>
            {avatarAberto && (
              <div className="chrome-pop absolute right-0 top-14 z-40 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
                  <Avatar fotoUrl={fotoUrl} nome={nomeSalao} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">
                      {nomeSalao || 'Minha conta'}
                    </p>
                    <p className="truncate text-xs text-text-muted">{email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setAvatarAberto(false)
                      setPainelAberto(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-2"
                  >
                    <span className="text-text-muted">
                      <IconeEngrenagem />
                    </span>
                    Configurações
                  </button>
                  <button
                    onClick={alternarTema}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-2"
                  >
                    <span className="text-text-muted">
                      {tema === 'claro' ? <IconeLua /> : <IconeSol />}
                    </span>
                    {tema === 'claro' ? 'Modo escuro' : 'Modo claro'}
                  </button>
                  <hr className="my-1 border-divider" />
                  <button
                    onClick={fazerLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <IconeSair />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Busca mobile expandida */}
        {buscaAberta && (
          <div
            ref={buscaMobileRef}
            className="chrome-pop absolute inset-x-2 top-[4.25rem] z-40 sm:hidden"
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                <IconeLupa />
              </span>
              <input
                type="search"
                autoFocus
                value={buscaGlobal}
                onChange={(e) => setBuscaGlobal(e.target.value)}
                placeholder="Buscar clientes, agendamentos..."
                className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-text shadow-lg outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {buscaGlobal.trim().length >= 2 && (
              <PainelResultadosBusca
                buscando={buscandoGlobal}
                clientes={resClientes}
                agendamentos={resAgendamentos}
                onIr={irPara}
              />
            )}
          </div>
        )}
      </header>

      {/* Overlay do drawer (apenas mobile) */}
      {menuAberto && (
        <div
          className="animar-overlay fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer no mobile, fixa e recolhível no desktop */}
      <aside
        className={`chrome-sidebar fixed left-0 top-0 z-40 flex h-[100dvh] w-72 max-w-[80vw] flex-col border-r border-border bg-sidebar lg:max-w-none lg:translate-x-0 ${
          menuAberto ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${sidebarRecolhida ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
        aria-label="Menu de navegação"
      >
        {/* Marca + fechar (mobile) */}
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-500 text-sm font-bold text-white shadow-sm">
            {(nomeSalao || 'F').charAt(0).toUpperCase()}
          </div>
          <span
            className={`chrome-label min-w-0 flex-1 truncate text-base font-semibold text-text ${
              sidebarRecolhida ? 'lg:hidden' : ''
            }`}
          >
            {nomeSalao || 'Facilitaai'}
          </span>
          <button
            onClick={() => setMenuAberto(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-2 lg:hidden"
            aria-label="Fechar menu"
          >
            <IconeFechar />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-3">
          <MenuItem href="/" label="Início" ativo={pathname === '/'} cor={COR_MODULO['/']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeCasa />
          </MenuItem>
          <MenuItem href="/clientes" label="Clientes" ativo={pathname === '/clientes'} cor={COR_MODULO['/clientes']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeLista />
          </MenuItem>
          <MenuItem href="/cadastrados" label="Cadastrados" ativo={pathname === '/cadastrados'} badge={badgeCadastrados} cor={COR_MODULO['/cadastrados']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconePessoa />
          </MenuItem>
          {temAgenda && (
            <MenuItem href="/agenda" label="Agenda" ativo={pathname === '/agenda'} badge={badgeAgenda} cor={COR_MODULO['/agenda']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
              <IconeAgenda />
            </MenuItem>
          )}
          {temAgenda && (
            <MenuItem href="/faltaram" label="Faltaram" ativo={pathname === '/faltaram'} cor={COR_MODULO['/faltaram']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
              <IconeAusente />
            </MenuItem>
          )}
          {!temAgenda && (
            <MenuItem href="/cadastro" label="Registrar Atendimento" ativo={pathname === '/cadastro'} cor={COR_MODULO['/cadastro']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
              <IconeMais />
            </MenuItem>
          )}
          <MenuItem href="/reativar" label="Reativar" ativo={pathname === '/reativar'} cor={COR_MODULO['/reativar']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeCoracao />
          </MenuItem>
          <MenuItem href="/aniversariantes" label="Aniversariantes" ativo={pathname === '/aniversariantes'} cor={COR_MODULO['/aniversariantes']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeBolo />
          </MenuItem>
          <MenuItem href="/historico" label="Histórico" ativo={pathname === '/historico'} cor={COR_MODULO['/historico']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeRelogio />
          </MenuItem>
          <MenuItem href="/movimentacao" label="Movimentação" ativo={pathname === '/movimentacao'} badge={badgeMovimentacao} cor={COR_MODULO['/movimentacao']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeMovimentacao />
          </MenuItem>
          <MenuItem href="/changelog" label="Novidades" ativo={pathname === '/changelog'} badge={badgeChangelog} cor={COR_MODULO['/changelog']} recolhida={sidebarRecolhida} onNavegar={() => setMenuAberto(false)}>
            <IconeEstrela />
          </MenuItem>

          <hr className="my-2 border-divider" />

          <BotaoMenu icone={<IconeLivro />} label="Tutorial" recolhida={sidebarRecolhida} onClick={() => { setMenuAberto(false); setTutorialAberto(true) }} />
          <BotaoMenu icone={<IconeEngrenagem />} label="Configurações" recolhida={sidebarRecolhida} onClick={() => { setMenuAberto(false); setPainelAberto(true) }} />

          <div>
            <button
              onClick={() => setSubmenuSaibaMaisAberto((v) => !v)}
              title={sidebarRecolhida ? 'Saiba Mais' : undefined}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary transition hover:bg-surface-2 ${
                sidebarRecolhida ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <span className="flex-shrink-0 text-text-muted">
                <IconeInfo />
              </span>
              <span className={`chrome-label ${sidebarRecolhida ? 'lg:hidden' : ''}`}>Saiba Mais</span>
              <span
                className={`chrome-label ml-auto text-text-muted transition-transform duration-200 ${
                  submenuSaibaMaisAberto ? 'rotate-180' : ''
                } ${sidebarRecolhida ? 'lg:hidden' : ''}`}
              >
                <IconeChevronBaixo />
              </span>
            </button>

            {submenuSaibaMaisAberto && (
              <div
                className={`ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-divider pl-3 ${
                  sidebarRecolhida ? 'lg:hidden' : ''
                }`}
              >
                <button
                  onClick={() => { setMenuAberto(false); setModalSaibaMais('termos') }}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-text-secondary transition hover:bg-surface-2"
                >
                  <span className="flex-shrink-0 text-text-muted">
                    <IconeDocumento />
                  </span>
                  Termos de Uso
                </button>
                <button
                  onClick={() => { setMenuAberto(false); setModalSaibaMais('privacidade') }}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-text-secondary transition hover:bg-surface-2"
                >
                  <span className="flex-shrink-0 text-text-muted">
                    <IconeEscudo />
                  </span>
                  Política de Privacidade
                </button>
                <button
                  onClick={() => { setMenuAberto(false); setModalSaibaMais('sobre') }}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-text-secondary transition hover:bg-surface-2"
                >
                  <span className="flex-shrink-0 text-text-muted">
                    <IconeInfo />
                  </span>
                  Sobre o Sistema
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Rodapé: card do plano */}
        <div className="flex-shrink-0 border-t border-border p-3">
          <CardPlano plano={plano} recolhida={sidebarRecolhida} />
        </div>
      </aside>

      {/* Painel de configurações */}
      {painelAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Configurações"
          className="fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center"
        >
          <div
            className="animar-overlay absolute inset-0 bg-black/40"
            onClick={() => !salvandoNome && !salvandoWhatsapp && setPainelAberto(false)}
          />

          <div className="animar-sheet relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pb-8 pt-5 shadow-xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong sm:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text">
                Configurações
              </h2>
              <button
                onClick={() => !salvandoNome && !salvandoWhatsapp && setPainelAberto(false)}
                disabled={salvandoNome || salvandoWhatsapp}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-2 disabled:opacity-40"
                aria-label="Fechar"
              >
                <IconeFechar />
              </button>
            </div>

            {email && (
              <div className="mb-5 rounded-xl bg-surface-2 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Conta
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-text">
                  {email}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-5">

              <div className="flex flex-col">
                <label htmlFor="config-nome-salao" className="form-label">
                  Nome do profissional
                </label>
                <div className="flex gap-2">
                  <input
                    id="config-nome-salao"
                    type="text"
                    autoCapitalize="words"
                    value={novoNomeSalao}
                    onChange={(e) => setNovoNomeSalao(e.target.value)}
                    disabled={salvandoNome}
                    className="form-input min-w-0 flex-1"
                  />
                  <button
                    onClick={salvarNomeSalao}
                    disabled={
                      salvandoNome ||
                      !novoNomeSalao.trim() ||
                      novoNomeSalao.trim() === nomeSalao
                    }
                    className="btn-primary flex-shrink-0 px-4 text-sm"
                  >
                    {salvandoNome && <span className="form-spinner" aria-hidden="true" />}
                    {salvandoNome ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="config-whatsapp" className="form-label">
                  WhatsApp do profissional
                </label>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <CampoWhatsApp
                      id="config-whatsapp"
                      variante="painel"
                      ddi={ddiWhatsapp}
                      numero={numeroWhatsapp}
                      onChange={(novoDdi, novoNumero) => {
                        setDdiWhatsapp(novoDdi)
                        setNumeroWhatsapp(novoNumero)
                      }}
                      disabled={salvandoWhatsapp}
                    />
                  </div>
                  <button
                    onClick={salvarWhatsapp}
                    disabled={
                      salvandoWhatsapp ||
                      !validarNumeroWhatsApp(ddiWhatsapp, numeroWhatsapp).valido ||
                      normalizarWhatsAppCompleto(ddiWhatsapp, numeroWhatsapp) ===
                        montarNumeroInternacional(whatsapp)
                    }
                    className="btn-primary flex-shrink-0 px-4 text-sm"
                  >
                    {salvandoWhatsapp && <span className="form-spinner" aria-hidden="true" />}
                    {salvandoWhatsapp ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="config-genero" className="form-label">
                  Gênero do profissional
                </label>
                <select
                  id="config-genero"
                  value={genero}
                  onChange={(e) => salvarGenero(e.target.value as 'feminino' | 'masculino' | 'nao_informar')}
                  disabled={salvandoGenero}
                  className="form-select"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="nao_informar">Prefiro não informar</option>
                </select>
                {salvandoGenero && (
                  <p className="mt-1.5 text-xs text-text-muted">Salvando...</p>
                )}
              </div>

              {linkFormulario && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-text">
                    Link do seu formulário
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
                      {linkFormulario}
                    </span>
                    <button
                      onClick={copiarLink}
                      className="flex-shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed"
                    >
                      {copiado ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                  <button
                    onClick={baixarQrCode}
                    className="self-start text-sm text-primary hover:text-primary-hover hover:underline dark:text-primary"
                  >
                    Baixar QR Code
                  </button>
                </div>
              )}

              <hr className="border-border" />

              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-text">
                  Personalizar formulário
                </p>

                {/* Foto */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-text-secondary">Foto</p>
                  {fotoUrl && (
                    <img
                      src={fotoUrl}
                      alt="Foto do salão"
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  )}
                  {fotoUrl && !confirmandoRemoverFoto && (
                    <button
                      type="button"
                      onClick={() => setConfirmandoRemoverFoto(true)}
                      disabled={salvandoFoto}
                      className="self-start text-xs text-red-500 transition hover:text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remover foto
                    </button>
                  )}
                  {fotoUrl && confirmandoRemoverFoto && (
                    <div className="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/30">
                      <span className="flex-1 text-xs text-red-700 dark:text-red-300">Remover a foto?</span>
                      <button
                        type="button"
                        onClick={removerFoto}
                        disabled={removendoFoto}
                        className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                      >
                        {removendoFoto ? 'Removendo…' : 'Sim, remover'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoRemoverFoto(false)}
                        disabled={removendoFoto}
                        className="text-xs text-text-secondary transition hover:text-text disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setOpcoesFotoAbertas((v) => !v)}
                    disabled={salvandoFoto}
                    className="btn-secondary text-sm"
                  >
                    {salvandoFoto && <span className="form-spinner border-border-strong border-t-text" aria-hidden="true" />}
                    {salvandoFoto ? 'Enviando...' : fotoUrl ? 'Alterar foto' : 'Escolher foto'}
                  </button>

                  {opcoesFotoAbertas && !salvandoFoto && (
                    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
                      {/* câmera — apenas mobile */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputCameraRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 px-4 text-sm text-text transition hover:bg-surface-2 sm:hidden"
                      >
                        <span aria-hidden="true">📷</span> Tirar foto
                      </button>
                      {/* galeria — apenas mobile */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputGaleriaRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 border-t border-border px-4 text-sm text-text transition hover:bg-surface-2 sm:hidden"
                      >
                        <span aria-hidden="true">🖼️</span> Escolher da galeria
                      </button>
                      {/* upload — sempre visível */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputUploadRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 border-t border-border px-4 text-sm text-text transition hover:bg-surface-2 sm:border-t-0"
                      >
                        <span aria-hidden="true">💻</span> Fazer upload
                      </button>
                    </div>
                  )}
                </div>

                {/* Cor primária */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-text-secondary">
                    Cor primária
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <label className="relative block h-20 w-20 cursor-pointer">
                      <div
                        className="h-20 w-20 rounded-full shadow-lg ring-4 ring-surface"
                        style={{ backgroundColor: corSelecionada }}
                      />
                      <input
                        type="color"
                        value={corSelecionada}
                        onChange={(e) => setCorSelecionada(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Escolher cor primária"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: corSelecionada }}
                      />
                      <span className="font-mono text-sm text-text-secondary">
                        {corSelecionada}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={salvarCor}
                    disabled={salvandoCor || corSelecionada === corPrimaria}
                    className="btn-primary text-sm"
                  >
                    {salvandoCor && <span className="form-spinner" aria-hidden="true" />}
                    {salvandoCor ? 'Salvando...' : 'Salvar cor'}
                  </button>
                </div>
              </div>

              <hr className="border-border" />

              <button
                onClick={fazerLogout}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <IconeSair />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Saiba Mais */}
      {modalSaibaMais && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            modalSaibaMais === 'termos'
              ? 'Termos de Uso'
              : modalSaibaMais === 'privacidade'
              ? 'Política de Privacidade'
              : 'Sobre o Sistema'
          }
          className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
        >
          <div
            className="animar-overlay absolute inset-0 bg-black/40"
            onClick={() => setModalSaibaMais(null)}
          />
          <div className="animar-sheet relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-2 mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-border-strong sm:hidden" />

            <div className="flex flex-shrink-0 items-center justify-between px-5 pb-4 pt-2">
              <h2 className="text-base font-semibold text-text">
                {modalSaibaMais === 'termos'
                  ? 'Termos de Uso'
                  : modalSaibaMais === 'privacidade'
                  ? 'Política de Privacidade'
                  : 'Sobre o Sistema'}
              </h2>
              <button
                onClick={() => setModalSaibaMais(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-2"
                aria-label="Fechar"
              >
                <IconeFechar />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {modalSaibaMais === 'termos' && <ConteudoTermos />}
              {modalSaibaMais === 'privacidade' && <ConteudoPrivacidade />}
              {modalSaibaMais === 'sobre' && <ConteudoSobre />}
            </div>

            <div className="flex-shrink-0 border-t border-border px-5 pb-6 pt-4">
              <button
                onClick={() => setModalSaibaMais(null)}
                className="h-11 w-full rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {tutorialAberto && (
        <TutorialCarrossel plano={plano} onFechar={() => setTutorialAberto(false)} />
      )}

      {modalPrimeirosPassosAberto && (
        <ModalPrimeirosPassos
          plano={plano}
          linkFormulario={linkFormulario}
          linkAgendamento={linkAgendamento}
          copiadoFormulario={copiadoFormularioModal}
          copiadoAgendamento={copiadoAgendamentoModal}
          onCopiarFormulario={copiarLinkFormularioModal}
          onCopiarAgendamento={copiarLinkAgendamentoModal}
          onFechar={fecharModalPrimeirosPassos}
        />
      )}

      <div
        className={`chrome-shell min-h-screen bg-bg pt-16 ${
          sidebarRecolhida ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}
      >
        {children}
      </div>
    </>
  )
}

function SecaoLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {titulo}
      </h3>
      <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
    </div>
  )
}

function ConteudoTermos() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-text-muted">Última atualização: 19/06/2026</p>
      <SecaoLegal titulo="1. Aceitação dos Termos">
        Ao acessar e utilizar a plataforma Facilitaai, o usuário declara ter lido, compreendido e
        concordado com os presentes Termos de Uso. Caso não concorde com alguma condição, o uso da
        plataforma deve ser interrompido.
      </SecaoLegal>
      <SecaoLegal titulo="2. Sobre a Plataforma">
        A Facilitaai é uma plataforma de gestão e reativação de clientes destinada a profissionais
        autônomos e pequenos negócios. Permite o cadastro de clientes, registro de atendimentos,
        controle de histórico e envio de mensagens de reativação via WhatsApp.
      </SecaoLegal>
      <SecaoLegal titulo="3. Cadastro e Acesso">
        O acesso à plataforma é concedido pelo responsável da Facilitaai após contratação do
        serviço. O usuário é responsável por manter suas credenciais de acesso em sigilo e por
        todas as ações realizadas em sua conta.
      </SecaoLegal>
      <SecaoLegal titulo="4. Planos e Pagamentos">
        A contratação inclui uma taxa de implantação e uma mensalidade conforme o plano escolhido.
        O pagamento é realizado via Pix ou cartão. A mensalidade é cobrada mensalmente a partir do
        segundo mês de uso. O usuário tem 7 dias corridos após a entrega para solicitar reembolso
        integral da taxa de implantação, sem necessidade de justificativa.
      </SecaoLegal>
      <SecaoLegal titulo="5. Cancelamento">
        O usuário pode cancelar o serviço a qualquer momento mediante aviso prévio de 30 dias.
        Após o cancelamento, os dados permanecem disponíveis por 30 dias e são permanentemente
        excluídos após esse prazo.
      </SecaoLegal>
      <SecaoLegal titulo="6. Responsabilidades do Usuário">
        O usuário se compromete a: utilizar a plataforma apenas para fins legais, não compartilhar
        o acesso com terceiros não autorizados, manter os dados de suas clientes atualizados e
        corretos, obter consentimento de suas clientes para coleta e uso dos dados conforme a LGPD.
      </SecaoLegal>
      <SecaoLegal titulo="7. Responsabilidades da Facilitaai">
        A Facilitaai se compromete a: manter a plataforma disponível e funcional, proteger os
        dados dos usuários conforme a Política de Privacidade, oferecer suporte conforme o plano
        contratado, notificar o usuário sobre mudanças relevantes na plataforma.
      </SecaoLegal>
      <SecaoLegal titulo="8. Limitação de Responsabilidade">
        A Facilitaai não se responsabiliza por: resultados de negócio decorrentes do uso da
        plataforma, falhas de conexão ou indisponibilidade do WhatsApp, uso indevido das
        credenciais de acesso pelo próprio usuário.
      </SecaoLegal>
      <SecaoLegal titulo="9. Propriedade Intelectual">
        Todo o conteúdo da plataforma, incluindo código, design e funcionalidades, é de
        propriedade exclusiva da Facilitaai. É proibida a reprodução, cópia ou distribuição sem
        autorização prévia.
      </SecaoLegal>
      <SecaoLegal titulo="10. Contato">
        📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
      </SecaoLegal>
    </div>
  )
}

function ConteudoPrivacidade() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-text-muted">Última atualização: 19/06/2026</p>
      <SecaoLegal titulo="Seção I — Informações Gerais">
        Esta Política de Privacidade descreve como os dados pessoais dos usuários são coletados,
        utilizados e protegidos na plataforma Facilitaai. Esta política foi elaborada em
        conformidade com a LGPD (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº
        12.965/2014). Responsável: Davi Riquelme —{' '}
        📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
      </SecaoLegal>
      <SecaoLegal titulo="Seção II — Dados Coletados">
        Nome completo, endereço de e-mail, número de WhatsApp, data de nascimento, foto de perfil
        (opcional), dados de navegação (IP, navegador, dispositivo). Coletados no cadastro ou no
        formulário público do profissional responsável pela conta.
      </SecaoLegal>
      <SecaoLegal titulo="Seção III — Finalidade do Tratamento">
        Dados utilizados exclusivamente para: identificação e cadastro de clientes, gestão de
        histórico de atendimentos, comunicação via WhatsApp e melhoria da plataforma. Os dados não
        são vendidos, compartilhados ou repassados a terceiros.
      </SecaoLegal>
      <SecaoLegal titulo="Seção IV — Armazenamento e Segurança">
        Dados armazenados com criptografia e controle de acesso por autenticação. Apenas o
        profissional responsável pela conta tem acesso aos dados de suas clientes. Em caso de
        cancelamento, dados mantidos por 30 dias e depois permanentemente excluídos.
      </SecaoLegal>
      <SecaoLegal titulo="Seção V — Direitos do Usuário">
        Confirmar existência de tratamento, acessar dados, solicitar correção ou exclusão, revogar
        consentimento. Contato: 📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
      </SecaoLegal>
      <SecaoLegal titulo="Seção VI — Cookies">
        A plataforma utiliza cookies para manter a sessão autenticada. O usuário pode
        desativá-los no navegador, porém isso pode impedir o funcionamento do login.
      </SecaoLegal>
      <SecaoLegal titulo="Seção VII — Alterações">
        Alterações serão comunicadas pela aba Novidades dentro da plataforma.
      </SecaoLegal>
      <SecaoLegal titulo="Seção VIII — Contato">
        📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
      </SecaoLegal>
    </div>
  )
}

function ConteudoSobre() {
  return (
    <p className="text-sm leading-relaxed text-text-secondary">
      A Facilitaai é uma plataforma de gestão e reativação de clientes criada para profissionais
      autônomos e pequenos negócios. Organize suas clientes, veja quem está sumindo e reconecte
      com um clique via WhatsApp.
      <br />
      <br />
      Desenvolvido por Davi Riquelme.
      <br />
      Contato: 📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
    </p>
  )
}

function BlocoLink({
  rotulo,
  link,
  copiado,
  onCopiar,
}: {
  rotulo: string
  link: string
  copiado: boolean
  onCopiar: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-text">{rotulo}</p>
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-3">
        <span className="min-w-0 flex-1 break-all text-xs text-text-secondary">
          {link}
        </span>
        <button
          onClick={onCopiar}
          className="flex-shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed"
        >
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

function ModalPrimeirosPassos({
  plano,
  linkFormulario,
  linkAgendamento,
  copiadoFormulario,
  copiadoAgendamento,
  onCopiarFormulario,
  onCopiarAgendamento,
  onFechar,
}: {
  plano: string
  linkFormulario: string
  linkAgendamento: string
  copiadoFormulario: boolean
  copiadoAgendamento: boolean
  onCopiarFormulario: () => void
  onCopiarAgendamento: () => void
  onFechar: () => void
}) {
  const temAgendamento = plano === 'profissional' || plano === 'master'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Primeiros passos"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
    >
      <div className="animar-overlay absolute inset-0 bg-black/50" />

      <div className="animar-sheet relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
        <div className="mx-auto mb-2 mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-border-strong sm:hidden" />

        <div className="flex-shrink-0 px-5 pb-2 pt-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🚀</span>
            <h2 className="text-lg font-bold text-text">
              Primeiros passos
            </h2>
          </div>
          <p className="text-sm text-text-secondary">
            Guarde estes links — você vai precisar deles para divulgar o sistema para suas clientes.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 pt-4">
          <div className="flex flex-col gap-4">
            <BlocoLink
              rotulo="Link do Formulário de Cadastro"
              link={linkFormulario}
              copiado={copiadoFormulario}
              onCopiar={onCopiarFormulario}
            />

            {temAgendamento && (
              <BlocoLink
                rotulo="Link de Agendamento Online"
                link={linkAgendamento}
                copiado={copiadoAgendamento}
                onCopiar={onCopiarAgendamento}
              />
            )}

            <p className="text-xs text-text-muted">
              Você também encontra esses links nas Configurações a qualquer momento.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-border px-5 pb-6 pt-4">
          <button
            onClick={onFechar}
            className="h-11 w-full rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ fotoUrl, nome }: { fotoUrl: string; nome: string }) {
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={fotoUrl}
        alt={nome || 'Foto da conta'}
        className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-500 text-sm font-semibold text-white">
      {(nome || 'A').charAt(0).toUpperCase()}
    </div>
  )
}

function NotifItem({
  cor,
  texto,
  onClick,
  children,
}: {
  cor: string
  texto: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${cor}1A`, color: cor }}
      >
        {children}
      </span>
      <span className="flex-1 text-sm text-text">{texto}</span>
    </button>
  )
}

function BotaoMenu({
  icone,
  label,
  recolhida,
  onClick,
}: {
  icone: React.ReactNode
  label: string
  recolhida: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={recolhida ? label : undefined}
      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary transition hover:bg-surface-2 ${
        recolhida ? 'lg:justify-center lg:px-0' : ''
      }`}
    >
      <span className="flex-shrink-0 text-text-muted">{icone}</span>
      <span className={`chrome-label ${recolhida ? 'lg:hidden' : ''}`}>{label}</span>
    </button>
  )
}

function CardPlano({ plano, recolhida }: { plano: string; recolhida: boolean }) {
  const rotulo = ROTULO_PLANO[plano] ?? 'Basic'
  const corBadge =
    plano === 'master' ? '#14B8A6' : plano === 'profissional' ? '#2563EB' : '#64748B'

  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 ${
          recolhida ? 'lg:hidden' : ''
        }`}
      >
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: corBadge }}
        >
          <IconeCoroa />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-text-muted">Seu plano</p>
          <p className="truncate text-sm font-semibold text-text">
            {rotulo}
          </p>
        </div>
      </div>

      <div
        className={`hidden justify-center ${recolhida ? 'lg:flex' : ''}`}
        title={`Plano ${rotulo}`}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: corBadge }}
        >
          <IconeCoroa />
        </span>
      </div>
    </>
  )
}

function BadgeContagem({ contagem, cor }: { contagem: number; cor: string }) {
  if (contagem === 0) return null
  return (
    <span
      className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
      style={{ backgroundColor: cor }}
    >
      {contagem > 99 ? '99+' : contagem}
    </span>
  )
}

function MenuItem({
  href,
  label,
  ativo,
  badge,
  cor,
  recolhida,
  onNavegar,
  children,
}: {
  href: string
  label: string
  ativo: boolean
  badge?: number
  cor: string
  recolhida: boolean
  onNavegar?: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onNavegar}
      title={recolhida ? label : undefined}
      style={ativo ? { backgroundImage: 'var(--gradient-primary)', color: '#fff' } : undefined}
      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
        ativo
          ? 'font-semibold shadow-sm'
          : 'text-text-secondary hover:bg-surface-2'
      } ${recolhida ? 'lg:justify-center lg:px-0' : ''}`}
    >
      <span className="relative flex-shrink-0" style={{ color: ativo ? '#fff' : cor }}>
        {children}
        {badge ? (
          <span
            className={`absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
              recolhida ? 'lg:block' : ''
            }`}
            style={{ backgroundColor: cor }}
          />
        ) : null}
      </span>
      <span className={`chrome-label ${recolhida ? 'lg:hidden' : ''}`}>{label}</span>
      {badge ? (
        <span className={`ml-auto ${recolhida ? 'lg:hidden' : ''}`}>
          <BadgeContagem contagem={badge} cor={cor} />
        </span>
      ) : null}
    </Link>
  )
}

function formatarDataBusca(data: string): string {
  const partes = data.split('-')
  if (partes.length !== 3) return data
  return `${partes[2]}/${partes[1]}`
}

function PainelResultadosBusca({
  buscando,
  clientes,
  agendamentos,
  onIr,
}: {
  buscando: boolean
  clientes: ResultadoCliente[]
  agendamentos: ResultadoAgendamento[]
  onIr: (href: string) => void
}) {
  const vazio = clientes.length === 0 && agendamentos.length === 0

  return (
    <div className="chrome-pop absolute left-0 right-0 top-full z-40 mt-2 max-h-[24rem] overflow-y-auto rounded-2xl border border-border bg-surface shadow-xl">
      {buscando && vazio ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">
          Buscando…
        </p>
      ) : vazio ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">
          Nada encontrado
        </p>
      ) : (
        <div className="py-1">
          {clientes.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Clientes
              </p>
              {clientes.map((c) => (
                <button
                  key={`c-${c.id}`}
                  onClick={() => onIr(`/clientes?q=${encodeURIComponent(c.nome)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: '#BB5CF61A', color: '#BB5CF6' }}
                  >
                    <IconePessoa />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {c.nome}
                  </span>
                </button>
              ))}
            </>
          )}

          {agendamentos.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Agendamentos
              </p>
              {agendamentos.map((a) => (
                <button
                  key={`a-${a.id}`}
                  onClick={() => onIr('/agenda')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: '#14B8A61A', color: '#14B8A6' }}
                  >
                    <IconeAgenda />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {a.nome}
                  </span>
                  <span className="flex-shrink-0 text-xs text-text-muted">
                    {formatarDataBusca(a.data)}
                    {a.horario ? ` · ${a.horario}` : ''}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
