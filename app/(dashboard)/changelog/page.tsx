'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/formatters'

type Entrada = {
  id: string
  titulo: string
  descricao: string
  criado_em: string
}

export default function ChangelogPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('changelog')
        .select('id, titulo, descricao, criado_em')
        .order('criado_em', { ascending: false })

      if (error) {
        setErro('Não foi possível carregar. Tente novamente.')
      } else {
        setEntradas((data ?? []) as Entrada[])
      }
      setCarregando(false)
    }
    carregar()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Novidades</h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Atualizações e melhorias do sistema
        </p>
      </header>

      <main className="flex-1 px-4 pt-4">
        {carregando ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : entradas.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">⭐</span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhuma atualização ainda
            </p>
          </div>
        ) : (
          <ol className="relative flex flex-col gap-0 border-l border-zinc-200 pl-5 dark:border-zinc-800">
            {entradas.map((entrada) => (
              <li key={entrada.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[21px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pink-500 ring-4 ring-zinc-50 dark:ring-zinc-950" />
                <time className="mb-1 block text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  {formatarData(entrada.criado_em.slice(0, 10))}
                </time>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{entrada.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {entrada.descricao}
                </p>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  )
}
