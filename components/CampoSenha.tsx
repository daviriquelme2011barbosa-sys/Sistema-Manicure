'use client'

import { useState } from 'react'
import { IconeOlho, IconeOlhoFechado } from '@/components/icons'

type Props = {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  erro?: boolean
  glass?: boolean
}

export function CampoSenha({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  autoComplete,
  erro,
  glass,
}: Props) {
  const [mostrar, setMostrar] = useState(false)

  if (glass) {
    return (
      <div className="login-campo-senha">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`login-input login-input-senha${erro ? ' login-input-erro' : ''}`}
        />
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          disabled={disabled}
          aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          className="login-campo-senha-toggle"
        >
          {mostrar ? <IconeOlhoFechado /> : <IconeOlho />}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        id={id}
        type={mostrar ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`form-input pr-12${erro ? ' form-input-erro' : ''}`}
      />
      <button
        type="button"
        onClick={() => setMostrar((v) => !v)}
        disabled={disabled}
        aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-200 hover:text-slate-600 disabled:pointer-events-none dark:text-slate-500 dark:hover:text-slate-300"
      >
        {mostrar ? <IconeOlhoFechado /> : <IconeOlho />}
      </button>
    </div>
  )
}
