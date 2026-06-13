'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatarWhatsApp, normalizarWhatsApp } from '@/lib/formatters'
import { IconeChevronDireita } from '@/components/icons'
import type { ClienteFormulario } from '@/types'

export default function CadastrosPage() {
  const [clientes, setClientes] = useState<ClienteFormulario[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function buscar() {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, whatsapp, autoriza_contato')
        .eq('origem', 'formulario')
        .order('nome')

      setClientes((data ?? []) as ClienteFormulario[])
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
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Cadastros</h1>
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
                className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
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
              <li key={cliente.id}>
                <Link
                  href={`/cadastro?clienteId=${cliente.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-white px-4 py-4 transition hover:border-pink-200 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-pink-900 dark:active:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {cliente.nome}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                      {formatarWhatsApp(cliente.whatsapp)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      aria-label={
                        cliente.autoriza_contato ? 'Autoriza contato' : 'Não autoriza contato'
                      }
                    >
                      {cliente.autoriza_contato ? '✅' : '❌'}
                    </span>
                    <IconeChevronDireita className="text-zinc-300 dark:text-zinc-600" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
