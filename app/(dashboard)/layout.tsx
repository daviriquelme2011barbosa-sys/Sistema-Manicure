'use client'

import { useState, useEffect, useRef } from 'react'
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
} from '@/components/icons'
import { normalizarWhatsApp } from '@/lib/formatters'
import { HeaderProvider, useHeader } from '@/lib/header-context'
import { TutorialCarrossel } from '@/components/TutorialCarrossel'
import QRCode from 'qrcode'

type Tema = 'claro' | 'escuro'
type ModalSaibaMais = 'termos' | 'privacidade' | 'sobre' | null

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
  const [novoWhatsapp, setNovoWhatsapp] = useState('')
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false)
  const [plano, setPlano] = useState<string>('basic')
  const [badgeAgenda, setBadgeAgenda] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [linkFormulario, setLinkFormulario] = useState('')
  const [badgeChangelog, setBadgeChangelog] = useState(0)
  const [badgeMovimentacao, setBadgeMovimentacao] = useState(0)
  const [badgeCadastrados, setBadgeCadastrados] = useState(0)
  const [fotoUrl, setFotoUrl] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#ec4899')
  const [corSelecionada, setCorSelecionada] = useState('#ec4899')
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
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputGaleriaRef = useRef<HTMLInputElement>(null)
  const inputUploadRef = useRef<HTMLInputElement>(null)
  const { toast, mostrarToast } = useToast()

  useEffect(() => {
    setMenuAberto(false)
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
        .select('id, nome_salao, foto_url, cor_primaria, genero, whatsapp, plano')
        .single()

      if (config) {
        setNomeSalao(config.nome_salao)
        setNovoNomeSalao(config.nome_salao)
        setIdSalao(config.id)
        setLinkFormulario(`${window.location.origin}/cadastro/${config.id}`)
        const fotoRaw = (config.foto_url as string | null) ?? ''
        setFotoUrl(fotoRaw ? `${fotoRaw}?t=${Date.now()}` : '')
        const corInicial = (config.cor_primaria as string | null) ?? '#ec4899'
        setCorPrimaria(corInicial)
        setCorSelecionada(corInicial)
        const generoInicial = (config.genero as 'feminino' | 'masculino' | 'nao_informar' | null) ?? 'nao_informar'
        setGenero(generoInicial)
        const whatsappInicial = (config.whatsapp as string | null) ?? ''
        setWhatsapp(whatsappInicial)
        setNovoWhatsapp(whatsappInicial)

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
    const normalizado = normalizarWhatsApp(novoWhatsapp)
    if (normalizado.length < 10 || normalizado === whatsapp || !idSalao) return
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
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

      {/* Header fixo: hamburguer+voltar | nome do salão | tema */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center border-b border-zinc-100 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="ml-2 flex flex-shrink-0 items-center gap-1">
          <button
            onClick={() => setMenuAberto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
          >
            <IconeHamburguer />
          </button>
          {acaoVoltar && (
            <button
              onClick={acaoVoltar}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label="Voltar"
            >
              <IconeVoltar />
            </button>
          )}
        </div>

        <p className="flex-1 truncate text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {nomeSalao}
        </p>

        <div className="mr-2 flex flex-shrink-0 items-center gap-1">
          <button
            onClick={alternarTema}
            aria-label="Ativar modo escuro"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
              tema === 'escuro' ? 'text-pink-500' : 'text-zinc-300 dark:text-zinc-600'
            }`}
          >
            <IconeLua />
          </button>
          <button
            onClick={alternarTema}
            aria-label="Ativar modo claro"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
              tema === 'claro' ? 'text-pink-500' : 'text-zinc-300 dark:text-zinc-600'
            }`}
          >
            <IconeSol />
          </button>
        </div>
      </header>

      {/* Menu lateral */}
      {menuAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          className="fixed inset-0 z-40 flex"
        >
          <div
            className="animar-overlay absolute inset-0 bg-black/40"
            onClick={() => setMenuAberto(false)}
          />

          <div className="animar-drawer relative flex h-screen max-h-[100dvh] w-72 max-w-[80vw] flex-col bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-4 dark:border-zinc-800">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Menu</span>
              <button
                onClick={() => setMenuAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Fechar menu"
              >
                <IconeFechar />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-scroll overscroll-contain px-3 py-3">
              <MenuItem href="/" label="Início" ativo={pathname === '/'}>
                <IconeCasa />
              </MenuItem>
              <MenuItem href="/clientes" label="Clientes" ativo={pathname === '/clientes'}>
                <IconeLista />
              </MenuItem>
              <MenuItem href="/cadastrados" label="Cadastrados" ativo={pathname === '/cadastrados'} badge={badgeCadastrados}>
                <IconePessoa />
              </MenuItem>
              {(plano === 'profissional' || plano === 'master') && (
                <MenuItem href="/agenda" label="Agenda" ativo={pathname === '/agenda'} badge={badgeAgenda}>
                  <IconeAgenda />
                </MenuItem>
              )}
              {(plano === 'profissional' || plano === 'master') && (
                <MenuItem href="/faltaram" label="Faltaram" ativo={pathname === '/faltaram'}>
                  <IconeAusente />
                </MenuItem>
              )}
              {plano !== 'profissional' && plano !== 'master' && (
                <MenuItem href="/cadastro" label="Registrar Atendimento" ativo={pathname === '/cadastro'}>
                  <IconeMais />
                </MenuItem>
              )}
              <MenuItem href="/reativar" label="Reativar" ativo={pathname === '/reativar'}>
                <IconeCoracao />
              </MenuItem>
              <MenuItem href="/aniversariantes" label="Aniversariantes" ativo={pathname === '/aniversariantes'}>
                <IconeBolo />
              </MenuItem>
              <MenuItem href="/historico" label="Histórico" ativo={pathname === '/historico'}>
                <IconeRelogio />
              </MenuItem>
              <MenuItem href="/movimentacao" label="Movimentação" ativo={pathname === '/movimentacao'} badge={badgeMovimentacao}>
                <IconeMovimentacao />
              </MenuItem>
              <MenuItem href="/changelog" label="Novidades" ativo={pathname === '/changelog'} badge={badgeChangelog}>
                <IconeEstrela />
              </MenuItem>

              <button
                onClick={() => {
                  setMenuAberto(false)
                  setTutorialAberto(true)
                }}
                className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                  <IconeLivro />
                </span>
                Tutorial
              </button>

              <hr className="my-2 border-zinc-100 dark:border-zinc-800" />

              <button
                onClick={() => {
                  setMenuAberto(false)
                  setPainelAberto(true)
                }}
                className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                  <IconeEngrenagem />
                </span>
                Configurações
              </button>

              <div>
                <button
                  onClick={() => setSubmenuSaibaMaisAberto((v) => !v)}
                  className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                    <IconeInfo />
                  </span>
                  Saiba Mais
                  <span
                    className={`ml-auto text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
                      submenuSaibaMaisAberto ? 'rotate-180' : ''
                    }`}
                  >
                    <IconeChevronBaixo />
                  </span>
                </button>

                {submenuSaibaMaisAberto && (
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-zinc-100 pl-3 dark:border-zinc-800">
                    <button
                      onClick={() => { setMenuAberto(false); setModalSaibaMais('termos') }}
                      className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                        <IconeDocumento />
                      </span>
                      Termos de Uso
                    </button>
                    <button
                      onClick={() => { setMenuAberto(false); setModalSaibaMais('privacidade') }}
                      className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                        <IconeEscudo />
                      </span>
                      Política de Privacidade
                    </button>
                    <button
                      onClick={() => { setMenuAberto(false); setModalSaibaMais('sobre') }}
                      className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                        <IconeInfo />
                      </span>
                      Sobre o Sistema
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}

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

          <div className="animar-sheet relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white px-4 pb-8 pt-5 shadow-xl dark:bg-zinc-900 sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Configurações
              </h2>
              <button
                onClick={() => !salvandoNome && !salvandoWhatsapp && setPainelAberto(false)}
                disabled={salvandoNome || salvandoWhatsapp}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Fechar"
              >
                <IconeFechar />
              </button>
            </div>

            {email && (
              <div className="mb-5 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Conta
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {email}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-5">

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="config-nome-salao"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
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
                    className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900/50"
                  />
                  <button
                    onClick={salvarNomeSalao}
                    disabled={
                      salvandoNome ||
                      !novoNomeSalao.trim() ||
                      novoNomeSalao.trim() === nomeSalao
                    }
                    className="h-11 flex-shrink-0 rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoNome ? '…' : 'Salvar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="config-whatsapp"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  WhatsApp do profissional
                </label>
                <div className="flex gap-2">
                  <input
                    id="config-whatsapp"
                    type="tel"
                    value={novoWhatsapp}
                    onChange={(e) => setNovoWhatsapp(e.target.value)}
                    disabled={salvandoWhatsapp}
                    placeholder="(11) 99999-9999"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900/50"
                  />
                  <button
                    onClick={salvarWhatsapp}
                    disabled={
                      salvandoWhatsapp ||
                      normalizarWhatsApp(novoWhatsapp).length < 10 ||
                      normalizarWhatsApp(novoWhatsapp) === whatsapp
                    }
                    className="h-11 flex-shrink-0 rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoWhatsapp ? '…' : 'Salvar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="config-genero"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Gênero do profissional
                </label>
                <select
                  id="config-genero"
                  value={genero}
                  onChange={(e) => salvarGenero(e.target.value as 'feminino' | 'masculino' | 'nao_informar')}
                  disabled={salvandoGenero}
                  className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900/50"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="nao_informar">Prefiro não informar</option>
                </select>
                {salvandoGenero && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Salvando…</p>
                )}
              </div>

              {linkFormulario && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    Link do seu formulário
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {linkFormulario}
                    </span>
                    <button
                      onClick={copiarLink}
                      className="flex-shrink-0 rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700"
                    >
                      {copiado ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                  <button
                    onClick={baixarQrCode}
                    className="self-start text-sm text-pink-500 hover:text-pink-600 hover:underline dark:text-pink-400"
                  >
                    Baixar QR Code
                  </button>
                </div>
              )}

              <hr className="border-zinc-100 dark:border-zinc-800" />

              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Personalizar formulário
                </p>

                {/* Foto */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Foto</p>
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
                        className="text-xs text-zinc-500 transition hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setOpcoesFotoAbertas((v) => !v)}
                    disabled={salvandoFoto}
                    className={`flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
                      salvandoFoto ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {salvandoFoto ? 'Enviando…' : fotoUrl ? 'Alterar foto' : 'Escolher foto'}
                  </button>

                  {opcoesFotoAbertas && !salvandoFoto && (
                    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                      {/* câmera — apenas mobile */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputCameraRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 px-4 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:hidden"
                      >
                        <span aria-hidden="true">📷</span> Tirar foto
                      </button>
                      {/* galeria — apenas mobile */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputGaleriaRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 border-t border-zinc-100 px-4 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:hidden"
                      >
                        <span aria-hidden="true">🖼️</span> Escolher da galeria
                      </button>
                      {/* upload — sempre visível */}
                      <button
                        type="button"
                        onClick={() => { setOpcoesFotoAbertas(false); inputUploadRef.current?.click() }}
                        className="flex h-11 cursor-pointer items-center gap-3 border-t border-zinc-100 px-4 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:border-t-0"
                      >
                        <span aria-hidden="true">💻</span> Fazer upload
                      </button>
                    </div>
                  )}
                </div>

                {/* Cor primária */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Cor primária
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <label className="relative block h-20 w-20 cursor-pointer">
                      <div
                        className="h-20 w-20 rounded-full shadow-lg ring-4 ring-white dark:ring-zinc-800"
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
                        className="h-5 w-5 rounded-full border border-zinc-200 dark:border-zinc-700"
                        style={{ backgroundColor: corSelecionada }}
                      />
                      <span className="font-mono text-sm text-zinc-600 dark:text-zinc-300">
                        {corSelecionada}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={salvarCor}
                    disabled={salvandoCor || corSelecionada === corPrimaria}
                    className="flex h-11 items-center justify-center rounded-lg bg-pink-500 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoCor ? 'Salvando…' : 'Salvar cor'}
                  </button>
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

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
          <div className="animar-sheet relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-900 sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-2 mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:hidden" />

            <div className="flex flex-shrink-0 items-center justify-between px-5 pb-4 pt-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {modalSaibaMais === 'termos'
                  ? 'Termos de Uso'
                  : modalSaibaMais === 'privacidade'
                  ? 'Política de Privacidade'
                  : 'Sobre o Sistema'}
              </h2>
              <button
                onClick={() => setModalSaibaMais(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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

            <div className="flex-shrink-0 border-t border-zinc-100 px-5 pb-6 pt-4 dark:border-zinc-800">
              <button
                onClick={() => setModalSaibaMais(null)}
                className="h-11 w-full rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {tutorialAberto && (
        <TutorialCarrossel onFechar={() => setTutorialAberto(false)} />
      )}

      <div className="pt-14">{children}</div>
    </>
  )
}

function SecaoLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {titulo}
      </h3>
      <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</div>
    </div>
  )
}

function ConteudoTermos() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-zinc-400 dark:text-zinc-500">Última atualização: 19/06/2026</p>
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
      <p className="text-xs text-zinc-400 dark:text-zinc-500">Última atualização: 19/06/2026</p>
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
    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
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

function BadgeContagem({ contagem }: { contagem: number }) {
  if (contagem === 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
      {contagem > 99 ? '99+' : contagem}
    </span>
  )
}

function MenuItem({
  href,
  label,
  ativo,
  badge,
  children,
}: {
  href: string
  label: string
  ativo: boolean
  badge?: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
        ativo
          ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400'
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      <span
        className={`flex-shrink-0 ${
          ativo ? 'text-pink-500' : 'text-zinc-400 dark:text-zinc-500'
        }`}
      >
        {children}
      </span>
      {label}
      {badge ? <BadgeContagem contagem={badge} /> : null}
    </Link>
  )
}
