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
  const [deHoje, setDeHoje] = useState<Aniversariante[]>([])
  const [doMes, setDoMes] = useState<Aniversariante[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mesExpandido, setMesExpandido] = useState(false)

  useEffect(() => {
    async function carregar() {
      const agora = new Date()
      const mesAtual = agora.getMonth() + 1
      const diaAtual = agora.getDate()

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

        const doMesCompleto = ((data ?? []) as Aniversariante[]).filter((c) => {
          const mes = parseInt(c.data_nascimento.split('-')[1], 10)
          return mes === mesAtual
        })

        const hoje = doMesCompleto.filter(
          (c) => parseInt(c.data_nascimento.split('-')[2], 10) === diaAtual
        )

        const restantes = doMesCompleto
          .filter((c) => parseInt(c.data_nascimento.split('-')[2], 10) !== diaAtual)
          .sort(
            (a, b) =>
              parseInt(a.data_nascimento.split('-')[2], 10) -
              parseInt(b.data_nascimento.split('-')[2], 10)
          )

        setDeHoje(hoje)
        setDoMes(restantes)
      } catch {
        setErro('Não foi possível carregar. Tente novamente.')
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  const semNenhum = deHoje.length === 0 && doMes.length === 0

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Aniversariantes do mês
        </h1>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : semNenhum ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">🎉</span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhum aniversariante este mês
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Aniversariantes de hoje */}
            {deHoje.length > 0 && (
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  🎂 Hoje
                </p>
                <ul className="flex flex-col gap-3">
                  {deHoje.map((cliente) => (
                    <li
                      key={cliente.id}
                      className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 p-4 ring-1 ring-amber-200 shadow-sm dark:from-amber-950/30 dark:to-yellow-950/30 dark:ring-amber-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 text-2xl" aria-hidden="true">🎂</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                            {cliente.nome}
                          </p>
                          <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            🎉 Aniversário hoje!
                          </span>
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
              </section>
            )}

            {/* Aniversariantes do mês */}
            {doMes.length > 0 && (
              <section>
                <button
                  onClick={() => setMesExpandido((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm transition hover:bg-zinc-50 active:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
                  aria-expanded={mesExpandido}
                >
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    🎁{' '}
                    {doMes.length === 1
                      ? '1 aniversariante este mês'
                      : `${doMes.length} aniversariantes este mês`}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`flex-shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${mesExpandido ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {mesExpandido && (
                  <ul className="mt-3 flex flex-col gap-3">
                    {doMes.map((cliente) => (
                      <li
                        key={cliente.id}
                        className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 text-xl" aria-hidden="true">🎂</span>
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
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
