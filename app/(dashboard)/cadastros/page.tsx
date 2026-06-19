'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData, formatarWhatsApp, normalizarWhatsApp } from '@/lib/formatters'

type ClienteCadastrado = {
  id: string
  nome: string
  whatsapp: string
  email: string | null
  data_nascimento: string | null
  observacoes: string | null
  autoriza_contato: boolean
}

export default function CadastrosPage() {
  const [clientes, setClientes] = useState<ClienteCadastrado[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function buscar() {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, whatsapp, email, data_nascimento, observacoes, autoriza_contato')
        .eq('origem', 'formulario')
        .order('nome')

      setClientes((data ?? []) as ClienteCadastrado[])
      setCarregando(false)
    }
    buscar()
  }, [])

  const clientesFiltrados = busca.trim()
    ? clientes.filter((c) => {
        const termo = busca.trim().toLowerCase()
        return (
          c.nome.toLowerCase().includes(termo) ||
          normalizarWhatsApp(c.whatsapp).includes(normalizarWhatsApp(termo))
        )
      })
    : clientes

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Cadastrados</h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Clientes cadastradas pelo formulário público
        </p>
      </header>

      <main className="flex-1 px-4 pt-4">
        <div className="mb-4">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp…"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        {carregando ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {busca.trim()
                ? 'Nenhuma cliente encontrada com essa busca.'
                : 'Nenhuma cliente cadastrada pelo formulário ainda.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {clientesFiltrados.map((cliente) => (
              <li
                key={cliente.id}
                className="rounded-xl border border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{cliente.nome}</p>

                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    📱 {formatarWhatsApp(cliente.whatsapp)}
                  </p>

                  {cliente.email && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      ✉️ {cliente.email}
                    </p>
                  )}

                  {cliente.data_nascimento && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      🎂 {formatarData(cliente.data_nascimento)}
                    </p>
                  )}

                  {cliente.observacoes && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      📝 {cliente.observacoes}
                    </p>
                  )}

                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {cliente.autoriza_contato
                      ? '✅ Autoriza contato via WhatsApp'
                      : '❌ Não autoriza contato via WhatsApp'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
