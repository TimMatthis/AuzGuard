// Lightweight content inspection and enrichment for request payloads

export interface InspectionResult {
  contains_pii?: boolean;
  pii_types?: string[];
  detected?: {
    emails?: string[];
    phone_numbers?: string[];
    id_numbers?: string[];
  };
  message_text?: string;
}

export class PreprocessorService {
  enrich(payload: Record<string, unknown>): Record<string, unknown> {
    const text = this.extractMessageText(payload);
    const inspection = this.inspectText(text);

    // Merge with original payload without mutating input
    const enriched: Record<string, unknown> = {
      ...payload,
    };

    if (inspection.message_text) enriched.message_text = inspection.message_text;
    if (typeof inspection.contains_pii === 'boolean') enriched.contains_pii = inspection.contains_pii;
    if (inspection.pii_types?.length) enriched.pii_types = inspection.pii_types;
    if (inspection.detected) enriched.detected = inspection.detected;

    // Convenience: set personal_information true if PII detected and not already provided
    if (inspection.contains_pii && typeof enriched['personal_information'] === 'undefined') {
      enriched['personal_information'] = true;
    }

    return enriched;
  }

  private extractMessageText(payload: Record<string, unknown>): string {
    // Prefer last user message in messages array, fallback to `message` string, else empty
    const messages = payload['messages'];
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m && typeof m === 'object') {
          const role = (m as any).role;
          const content = (m as any).content;
          if ((role === 'user' || role === 'system' || role === undefined) && typeof content === 'string') {
            return content;
          }
        }
      }
    }
    const single = payload['message'];
    if (typeof single === 'string') return single;
    return '';
  }

  private inspectText(text: string): InspectionResult {
    const result: InspectionResult = { message_text: text };
    if (!text || !text.trim()) return result;

    const emails = this.findEmails(text);
    const phones = this.findPhones(text);
    const ids = this.findIdNumbers(text);

    const piiTypes: string[] = [];
    if (emails.length) piiTypes.push('email');
    if (phones.length) piiTypes.push('phone');
    if (ids.length) piiTypes.push('id_number');

    const contains_pii = piiTypes.length > 0;
    result.contains_pii = contains_pii;
    if (piiTypes.length) result.pii_types = piiTypes;
    result.detected = {};
    if (emails.length) result.detected.emails = emails;
    if (phones.length) result.detected.phone_numbers = phones;
    if (ids.length) result.detected.id_numbers = ids;

    return result;
  }

  private findEmails(text: string): string[] {
    const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g;
    return Array.from(text.match(re) || []);
  }

  private findPhones(text: string): string[] {
    // Very loose international phone detection
    const re = /(?:(?:\+?\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{0,4})?)/g;
    return Array.from((text.match(re) || []).filter(v => v.replace(/\D/g, '').length >= 8));
  }

  private findIdNumbers(text: string): string[] {
    // Generic long digit sequences (8-16) as potential IDs
    const re = /\b\d{8,16}\b/g;
    return Array.from(text.match(re) || []);
  }
}

