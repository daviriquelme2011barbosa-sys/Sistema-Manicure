'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        document.cookie = 'sb-logged-in=; path=/; Max-Age=0'
        router.replace('/login?sessao=expirada')
      } else {
        setVerificando(false)
      }
    })
  }, [router])

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      {children}
      <BarraNavegacao />
    </>
  )
}

function BarraNavegacao() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex">
      <NavItem href="/clientes" label="Clientes" ativo={pathname === '/clientes'}>
        <IconeLista />
      </NavItem>
      <NavItem href="/cadastro" label="Cadastrar" ativo={pathname === '/cadastro'}>
        <IconeMais />
      </NavItem>
      <NavItem href="/reativar" label="Reativar" ativo={pathname === '/reativar'}>
        <IconeCoracao />
      </NavItem>
    </nav>
  )
}

function NavItem({
  href,
  label,
  ativo,
  children,
}: {
  href: string
  label: string
  ativo: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition ${
        ativo ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-700'
      }`}
    >
      {children}
      {label}
    </Link>
  )
}

function IconeLista() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconeMais() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconeCoracao() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
