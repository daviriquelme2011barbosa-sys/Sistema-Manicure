export type StatusCliente = 'verde' | 'amarelo' | 'vermelho' | 'sem_atendimento'

export type SalaoConfig = {
  id: string
  user_id: string
  nome_salao: string
  cor_primaria: string
  criado_em: string
}

export type Cliente = {
  id: string
  salao_id: string
  nome: string
  whatsapp: string
  observacoes: string | null
  autoriza_contato: boolean
  origem: 'manual' | 'formulario'
  criado_em: string
}

export type Atendimento = {
  id: string
  cliente_id: string
  salao_id: string
  servico: string
  data_atendimento: string
  horario: string | null
  preco: number | null
  criado_em: string
}

export type ClienteStatus = {
  id: string
  nome: string
  whatsapp: string
  observacoes: string | null
  ultima_visita: string | null
  dias_desde_ultima_visita: number | null
  ultimo_servico: string | null
  status: StatusCliente
  autoriza_contato: boolean | null
  data_nascimento?: string | null
}

export type Aniversariante = {
  id: string
  nome: string
  whatsapp: string
  data_nascimento: string
}

export type ClienteReativar = {
  id: string
  nome: string
  whatsapp: string
  dias_desde_ultima_visita: number
  status: 'vermelho' | 'amarelo'
}

export type ClienteFormulario = {
  id: string
  nome: string
  whatsapp: string
  autoriza_contato: boolean
}

export type AtendimentoHistorico = {
  id: string
  data_atendimento: string
  servico: string
  preco: number | null
  horario: string | null
  clientes: {
    nome: string
    whatsapp: string
  }
}

export type Toast = { mensagem: string; tipo: 'sucesso' | 'erro' } | null
