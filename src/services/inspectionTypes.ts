export interface InspectionResult {
  contains_pii?: boolean;
  pii_types?: string[];
  detected?: {
    emails?: string[];
    phone_numbers?: string[];
    id_numbers?: string[];
    credit_cards?: string[];
    addresses?: string[];
    abns?: string[];
    tfns?: string[];
    ssns?: string[];
    profanities?: string[];
  };
  message_text?: string;
  risk_flags?: string[];
  possible_copyrighted?: boolean;
  profanity_count?: number;
}


