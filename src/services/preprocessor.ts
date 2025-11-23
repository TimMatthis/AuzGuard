// Lightweight content inspection and enrichment for request payloads

import { InspectionResult } from './inspectionTypes';
import { runRuleDetectors } from './ruleDetectors';

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
    if (inspection.risk_flags?.length) (enriched as any).risk_flags = inspection.risk_flags;
    if (typeof inspection.possible_copyrighted === 'boolean') (enriched as any).possible_copyrighted = inspection.possible_copyrighted;

    // Convenience: set personal_information true if PII detected and not already provided
    if (inspection.contains_pii && typeof enriched['personal_information'] === 'undefined') {
      enriched['personal_information'] = true;
    }

    const { derivedFields, insights } = runRuleDetectors(enriched, inspection);
    if (Object.keys(derivedFields).length > 0) {
      Object.assign(enriched, derivedFields);
    }
    if (insights.length > 0) {
      (enriched as Record<string, unknown>)['__rule_insights'] = insights;
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
    const cards = this.findCreditCards(text);
    const addresses = this.findAddresses(text);
    const abns = this.findABNs(text);
    const tfns = this.findTFNs(text);
    const ssns = this.findSSNs(text);

    const piiTypes: string[] = [];
    if (emails.length) piiTypes.push('email');
    if (phones.length) piiTypes.push('phone');
    if (ids.length) piiTypes.push('id_number');
    if (cards.length) piiTypes.push('credit_card');
    if (addresses.length) piiTypes.push('address');
    if (abns.length) piiTypes.push('abn');
    if (tfns.length) piiTypes.push('tfn');
    if (ssns.length) piiTypes.push('ssn');

    const contains_pii = piiTypes.length > 0;
    result.contains_pii = contains_pii;
    if (piiTypes.length) result.pii_types = piiTypes;
    result.detected = {};
    if (emails.length) result.detected.emails = emails;
    if (phones.length) result.detected.phone_numbers = phones;
    if (ids.length) result.detected.id_numbers = ids;
    if (cards.length) result.detected.credit_cards = cards;
    if (addresses.length) result.detected.addresses = addresses;
    if (abns.length) result.detected.abns = abns;
    if (tfns.length) result.detected.tfns = tfns;
    if (ssns.length) result.detected.ssns = ssns;

    // Risk flags and copyright heuristics
    const riskFlags = this.detectRiskFlags(text);
    const profanities = this.findProfanities(text);
    if (profanities.length) {
      result.detected.profanities = profanities;
      result.profanity_count = profanities.length;
      if (!riskFlags.includes('profanity')) riskFlags.push('profanity');
    }
    if (riskFlags.length) result.risk_flags = riskFlags;
    result.possible_copyrighted = this.detectPossibleCopyright(text);

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
  private findAddresses(text: string): string[] {
    // Heuristic: number + street name + street type
    const re = /\b\d{1,5}\s+[A-Za-z][A-Za-z\s'-]{1,40}\s+(Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi;
    return Array.from(text.match(re) || []);
  }

  private findABNs(text: string): string[] {
    // ABN typically 11 digits, often prefixed by 'ABN'
    const re = /\b(?:ABN[:\s]*)?(\d[\s-]?){11}\b/gi;
    const matches = Array.from(text.match(re) || []);
    // Normalize to digits only
    return matches.map(m => m.replace(/\D/g, '')).filter(d => d.length === 11);
  }

  private findTFNs(text: string): string[] {
    // TFN 8 or 9 digits; to reduce false positives, prefer when 'TFN' nearby
    const withLabel = /\bTFN[:\s-]*((?:\d[\s-]?){8,9})\b/gi;
    const labeled = Array.from(text.matchAll(withLabel), m => (m[1] || '').replace(/\D/g, ''));
    const generic = Array.from(text.match(/\b\d{8,9}\b/g) || []);
    const all = [...labeled, ...generic];
    return Array.from(new Set(all.filter(d => d.length >= 8 && d.length <= 9)));
  }

  private findSSNs(text: string): string[] {
    // US SSN pattern
    const re = /\b\d{3}-\d{2}-\d{4}\b/g;
    return Array.from(text.match(re) || []);
  }

  private findCreditCards(text: string): string[] {
    // Match common credit card formats (13-19 digits, allow spaces/hyphens)
    const re = /\b(?:\d[ -]*?){13,19}\b/g;
    const candidates = Array.from(text.match(re) || []).map(s => s.replace(/[^\d]/g, ''));
    const valid = candidates.filter(d => d.length >= 13 && d.length <= 19 && this.luhnCheck(d));
    return valid;
  }

  private luhnCheck(num: string): boolean {
    let sum = 0;
    let toggle = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num[i], 10);
      if (toggle) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      toggle = !toggle;
    }
    return sum % 10 === 0;
  }

  private detectRiskFlags(text: string): string[] {
    const t = text.toLowerCase();
    const flags: string[] = [];
    const hasAny = (words: string[]) => words.some(w => t.includes(w));

    if (hasAny(['kill', 'murder', 'bomb', 'assault', 'shoot'])) flags.push('violence');
    if (hasAny(['hate', 'racist', 'bigot', 'nazis', 'slur'])) flags.push('hate');
    if (hasAny(['suicide', 'self harm', 'self-harm', 'harm myself', 'kill myself'])) flags.push('self_harm');
    if (hasAny(['porn', 'xxx', 'explicit', 'nsfw', 'sex'])) flags.push('adult');

    return Array.from(new Set(flags));
  }

  private findProfanities(text: string): string[] {
    const t = text.toLowerCase();
    const list = [
      'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'prick', 'cunt', 'bollocks', 'wanker',
      'motherfucker', 'bullshit', 'damn', 'crap', 'piss', 'douche', 'slut', 'whore'
    ];
    const found = new Set<string>();
    for (const w of list) {
      const re = new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i');
      if (re.test(t)) found.add(w);
    }
    return Array.from(found);
  }

  private detectPossibleCopyright(text: string): boolean {
    const t = text.toLowerCase();
    if (t.includes('©') || t.includes('all rights reserved')) return true;
    // Heuristic: long quoted phrases may be copyrighted
    const longQuotes = text.match(/".{120,}"/g);
    return !!(longQuotes && longQuotes.length > 0);
  }
}
