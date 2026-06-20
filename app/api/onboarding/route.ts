import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarRateLimiter, obterIp } from '@/lib/rate-limit'

const permitir = criarRateLimiter(5)

function criarClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function criarClienteAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(request: NextRequest) {
  const ip = obterIp(request)
  if (!permitir(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
      { status: 429 },
    )
  }

  let token: string, nomeSalao: string, email: string, senha: string
  try {
    ;({ token, nomeSalao, email, senha } = await request.json())
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!token || !nomeSalao?.trim() || !email?.trim() || !senha) {
    return NextResponse.json({ erro: 'Preencha todos os campos.' }, { status: 400 })
  }

  const admin = criarClienteAdmin()

  // 1. Atomically claim the token — single UPDATE prevents race condition (TOCTOU).
  //    If two requests arrive simultaneously, only one gets the row back.
  const { data: conviteReivindicado, error: erroConvite } = await admin
    .from('convites')
    .update({ usado: true })
    .eq('token', token)
    .eq('usado', false)
    .select('id')
    .maybeSingle()

  if (erroConvite || !conviteReivindicado) {
    return NextResponse.json({ erro: 'Link inválido ou já utilizado.' }, { status: 400 })
  }

  const conviteId = conviteReivindicado.id

  // 2. Create user via anon client so a usable session comes back to the browser.
  const anon = criarClienteAnon()
  const { data: authData, error: erroAuth } = await anon.auth.signUp({
    email: email.trim(),
    password: senha,
  })

  if (erroAuth || !authData.user) {
    // Rollback: release token so the user can retry with the same link.
    await admin.from('convites').update({ usado: false }).eq('id', conviteId)
    const jaExiste = erroAuth?.message?.toLowerCase().includes('already registered')
    return NextResponse.json(
      {
        erro: jaExiste
          ? 'Este e-mail já possui uma conta.'
          : 'Não foi possível criar a conta. Tente novamente.',
      },
      { status: 400 },
    )
  }

  // 3. Insert salao_config using admin client (bypasses RLS).
  const { error: erroConfig } = await admin.from('salao_config').insert({
    user_id: authData.user.id,
    nome_salao: nomeSalao.trim(),
    cor_primaria: '#ec4899',
  })

  if (erroConfig) {
    // Rollback: delete orphan user + release token.
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('convites').update({ usado: false }).eq('id', conviteId)
    return NextResponse.json(
      { erro: 'Erro ao configurar o salão. Contate o suporte.' },
      { status: 500 },
    )
  }

  // 4. Return session — if null, email confirmation is enabled in Supabase.
  if (!authData.session) {
    return NextResponse.json(
      { erro: 'Conta criada! Verifique seu e-mail para ativar o acesso.' },
      { status: 202 },
    )
  }

  return NextResponse.json({
    sessao: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  })
}
