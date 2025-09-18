// Immutable audit logging with hash chain for AuzGuard

import { createHash } from 'crypto';
import { AuditLogItem, Effect } from '../types';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  org_id?: string;
  rule_id: string;
  effect: Effect;
  actor_id?: string;
  payload_hash: string;
  prev_hash: string;
  merkle_leaf?: string;
  redacted_payload?: Record<string, unknown>;
}

export interface MerkleProof {
  merkle_root: string;
  height: number;
  last_index: number;
  timestamp: Date;
}

export class AuditLogger {
  private hashSalt: string;
  private entries: AuditEntry[] = [];
  private merkleRoots: MerkleProof[] = [];

  constructor(hashSalt: string) {
    this.hashSalt = hashSalt;
  }

  /**
   * Create a new audit log entry
   */
  async logDecision(
    orgId: string | undefined,
    ruleId: string,
    effect: Effect,
    actorId: string | undefined,
    payload: Record<string, unknown>,
    auditLogFields: string[] = [],
    prevHash?: string
  ): Promise<AuditEntry> {
    // Redact sensitive fields
    const redactedPayload = this.redactPayload(payload, auditLogFields);
    
    // Create payload hash
    const payloadHash = this.hashPayload(redactedPayload);
    
    // Get previous hash (for chain continuity)
    const prevHashValue = prevHash || this.getLastHash();
    
    // Create entry hash
    const entryHash = this.createEntryHash(payloadHash, prevHashValue, {
      orgId,
      ruleId,
      effect,
      actorId,
      timestamp: new Date()
    });

    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      org_id: orgId,
      rule_id: ruleId,
      effect,
      actor_id: actorId,
      payload_hash: payloadHash,
      prev_hash: prevHashValue,
      redacted_payload: redactedPayload
    };

    this.entries.push(entry);
    
    // Update Merkle tree if needed
    await this.updateMerkleTree();
    
    return entry;
  }

  /**
   * Get audit log entries with filtering
   */
  getAuditLogs(filters: {
    from?: Date;
    to?: Date;
    org_id?: string;
    rule_id?: string;
    effect?: Effect;
    limit?: number;
    offset?: number;
  } = {}): AuditLogItem[] {
    let filtered = [...this.entries];

    if (filters.from) {
      filtered = filtered.filter(entry => entry.timestamp >= filters.from!);
    }

    if (filters.to) {
      filtered = filtered.filter(entry => entry.timestamp <= filters.to!);
    }

    if (filters.org_id) {
      filtered = filtered.filter(entry => entry.org_id === filters.org_id);
    }

    if (filters.rule_id) {
      filtered = filtered.filter(entry => entry.rule_id === filters.rule_id);
    }

    if (filters.effect) {
      filtered = filtered.filter(entry => entry.effect === filters.effect);
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return filtered
      .slice(offset, offset + limit)
      .map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        org_id: entry.org_id,
        rule_id: entry.rule_id,
        effect: entry.effect,
        actor_id: entry.actor_id,
        fields_hashed: this.extractHashedFields(entry.redacted_payload || {})
      }));
  }

  /**
   * Get latest Merkle proof
   */
  getLatestProof(): MerkleProof | null {
    return this.merkleRoots.length > 0 
      ? this.merkleRoots[this.merkleRoots.length - 1] 
      : null;
  }

  /**
   * Verify audit log integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (let i = 1; i < this.entries.length; i++) {
      const current = this.entries[i];
      const previous = this.entries[i - 1];
      
      // Verify hash chain
      if (current.prev_hash !== previous.payload_hash) {
        errors.push(`Hash chain broken at entry ${current.id}`);
      }
      
      // Verify entry hash
      const expectedHash = this.createEntryHash(
        current.payload_hash,
        current.prev_hash,
        {
          orgId: current.org_id,
          ruleId: current.rule_id,
          effect: current.effect,
          actorId: current.actor_id,
          timestamp: current.timestamp
        }
      );
      
      if (current.payload_hash !== expectedHash) {
        errors.push(`Entry hash mismatch for ${current.id}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private redactPayload(
    payload: Record<string, unknown>, 
    auditLogFields: string[]
  ): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    
    // Only include fields specified in audit_log_fields
    for (const field of auditLogFields) {
      if (field in payload) {
        redacted[field] = payload[field];
      }
    }
    
    return redacted;
  }

  private hashPayload(payload: Record<string, unknown>): string {
    const jsonString = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256')
      .update(jsonString + this.hashSalt)
      .digest('hex');
  }

  private createEntryHash(
    payloadHash: string,
    prevHash: string,
    metadata: Record<string, unknown>
  ): string {
    const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
    return createHash('sha256')
      .update(payloadHash + prevHash + metadataString + this.hashSalt)
      .digest('hex');
  }

  private getLastHash(): string {
    if (this.entries.length === 0) {
      return '0'.repeat(64); // Genesis hash
    }
    return this.entries[this.entries.length - 1].payload_hash;
  }

  private generateId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16);
  }

  private extractHashedFields(payload: Record<string, unknown>): Record<string, string> {
    const hashed: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        hashed[key] = createHash('sha256').update(value).digest('hex');
      } else {
        hashed[key] = createHash('sha256')
          .update(JSON.stringify(value))
          .digest('hex');
      }
    }
    
    return hashed;
  }

  private async updateMerkleTree(): Promise<void> {
    const batchSize = 1000; // Configurable batch size
    
    if (this.entries.length % batchSize === 0) {
      const batch = this.entries.slice(-batchSize);
      const merkleRoot = this.computeMerkleRoot(batch);
      
      this.merkleRoots.push({
        merkle_root: merkleRoot,
        height: Math.ceil(Math.log2(batchSize)),
        last_index: this.entries.length - 1,
        timestamp: new Date()
      });
    }
  }

  private computeMerkleRoot(entries: AuditEntry[]): string {
    if (entries.length === 0) return '0'.repeat(64);
    if (entries.length === 1) return entries[0].payload_hash;
    
    const hashes = entries.map(entry => entry.payload_hash);
    
    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left; // Duplicate last hash if odd number
        
        const combined = createHash('sha256')
          .update(left + right)
          .digest('hex');
        
        nextLevel.push(combined);
      }
      
      hashes.splice(0, hashes.length, ...nextLevel);
    }
    
    return hashes[0];
  }
}
