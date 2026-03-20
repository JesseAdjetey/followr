/**
 * Template variable substitution.
 */

export interface TemplateVariables {
  name?: string        // recipient first name
  subject?: string     // original email subject
  invoice?: string     // invoice number if detected
  sender?: string      // user's own name
}

export function substituteTemplateVars(
  body: string,
  vars: TemplateVariables
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return (vars as Record<string, string>)[key] ?? match
  })
}

/**
 * Extract {{variable}} names from a template body.
 */
export function extractVariables(body: string): string[] {
  const found: string[] = []
  const regex = /\{\{(\w+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(body)) !== null) {
    if (!found.includes(m[1])) found.push(m[1])
  }
  return found
}

/**
 * Try to extract an invoice number from an email subject or body.
 * Looks for patterns like: #1042, Invoice 1042, INV-1042
 */
export function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /#(\d{3,})/,
    /invoice\s*#?\s*(\d{3,})/i,
    /inv[-\s]?(\d{3,})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return null
}
