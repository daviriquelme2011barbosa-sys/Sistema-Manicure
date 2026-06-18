import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // 1. Re-validar token server-side (previne race condition)
  const { data: convite, error: erroConvite } = await admin
    .from('convites')
    .select('id, usado')
    .eq('token', token)
    .maybeSingle()

  if (erroConvite || !convite) {
    return NextResponse.json({ erro: 'Link inválido ou já utilizado.' }, { status: 400 })
  }

  if (convite.usado) {
    return NextResponse.json({ erro: 'Este link já foi utilizado.' }, { status: 400 })
  }

  // 2. Criar usuário via anon client para obter sessão utilizável no client
  const anon = criarClienteAnon()
  const { data: authData, error: erroAuth } = await anon.auth.signUp({
    email: email.trim(),
    password: senha,
  })

  if (erroAuth || !authData.user) {
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

  if (!authData.session) {
    return NextResponse.json(
      { erro: 'Conta criada! Verifique seu e-mail para ativar o acesso.' },
      { status: 202 },
    )
  }

  // 3. Inserir salao_config usando admin (bypassa RLS)
  const { error: erroConfig } = await admin.from('salao_config').insert({
    user_id: authData.user.id,
    nome_salao: nomeSalao.trim(),
    cor_primaria: '#ec4899',
  })

  if (erroConfig) {
    console.error('[onboarding] erro ao inserir salao_config:', erroConfig.message)
    return NextResponse.json(
      { erro: 'Erro ao configurar o salão. Contate o suporte.' },
      { status: 500 },
    )
  }

  // 4. Marcar convite como usado
  await admin.from('convites').update({ usado: true }).eq('token', token)

  return NextResponse.json({
    sessao: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  })
}
