// Quita etiquetas antes de persistir texto libre para que contenido aportado no inserte HTML.
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}
