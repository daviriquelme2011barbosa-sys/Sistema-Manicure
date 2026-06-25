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
    console.error('[cancelar] token ausente')
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    console.error('[cancelar] body inválido')
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { agendamentoId, salaoId } = body
  console.log('[cancelar] recebido — agendamentoId:', agendamentoId, 'salaoId:', salaoId)

  if (typeof agendamentoId !== 'string' || !UUID_REGEX.test(agendamentoId)) {
    console.error('[cancelar] agendamentoId inválido:', agendamentoId)
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    console.error('[cancelar] salaoId inválido:', salaoId)
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = criarAdmin()

  const {
    data: { user },
    error: erroUser,
  } = await admin.auth.getUser(token)

  if (erroUser || !user?.email) {
    console.error('[cancelar] getUser falhou:', erroUser)
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }
  console.log('[cancelar] usuário autenticado:', user.email)

  const { data: cliente, error: erroCliente } = await admin
    .from('clientes')
    .select('id, nome')
    .eq('email', user.email)
    .eq('salao_id', salaoId)
    .maybeSingle()

  if (erroCliente) {
    console.error('[cancelar] erro ao buscar cliente:', erroCliente)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
  if (!cliente) {
    console.error('[cancelar] cliente não encontrado para email:', user.email, 'salaoId:', salaoId)
    return NextResponse.json({ erro: 'Cliente não encontrado.' }, { status: 404 })
  }
  console.log('[cancelar] cliente encontrado:', cliente.id, cliente.nome)

  const { data: ag, error: erroAg } = await admin
    .from('agendamentos')
    .select('id, data, horario, status')
    .eq('id', agendamentoId)
    .eq('cliente_id', cliente.id)
    .eq('salao_id', salaoId)
    .in('status', ['pendente', 'confirmado'])
    .maybeSingle()

  if (erroAg) {
    console.error('[cancelar] erro ao buscar agendamento:', erroAg)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
  if (!ag) {
    console.error('[cancelar] agendamento não encontrado ou não cancelável — id:', agendamentoId, 'cliente_id:', cliente.id)
    return NextResponse.json(
      { erro: 'Agendamento não encontrado ou não pode ser cancelado.' },
      { status: 404 },
    )
  }
  console.log('[cancelar] agendamento encontrado:', ag.id, ag.data, ag.horario, 'status:', ag.status)

  const { error: erroCancelar } = await admin
    .from('agendamentos')
    .update({
      status: 'cancelado',
      cancelado_em: new Date().toISOString(),
    })
    .eq('id', agendamentoId)

  if (erroCancelar) {
    console.error('[cancelar] erro no UPDATE (com cancelado_em):', JSON.stringify(erroCancelar))

    // Fallback: tenta sem cancelado_em (caso coluna ainda não exista ou constraint bloqueie)
    const { error: erroFallback } = await admin
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', agendamentoId)

    if (erroFallback) {
      console.error('[cancelar] erro no UPDATE fallback (só status):', JSON.stringify(erroFallback))
      return NextResponse.json({ erro: 'Erro ao cancelar. Tente novamente.' }, { status: 500 })
    }

    console.log('[cancelar] fallback bem-sucedido (sem cancelado_em)')
  } else {
    console.log('[cancelar] UPDATE bem-sucedido')
  }

  return NextResponse.json({ sucesso: true })
}
