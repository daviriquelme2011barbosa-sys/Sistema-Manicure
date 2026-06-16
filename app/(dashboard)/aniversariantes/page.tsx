'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarDiaMes } from '@/lib/formatters'
import { SkeletonLista } from '@/components/SkeletonLista'
import { IconeWhatsApp } from '@/components/icons'
import type { Aniversariante } from '@/types'

function montarLinkWhatsApp(cliente: Aniversariante): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 🎂 Hoje é um dia especial — feliz aniversário! Que tal comemorar com as unhas em dia? Adoraria te ver aqui no salão! 💅😊`
  return `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export default function AniversariantesPage() {
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const mesAtual = new Date().getMonth() + 1

      try {
        const { data: salaoData, error: salaoError } = await supabase
          .from('salao_config')
          .select('id')
          .maybeSingle()

        if (salaoError) throw salaoError
        const salaoId = salaoData?.id
        if (!salaoId) throw new Error('Salão não encontrado')

        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome, whatsapp, data_nascimento')
          .eq('salao_id', salaoId)
          .not('data_nascimento', 'is', null)

        if (error) throw error

        const doMes = ((data ?? []) as Aniversariante[])
          .filter((c) => parseInt(c.data_nascimento.split('-')[1], 10) === mesAtual)
          .sort(
            (a, b) =>
              parseInt(a.data_nascimento.split('-')[2], 10) -
              parseInt(b.data_nascimento.split('-')[2], 10)
          )

        setAniversariantes(doMes)
      } catch {
        setErro('Não foi possível carregar. Tente novamente.')
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  const subtitulo =
    aniversariantes.length === 1
      ? '1 aniversariante este mês'
      : `${aniversariantes.length} aniversariantes este mês`

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Aniversariantes do mês
        </h1>
        {!carregando && !erro && aniversariantes.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitulo}</p>
        )}
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : aniversariantes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">
              🎉
            </span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum aniversariante este mês
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {aniversariantes.map((cliente) => (
              <li
                key={cliente.id}
                className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 text-xl" aria-hidden="true">
                    🎂
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {cliente.nome}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatarDiaMes(cliente.data_nascimento)}
                    </p>
                  </div>
                </div>
                <a
                  href={montarLinkWhatsApp(cliente)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-500 text-sm font-semibold text-white transition hover:bg-green-600 active:bg-green-700"
                >
                  <IconeWhatsApp />
                  Mandar mensagem
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
