'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { textoSemAparecer, formatarDiaMes } from '@/lib/formatters'
import { SkeletonLista } from '@/components/SkeletonLista'
import { IconeVoltar, IconeWhatsApp } from '@/components/icons'
import type { ClienteReativar, Aniversariante } from '@/types'

function BadgeStatus({ status }: { status: 'vermelho' | 'amarelo' }) {
  return (
    <span
      className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${
        status === 'vermelho' ? 'bg-red-500' : 'bg-yellow-400'
      }`}
    />
  )
}

function montarLinkWhatsAppAniversario(cliente: Aniversariante): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 🎂 Hoje é um dia especial — feliz aniversário! Que tal comemorar com as unhas em dia? Adoraria te ver aqui no salão! 💅😊`
  return `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

function montarLinkWhatsApp(cliente: ClienteReativar): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 💅 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊`
  return `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export default function ReativarPage() {
  const [clientes, setClientes] = useState<ClienteReativar[]>([])
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const mesAtual = new Date().getMonth() + 1

      // Roda clientes_status e salao_config em paralelo
      const [clientesResult, salaoResult] = await Promise.all([
        supabase
          .from('clientes_status')
          .select('id, nome, whatsapp, dias_desde_ultima_visita, ultimo_servico, status')
          .or('status.eq.vermelho,status.eq.amarelo'),
        supabase
          .from('salao_config')
          .select('id')
          .maybeSingle(),
      ])

      // Query principal — falha bloqueia a tela
      try {
        if (clientesResult.error) throw clientesResult.error
        const ordenados = ((clientesResult.data ?? []) as ClienteReativar[]).sort((a, b) => {
          if (a.status !== b.status) return a.status === 'vermelho' ? -1 : 1
          return b.dias_desde_ultima_visita - a.dias_desde_ultima_visita
        })
        setClientes(ordenados)
      } catch {
        setErro('Não foi possível carregar. Tente novamente.')
      }

      // Aniversariantes — falha é não-fatal; lista de sumidas continua
      try {
        const salaoId = salaoResult.data?.id
        if (salaoId) {
          const { data, error } = await supabase
            .from('clientes')
            .select('id, nome, whatsapp, data_nascimento')
            .eq('salao_id', salaoId)
            .not('data_nascimento', 'is', null)

          if (!error && data) {
            const doMes = (data as Aniversariante[])
              .filter(c => parseInt(c.data_nascimento.split('-')[1], 10) === mesAtual)
              .sort((a, b) =>
                parseInt(a.data_nascimento.split('-')[2], 10) -
                parseInt(b.data_nascimento.split('-')[2], 10)
              )
            setAniversariantes(doMes)
          }
        }
      } catch {
        // não-fatal: seção de aniversariantes simplesmente não aparece
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  const totalSumidas = clientes.filter((c) => c.status === 'vermelho').length

  function subtitulo(): string {
    if (carregando || erro) return ''
    if (totalSumidas === 0) return 'Nenhuma sumida — só atenção'
    if (totalSumidas === 1) return '1 cliente sumida há mais de 60 dias'
    return `${totalSumidas} clientes sumidas há mais de 60 dias`
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Cabeçalho */}
      <header className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Voltar para lista de clientes"
          >
            <IconeVoltar />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Clientes para reativar</h1>
            {!carregando && !erro && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitulo()}</p>
            )}
          </div>
        </div>
      </header>

      {/* Lista */}
      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : (
          <>
            {aniversariantes.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  🎂 Aniversariantes do mês
                </h2>
                <ul className="flex flex-col gap-3">
                  {aniversariantes.map((cliente) => (
                    <li key={cliente.id} className="rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 text-xl" aria-hidden="true">🎂</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{cliente.nome}</p>
                          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatarDiaMes(cliente.data_nascimento)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={montarLinkWhatsAppAniversario(cliente)}
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

            {clientes.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-2 text-center">
                <span className="text-4xl" aria-hidden="true">🎉</span>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">Nenhuma cliente sumida no momento</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Todas as suas clientes estão em dia!</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {clientes.map((cliente) => (
                  <li key={cliente.id} className="rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm">
                    <div className="flex gap-3">
                      <BadgeStatus status={cliente.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{cliente.nome}</p>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {textoSemAparecer(cliente.dias_desde_ultima_visita)}
                          {cliente.ultimo_servico && ` · ${cliente.ultimo_servico}`}
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
          </>
        )}
      </main>
    </div>
  )
}
