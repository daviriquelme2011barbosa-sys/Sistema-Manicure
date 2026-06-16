import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const tentativas = new Map<string, { count: number; resetAt: number }>()

const LIMITE = 5
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

function normalizarWhatsApp(valor: string): string {
  return valor.replace(/\D/g, '')
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function criarClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { salaoId, nome, whatsapp, dataNascimento, observacoes, autorizaContato } = body

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

  const { error: erroCliente } = await supabase.from('clientes').insert({
    nome: nome.trim(),
    whatsapp: whatsappNormalizado,
    data_nascimento: dataNascimentoValida,
    observacoes:
      typeof observacoes === 'string' && observacoes.trim()
        ? observacoes.trim()
        : null,
    autoriza_contato: true,
    origem: 'formulario',
    salao_id: salaoId,
  })

  if (erroCliente) {
    return NextResponse.json(
      { erro: 'Erro interno. Tente novamente.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ sucesso: true })
}
