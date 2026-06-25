import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

function criarAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const salaoId = searchParams.get('salaoId')

  if (!salaoId || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = criarAdmin()

  const {
    data: { user },
    error: erroUser,
  } = await admin.auth.getUser(token)

  if (erroUser || !user?.email) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  const { data: cliente, error: erroCliente } = await admin
    .from('clientes')
    .select('id, nome, email')
    .eq('email', user.email)
    .eq('salao_id', salaoId)
    .maybeSingle()

  if (erroCliente || !cliente) {
    return NextResponse.json({ erro: 'Cliente não encontrado.' }, { status: 404 })
  }

  const { data: agendamentos, error: erroAg } = await admin
    .from('agendamentos')
    .select('id, data, horario, servico, status')
    .eq('cliente_id', cliente.id)
    .eq('salao_id', salaoId)
    .order('data', { ascending: false })
    .order('horario', { ascending: false, nullsFirst: false })

  if (erroAg) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }

  return NextResponse.json({
    agendamentos: agendamentos ?? [],
    clienteNome: cliente.nome,
    clienteEmail: (cliente.email as string | null) ?? user.email,
  })
}
