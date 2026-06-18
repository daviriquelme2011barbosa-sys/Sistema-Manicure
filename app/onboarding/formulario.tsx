'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)

type Estado = 'verificando' | 'invalido' | 'formulario' | 'salvando'
type ModalAberto = 'termos' | 'privacidade' | null

interface Props {
  token: string
}

export default function FormularioOnboarding({ token }: Props) {
  const router = useRouter()

  const [estado, setEstado] = useState<Estado>('verificando')
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null)

  const [nomeSalao, setNomeSalao] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [termosAceitos, setTermosAceitos] = useState(false)

  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('invalido')
      return
    }

    supabase
      .from('convites')
      .select('id, usado')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data || data.usado) {
          setEstado('invalido')
        } else {
          setEstado('formulario')
        }
      })
  }, [token])

  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!nomeSalao.trim()) e.nomeSalao = 'Informe seu nome'
    if (!email.trim()) e.email = 'Informe o e-mail'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'E-mail inválido'
    if (!senha) e.senha = 'Crie uma senha'
    else if (senha.length < 6) e.senha = 'A senha deve ter pelo menos 6 caracteres'
    if (senha !== confirmarSenha) e.confirmarSenha = 'As senhas não coincidem'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral('')

    const novosErros = validar()
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return
    if (!termosAceitos) return

    setEstado('salvando')

    try {
      const resposta = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nomeSalao, email, senha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? 'Erro ao criar conta. Tente novamente.')
        setEstado('formulario')
        return
      }

      await supabase.auth.setSession(dados.sessao)
      document.cookie = 'sb-logged-in=1; path=/; SameSite=Lax; Max-Age=604800'
      router.replace('/')
    } catch {
      setErroGeral('Sem conexão. Verifique a internet e tente novamente.')
      setEstado('formulario')
    }
  }

  // ── verificando ───────────────────────────────────────────────────
  if (estado === 'verificando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500">Verificando seu convite…</p>
        </div>
      </div>
    )
  }

  // ── inválido ──────────────────────────────────────────────────────
  if (estado === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">❌</p>
            <h1 className="mt-3 text-xl font-bold text-zinc-900">Link inválido</h1>
          </div>
          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg text-center">
            <p className="text-sm leading-relaxed text-zinc-600">
              Este link é inválido ou já foi utilizado.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Solicite um novo convite à administração do sistema.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── formulário + salvando ─────────────────────────────────────────
  const salvando = estado === 'salvando'

  return (
    <>
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalAberto(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white px-6 py-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">
                {modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Em breve — os termos completos estarão disponíveis aqui.
            </p>
            <button
              type="button"
              onClick={() => setModalAberto(null)}
              className="mt-6 h-11 w-full rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">💅</p>
            <h1 className="mt-3 text-xl font-bold text-zinc-900">Criar sua conta</h1>
            <p className="mt-1 text-sm text-zinc-500">Preencha os dados para acessar o sistema</p>
          </div>

          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              <div className="flex flex-col gap-1">
                <label htmlFor="nomeSalao" className="text-sm font-medium text-zinc-700">
                  Nome do profissional
                </label>
                <input
                  id="nomeSalao"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  disabled={salvando}
                  placeholder="Seu nome"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.nomeSalao ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.nomeSalao && (
                  <span role="alert" className="text-sm text-red-600">{erros.nomeSalao}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                  placeholder="seu@email.com"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.email ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.email && (
                  <span role="alert" className="text-sm text-red-600">{erros.email}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={salvando}
                    placeholder="Mínimo 6 caracteres"
                    className={`h-12 w-full rounded-xl border px-4 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                      erros.senha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    disabled={salvando}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 disabled:pointer-events-none"
                  >
                    {mostrarSenha ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {erros.senha && (
                  <span role="alert" className="text-sm text-red-600">{erros.senha}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="confirmarSenha" className="text-sm font-medium text-zinc-700">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    id="confirmarSenha"
                    type={mostrarConfirmarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    disabled={salvando}
                    placeholder="Repita a senha"
                    className={`h-12 w-full rounded-xl border px-4 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                      erros.confirmarSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha((v) => !v)}
                    disabled={salvando}
                    aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 disabled:pointer-events-none"
                  >
                    {mostrarConfirmarSenha ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {erros.confirmarSenha && (
                  <span role="alert" className="text-sm text-red-600">{erros.confirmarSenha}</span>
                )}
              </div>

              {erroGeral && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroGeral}
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={termosAceitos}
                  onChange={(e) => setTermosAceitos(e.target.checked)}
                  disabled={salvando}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-pink-500"
                />
                <span className="text-sm text-zinc-600 leading-relaxed">
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('termos')}
                    className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700"
                  >
                    Termos de Uso
                  </button>
                  {' '}e a{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('privacidade')}
                    className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700"
                  >
                    Política de Privacidade
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={salvando || !termosAceitos}
                className="mt-1 h-12 rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Criando conta…' : 'Criar minha conta'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </>
  )
}
