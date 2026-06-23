import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

function criarAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { salaoId, data, horario, servico } = body

  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Data inválida.' }, { status: 400 })
  }
  if (typeof horario !== 'string' || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ erro: 'Horário inválido.' }, { status: 400 })
  }
  if (typeof servico !== 'string' || !servico.trim()) {
    return NextResponse.json({ erro: 'Informe o serviço desejado.' }, { status: 400 })
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
    .select('id')
    .eq('email', user.email)
    .eq('salao_id', salaoId)
    .eq('status_cadastro', 'aprovado')
    .maybeSingle()

  if (erroCliente) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }

  if (!cliente) {
    return NextResponse.json({ erro: 'Cadastro não aprovado.' }, { status: 403 })
  }

  const { error: erroInsert } = await admin.from('agendamentos').insert({
    cliente_id: cliente.id,
    salao_id: salaoId,
    data,
    horario,
    servico: servico.trim(),
    status: 'pendente',
    observacoes: null,
  })

  if (erroInsert) {
    return NextResponse.json({ erro: 'Erro interno. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
