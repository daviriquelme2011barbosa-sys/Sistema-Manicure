import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarRateLimiter, obterIp } from '@/lib/rate-limit'
import { normalizarWhatsApp } from '@/lib/formatters'
import { UUID_REGEX } from '@/lib/validators'

const permitir = criarRateLimiter(5)

function criarClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { salaoId, nome, whatsapp, email, dataNascimento, observacoes, autorizaContato } = body

  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof nome !== 'string' || !nome.trim()) {
    return NextResponse.json(
      { erro: 'Informe seu nome.', campo: 'nome' },
      { status: 400 },
    )
  }

  const whatsappNormalizado =
    typeof whatsapp === 'string' ? normalizarWhatsApp(whatsapp) : ''
  if (whatsappNormalizado.length < 10) {
    return NextResponse.json(
      { erro: 'WhatsApp inválido — mínimo 10 dígitos.', campo: 'whatsapp' },
      { status: 400 },
    )
  }

  if (autorizaContato !== true) {
    return NextResponse.json(
      { erro: 'O consentimento é obrigatório.', campo: 'autorizaContato' },
      { status: 400 },
    )
  }

  const supabase = criarClienteServidor()

  const { data: salao, error: erroSalao } = await supabase
    .from('salao_config')
    .select('id')
    .eq('id', salaoId)
    .maybeSingle()

  if (erroSalao || !salao) {
    return NextResponse.json({ erro: 'Salão não encontrado.' }, { status: 404 })
  }

  const { data: clienteExistente, error: erroConsulta } = await supabase
    .from('clientes')
    .select('id')
    .eq('whatsapp', whatsappNormalizado)
    .eq('salao_id', salaoId)
    .maybeSingle()

  if (erroConsulta) {
    return NextResponse.json(
      { erro: 'Erro interno. Tente novamente.' },
      { status: 500 },
    )
  }

  if (clienteExistente) {
    return NextResponse.json({ duplicado: true }, { status: 409 })
  }

  const dataNascimentoValida =
    typeof dataNascimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)
      ? dataNascimento
      : null

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json(
      { erro: 'Informe seu e-mail.', campo: 'email' },
      { status: 400 },
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json(
      { erro: 'Digite um e-mail válido.', campo: 'email' },
      { status: 400 },
    )
  }

  const { error: erroCliente } = await supabase.from('clientes').insert({
    nome: nome.trim(),
    whatsapp: whatsappNormalizado,
    email: (email as string).trim(),
    data_nascimento: dataNascimentoValida,
    observacoes:
      typeof observacoes === 'string' && observacoes.trim()
        ? observacoes.trim()
        : null,
    autoriza_contato: true,
    origem: 'formulario',
    salao_id: salaoId,
    status_cadastro: 'pendente',
  })

  if (erroCliente) {
    return NextResponse.json(
      { erro: 'Erro interno. Tente novamente.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ sucesso: true })
}
