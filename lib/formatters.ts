// Remove tudo que não for dígito — usado antes de qualquer INSERT ou comparação
// de WhatsApp para garantir a deduplicação independente de formatação.
export function normalizarWhatsApp(valor: string): string {
  return valor.replace(/\D/g, '')
}

// Formata um número de WhatsApp (só dígitos) para exibição: (11) 91234-5678.
export function formatarWhatsApp(numero: string): string {
  const n = normalizarWhatsApp(numero)
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return numero
}

// Converte texto de preço (aceita vírgula ou ponto) em número. Vazio ou inválido → null.
export function parsearPreco(valor: string): number | null {
  const limpo = valor.trim().replace(',', '.')
  if (!limpo) return null
  const num = parseFloat(limpo)
  return isNaN(num) ? null : num
}

// Converte data ISO (yyyy-mm-dd) para o formato brasileiro dd/mm/yyyy.
export function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

// Texto relativo da última visita na lista de clientes.
export function textoUltimaVisita(dias: number): string {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `${dias} dias atrás`
}

// Texto de tempo sem aparecer no painel de reativação.
export function textoSemAparecer(dias: number): string {
  if (dias === 1) return '1 dia sem aparecer'
  return `${dias} dias sem aparecer`
}

// Formata um número como valor monetário em reais: R$ 45,00.
export function formatarPreco(preco: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)
}

// Formata data ISO (yyyy-mm-dd) para exibição de dia e mês: DD/MM.
export function formatarDiaMes(dataISO: string): string {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

// Data de hoje no formato yyyy-mm-dd (fuso local), para inputs type="date".
export function dataHoje(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}
