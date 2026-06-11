'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ClienteReativar = {
  id: string
  nome: string
  whatsapp: string
  dias_desde_ultima_visita: number
  ultimo_servico: string | null
  status: 'vermelho' | 'amarelo'
}

function BadgeStatus({ status }: { status: 'vermelho' | 'amarelo' }) {
  return (
    <span
      className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${
        status === 'vermelho' ? 'bg-red-500' : 'bg-yellow-400'
      }`}
    />
  )
}

function textoElapsado(dias: number): string {
  if (dias === 1) return '1 dia sem aparecer'
  return `${dias} dias sem aparecer`
}

function SkeletonLista() {
  return (
    <ul className="flex flex-col gap-3" aria-label="Carregando…">
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="animate-pulse rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-700/60" />
            </div>
          </div>
          <div className="mt-3 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-700/60" />
        </li>
      ))}
    </ul>
  )
}

function montarLinkWhatsApp(cliente: ClienteReativar): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 💅 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊`
  return `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export default function ReativarPage() {
  const [clientes, setClientes] = useState<ClienteReativar[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('clientes_status')
        .select('id, nome, whatsapp, dias_desde_ultima_visita, ultimo_servico, status')
        .in('status', ['vermelho', 'amarelo'])

      if (error) {
        setErro('Não foi possível carregar. Tente novamente.')
      } else {
        const ordenados = ((data ?? []) as ClienteReativar[]).sort((a, b) => {
          if (a.status !== b.status) return a.status === 'vermelho' ? -1 : 1
          return b.dias_desde_ultima_visita - a.dias_desde_ultima_visita
        })
        setClientes(ordenados)
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
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
          <SkeletonLista />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : clientes.length === 0 ? (
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
                      {textoElapsado(cliente.dias_desde_ultima_visita)}
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
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
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
