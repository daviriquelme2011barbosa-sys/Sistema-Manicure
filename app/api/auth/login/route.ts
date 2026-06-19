import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarRateLimiter, obterIp } from '@/lib/rate-limit'

const permitir = criarRateLimiter(10)

export async function POST(request: NextRequest) {
  const ip = obterIp(request)

  if (!permitir(ip)) {
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
