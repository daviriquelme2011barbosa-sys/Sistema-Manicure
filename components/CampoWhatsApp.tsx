'use client'

import { useEffect, useRef, useState } from 'react'
import { PAISES, formatarNumeroLocal, paisPorDdi, PAIS_PADRAO, type Pais } from '@/lib/whatsapp'
import { IconeChevronBaixo } from '@/components/icons'

type Variante = 'publico' | 'painel'

type Props = {
  id?: string
  ddi: string
  numero: string // dígitos locais (sem DDI)
  onChange: (ddi: string, numero: string) => void
  disabled?: boolean
  erro?: boolean
  variante?: Variante
}

const ESTILOS: Record<
  Variante,
  { container: string; containerErro: string; texto: string; placeholder: string; dropdown: string; opcao: string; opcaoAtiva: string }
> = {
  publico: {
    container:
      'border-zinc-300 bg-white focus-within:ring-2 focus-within:ring-pink-400',
    containerErro: 'border-red-500 bg-white focus-within:ring-2 focus-within:ring-red-400',
    texto: 'text-zinc-900',
    placeholder: 'placeholder:text-zinc-400',
    dropdown: 'border-zinc-200 bg-white',
    opcao: 'text-zinc-700 hover:bg-zinc-50',
    opcaoAtiva: 'bg-pink-50 text-pink-700',
  },
  painel: {
    container:
      'border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-600 dark:bg-slate-800',
    containerErro:
      'border-red-500 bg-white focus-within:ring-2 focus-within:ring-red-400 dark:bg-slate-800',
    texto: 'text-slate-900 dark:text-slate-100',
    placeholder: 'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    dropdown: 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800',
    opcao: 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700',
    opcaoAtiva: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  },
}

export function CampoWhatsApp({
  id,
  ddi,
  numero,
  onChange,
  disabled,
  erro,
  variante = 'painel',
}: Props) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const estilo = ESTILOS[variante]
  const paisAtual: Pais = paisPorDdi(ddi) ?? PAIS_PADRAO

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  function selecionarPais(p: Pais) {
    setAberto(false)
    onChange(p.ddi, numero)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex h-12 items-stretch overflow-hidden rounded-lg border shadow-sm transition ${
          erro ? estilo.containerErro : estilo.container
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          onClick={() => !disabled && setAberto((v) => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-label="Selecionar código do país"
          className={`flex flex-shrink-0 items-center gap-1.5 border-r px-3 text-sm font-medium outline-none ${estilo.texto} ${
            variante === 'publico' ? 'border-zinc-300' : 'border-slate-300 dark:border-slate-600'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="text-base leading-none" aria-hidden="true">
            {paisAtual.bandeira}
          </span>
          <span>+{paisAtual.ddi}</span>
          <span
            className={`transition-transform ${aberto ? 'rotate-180' : ''} ${
              variante === 'publico' ? 'text-zinc-400' : 'text-slate-400 dark:text-slate-500'
            }`}
            aria-hidden="true"
          >
            <IconeChevronBaixo />
          </span>
        </button>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={formatarNumeroLocal(ddi, numero)}
          onChange={(e) => onChange(ddi, e.target.value.replace(/\D/g, ''))}
          disabled={disabled}
          placeholder={paisAtual.ddi === '55' ? '(38) 99999-0000' : 'Número do WhatsApp'}
          className={`h-full min-w-0 flex-1 bg-transparent px-4 text-base outline-none disabled:cursor-not-allowed ${estilo.texto} ${estilo.placeholder}`}
        />
      </div>

      {aberto && (
        <ul
          role="listbox"
          className={`absolute left-0 right-0 top-14 z-50 max-h-64 overflow-y-auto rounded-xl border shadow-xl ${estilo.dropdown}`}
        >
          {PAISES.map((p) => (
            <li key={p.codigo}>
              <button
                type="button"
                role="option"
                aria-selected={p.ddi === paisAtual.ddi}
                onClick={() => selecionarPais(p)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                  p.ddi === paisAtual.ddi ? estilo.opcaoAtiva : estilo.opcao
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {p.bandeira}
                </span>
                <span className="flex-1 truncate">{p.nome}</span>
                <span className="flex-shrink-0 text-xs opacity-60">+{p.ddi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
