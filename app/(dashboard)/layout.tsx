'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/icons'

type Tema = 'claro' | 'escuro'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
  const { toast, mostrarToast } = useToast()

  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

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
        .select('id, nome_salao')
        .single()

      if (config) {
        setNomeSalao(config.nome_salao)
        setNovoNomeSalao(config.nome_salao)
        setIdSalao(config.id)
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
      <ToastView toast={toast} />

      {/* Header fixo: hamburguer | nome do salão | spacer */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center border-b border-zinc-100 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <button
          onClick={() => setMenuAberto(true)}
          className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
        >
          <IconeHamburguer />
        </button>

        <p className="flex-1 truncate text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {nomeSalao}
        </p>

        <div className="mr-2 h-9 w-9 flex-shrink-0" aria-hidden="true" />
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAberto(false)}
          />

          <div className="relative flex w-72 max-w-[80vw] flex-col bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 dark:border-zinc-800">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Menu</span>
              <button
                onClick={() => setMenuAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Fechar menu"
              >
                <IconeFechar />
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-3 py-3">
              <MenuItem href="/clientes" label="Clientes" ativo={pathname === '/clientes'}>
                <IconeLista />
              </MenuItem>
              <MenuItem href="/cadastros" label="Cadastros" ativo={pathname === '/cadastros'}>
                <IconePessoa />
              </MenuItem>
              <MenuItem href="/cadastro" label="Cadastrar" ativo={pathname === '/cadastro'}>
                <IconeMais />
              </MenuItem>
              <MenuItem href="/reativar" label="Reativar" ativo={pathname === '/reativar'}>
                <IconeCoracao />
              </MenuItem>
              <MenuItem href="/historico" label="Histórico" ativo={pathname === '/historico'}>
                <IconeRelogio />
              </MenuItem>

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
            className="absolute inset-0 bg-black/40"
            onClick={() => !salvandoNome && setPainelAberto(false)}
          />

          <div className="relative w-full rounded-t-2xl bg-white px-4 pb-8 pt-5 shadow-xl dark:bg-zinc-900 sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Configurações
              </h2>
              <button
                onClick={() => !salvandoNome && setPainelAberto(false)}
                disabled={salvandoNome}
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Tema</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {tema === 'claro' ? 'Modo claro ativo' : 'Modo escuro ativo'}
                  </p>
                </div>
                <button
                  onClick={alternarTema}
                  role="switch"
                  aria-checked={tema === 'escuro'}
                  aria-label={`Mudar para modo ${tema === 'claro' ? 'escuro' : 'claro'}`}
                  className={`relative flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
                    tema === 'escuro' ? 'bg-pink-500' : 'bg-zinc-200'
                  }`}
                >
                  <span
                    className={`absolute flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                      tema === 'escuro' ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  >
                    {tema === 'claro' ? <IconeSol /> : <IconeLua />}
                  </span>
                </button>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="config-nome-salao"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Nome do salão
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

      <div className="pt-14">{children}</div>
    </>
  )
}

function MenuItem({
  href,
  label,
  ativo,
  children,
}: {
  href: string
  label: string
  ativo: boolean
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
    </Link>
  )
}
