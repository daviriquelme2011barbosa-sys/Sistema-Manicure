import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// In-memory store: IP -> { count, resetAt }
// Por ser MVP de instância única, memória por processo é suficiente.
const tentativas = new Map<string, { count: number; resetAt: number }>()

const LIMITE = 10
const JANELA_MS = 60_000

function verificarRateLimit(ip: string): boolean {
  const agora = Date.now()
  const entrada = tentativas.get(ip)

  if (!entrada || agora > entrada.resetAt) {
    tentativas.set(ip, { count: 1, resetAt: agora + JANELA_MS })
    return true
  }

  if (entrada.count >= LIMITE) return false

  entrada.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'

  if (!verificarRateLimit(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
      { status: 429 },
    )
  }

  let email: string
  let senha: string
  try {
    ;({ email, senha } = await request.json())
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!email || !senha) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error || !data.session) {
    return NextResponse.json(
      { erro: 'E-mail ou senha incorretos' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    sessao: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
}
