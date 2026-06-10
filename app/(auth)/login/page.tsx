'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [erroCredenciais, setErroCredenciais] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sessao') === 'expirada') setSessaoExpirada(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/clientes')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setErroEmail('')
    setErroSenha('')
    setErroCredenciais('')

    let valido = true
    if (!email.trim()) {
      setErroEmail('Preencha o e-mail')
      valido = false
    }
    if (!senha) {
      setErroSenha('Preencha a senha')
      valido = false
    }
    if (!valido) return

    setEnviando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErroCredenciais('E-mail ou senha incorretos')
      setEnviando(false)
      return
    }

    document.cookie = 'sb-logged-in=1; path=/; SameSite=Lax; Max-Age=604800'
    router.push('/clientes')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Entrar no sistema</h1>
        <p className="mt-1 text-sm text-zinc-500">Acesso exclusivo para a dona do salão</p>
      </div>

      {sessaoExpirada && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
          Sua sessão expirou, faça login novamente.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
            disabled={enviando}
            placeholder="seu@email.com"
            className={`h-12 rounded-lg border px-4 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
              erroEmail ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
            }`}
          />
          {erroEmail && (
            <span role="alert" className="text-sm text-red-600">
              {erroEmail}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={enviando}
            placeholder="••••••••"
            className={`h-12 rounded-lg border px-4 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
              erroSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
            }`}
          />
          {erroSenha && (
            <span role="alert" className="text-sm text-red-600">
              {erroSenha}
            </span>
          )}
        </div>

        {erroCredenciais && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {erroCredenciais}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 h-12 rounded-lg bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
