// Monta o link wa.me com DDI 55 (Brasil) e mensagem codificada.
// Ver CLAUDE.md seção 7 — encodeURIComponent é obrigatório para nomes com acento/ç.
export function linkWhatsApp(whatsapp: string, mensagem: string): string {
  return `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`
}
