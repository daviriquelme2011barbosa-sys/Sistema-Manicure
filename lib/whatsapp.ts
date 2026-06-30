// Utilitários de WhatsApp: países, validação, normalização e montagem de links wa.me.
// Ver CLAUDE.md seção 2 (WhatsApp normalizado) e seção 7 (link wa.me).

export type Pais = {
  codigo: string // ISO 3166-1 alpha-2, ex: 'BR'
  nome: string
  ddi: string // código do país só com dígitos, ex: '55'
  bandeira: string // emoji da bandeira
}

// Brasil sempre em primeiro — é o padrão do produto.
export const PAISES: Pais[] = [
  { codigo: 'BR', nome: 'Brasil', ddi: '55', bandeira: '🇧🇷' },
  { codigo: 'PT', nome: 'Portugal', ddi: '351', bandeira: '🇵🇹' },
  { codigo: 'US', nome: 'Estados Unidos', ddi: '1', bandeira: '🇺🇸' },
  { codigo: 'AR', nome: 'Argentina', ddi: '54', bandeira: '🇦🇷' },
  { codigo: 'UY', nome: 'Uruguai', ddi: '598', bandeira: '🇺🇾' },
  { codigo: 'PY', nome: 'Paraguai', ddi: '595', bandeira: '🇵🇾' },
  { codigo: 'CL', nome: 'Chile', ddi: '56', bandeira: '🇨🇱' },
  { codigo: 'ES', nome: 'Espanha', ddi: '34', bandeira: '🇪🇸' },
  { codigo: 'IT', nome: 'Itália', ddi: '39', bandeira: '🇮🇹' },
  { codigo: 'FR', nome: 'França', ddi: '33', bandeira: '🇫🇷' },
  { codigo: 'GB', nome: 'Reino Unido', ddi: '44', bandeira: '🇬🇧' },
]

export const DDI_BRASIL = '55'
export const PAIS_PADRAO = PAISES[0]

export function paisPorDdi(ddi: string): Pais | undefined {
  const limpo = ddi.replace(/\D/g, '')
  return PAISES.find((p) => p.ddi === limpo)
}

// Remove tudo que não for dígito.
function apenasDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '')
}

export type ResultadoValidacao = { valido: boolean; erro?: string }

// Valida o número LOCAL (sem DDI) conforme as regras do país selecionado.
// Brasil (+55): obrigatório DDD (2 dígitos) + 9 dígitos de celular = 11 dígitos.
// Outros países: validação flexível — apenas um mínimo razoável de dígitos.
export function validarNumeroWhatsApp(ddi: string, numeroLocal: string): ResultadoValidacao {
  const digitos = apenasDigitos(numeroLocal)

  if (!digitos) {
    return { valido: false, erro: 'Informe seu WhatsApp' }
  }

  if (apenasDigitos(ddi) === DDI_BRASIL) {
    const dddValido = digitos.length === 11 && digitos[0] !== '0' && digitos[2] === '9'
    if (!dddValido) {
      return {
        valido: false,
        erro: 'Número inválido — confira o DDD e os 9 dígitos do WhatsApp',
      }
    }
    return { valido: true }
  }

  // Demais países: mínimo razoável para evitar números claramente incompletos.
  if (digitos.length < 6) {
    return { valido: false, erro: 'Número inválido — confira o número do WhatsApp' }
  }
  return { valido: true }
}

// Junta DDI + número local, apenas dígitos. Ex: ('55', '(12) 99876-5432') → '5512998765432'.
export function normalizarWhatsAppCompleto(ddi: string, numeroLocal: string): string {
  return `${apenasDigitos(ddi)}${apenasDigitos(numeroLocal)}`
}

// Máscara de digitação do número LOCAL (sem DDI). Só formata para o Brasil; demais
// países exibem apenas os dígitos (limitados a um tamanho razoável).
export function formatarNumeroLocal(ddi: string, numeroLocal: string): string {
  const d = apenasDigitos(numeroLocal)

  if (apenasDigitos(ddi) !== DDI_BRASIL) {
    return d.slice(0, 15)
  }

  const dd = d.slice(0, 11)
  if (dd.length <= 2) return dd.length ? `(${dd}` : ''
  if (dd.length <= 7) return `(${dd.slice(0, 2)}) ${dd.slice(2)}`
  return `(${dd.slice(0, 2)}) ${dd.slice(2, 7)}-${dd.slice(7)}`
}

// Separa um número salvo em DDI + número local, para reidratar formulários de edição.
// Trata dados legados (sem DDI, Brasil) e casa DDIs conhecidos por prefixo.
export function separarDdiNumero(whatsapp: string): { ddi: string; numero: string } {
  const d = apenasDigitos(whatsapp)
  if (!d) return { ddi: DDI_BRASIL, numero: '' }

  // Legado brasileiro salvo sem DDI (10–11 dígitos).
  if (d.length <= 11) return { ddi: DDI_BRASIL, numero: d }

  const ddisConhecidos = [...new Set(PAISES.map((p) => p.ddi))].sort(
    (a, b) => b.length - a.length,
  )
  for (const ddi of ddisConhecidos) {
    if (d.startsWith(ddi)) return { ddi, numero: d.slice(ddi.length) }
  }

  return { ddi: DDI_BRASIL, numero: d.startsWith(DDI_BRASIL) ? d.slice(2) : d }
}

// Monta o número internacional (com DDI) a partir do valor salvo no banco.
// Compatível com dados legados: registros antigos foram salvos SEM DDI (10–11 dígitos,
// Brasil) — nesse caso prefixamos 55. Registros novos já incluem o DDI (12+ dígitos).
export function montarNumeroInternacional(whatsapp: string): string {
  const d = apenasDigitos(whatsapp)
  if (!d) return ''
  return d.length <= 11 ? `${DDI_BRASIL}${d}` : d
}

// Monta o link wa.me com a mensagem codificada.
// Ver CLAUDE.md seção 7 — encodeURIComponent é obrigatório para nomes com acento/ç.
export function linkWhatsApp(whatsapp: string, mensagem: string): string {
  return `https://wa.me/${montarNumeroInternacional(whatsapp)}?text=${encodeURIComponent(mensagem)}`
}
