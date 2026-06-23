import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

type ChaveDia = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

const MAPA_JS_CHAVE: Record<number, ChaveDia> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
}

function criarAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function toHorario(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function gerarSlots(
  inicio: string,
  fim: string,
  duracao: number,
  intervalo: number,
  pausaInicio: string | null,
  pausaFim: string | null,
  agendados: string[],
): string[] {
  const inicioMin = toMin(inicio)
  const fimMin = toMin(fim)
  const pausaInicioMin = pausaInicio ? toMin(pausaInicio) : null
  const pausaFimMin = pausaFim ? toMin(pausaFim) : null
  const agendadosSet = new Set(agendados)

  const slots: string[] = []
  let atual = inicioMin

  while (atual + duracao <= fimMin) {
    const slotFim = atual + duracao
    const overlapsaPausa =
      pausaInicioMin !== null &&
      pausaFimMin !== null &&
      atual < pausaFimMin &&
      slotFim > pausaInicioMin

    if (!overlapsaPausa) {
      const horario = toHorario(atual)
      if (!agendadosSet.has(horario)) {
        slots.push(horario)
      }
    }

    atual += duracao + intervalo
  }

  return slots
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salaoId = searchParams.get('salaoId')
  const data = searchParams.get('data')

  if (!salaoId || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Data inválida.' }, { status: 400 })
  }

  const [ano, mes, dia] = data.split('-').map(Number)
  const dayOfWeek = new Date(ano, mes - 1, dia).getDay()
  const chave = MAPA_JS_CHAVE[dayOfWeek]

  const admin = criarAdmin()

  const [{ data: horarios, error: erroH }, { data: agendamentos, error: erroA }] =
    await Promise.all([
      admin.from('horarios_disponiveis').select('*').eq('salao_id', salaoId).maybeSingle(),
      admin
        .from('agendamentos')
        .select('horario')
        .eq('salao_id', salaoId)
        .eq('data', data)
        .in('status', ['pendente', 'confirmado', 'compareceu']),
    ])

  if (erroH || erroA) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }

  if (!horarios) {
    return NextResponse.json({ horarios: [] })
  }

  const diaConfig = (horarios as Record<string, unknown>)[chave] as Record<string, unknown> | null
  if (!diaConfig || !diaConfig.ativo) {
    return NextResponse.json({ horarios: [] })
  }

  const inicio = typeof diaConfig.inicio === 'string' ? diaConfig.inicio : '09:00'
  const fim = typeof diaConfig.fim === 'string' ? diaConfig.fim : '18:00'
  const pausaInicio = typeof diaConfig.pausa_inicio === 'string' ? diaConfig.pausa_inicio : null
  const pausaFim = typeof diaConfig.pausa_fim === 'string' ? diaConfig.pausa_fim : null
  const duracao = (horarios.duracao_atendimento as number | null) ?? 60
  const intervalo = (horarios.intervalo_entre as number | null) ?? 0

  const agendadosHorarios = (agendamentos ?? [])
    .map((a) => a.horario as string | null)
    .filter((h): h is string => typeof h === 'string')

  const slots = gerarSlots(inicio, fim, duracao, intervalo, pausaInicio, pausaFim, agendadosHorarios)

  return NextResponse.json({ horarios: slots })
}
