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
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novidades</h1>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Atualizações e melhorias do sistema
        </p>
      </header>

      <main className="flex-1 px-4 pt-4">
        {carregando ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
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
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Nenhuma atualização ainda
            </p>
          </div>
        ) : (
          <ol className="animar-lista relative flex flex-col gap-0 border-l border-slate-200 pl-5 dark:border-slate-700">
            {entradas.map((entrada) => (
              <li key={entrada.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[21px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-4 ring-slate-100 dark:ring-slate-900" />
                <time className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-500">
                  {formatarData(entrada.criado_em.slice(0, 10))}
                </time>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{entrada.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
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
