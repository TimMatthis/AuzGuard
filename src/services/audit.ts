// Audit service for immutable logging

import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogger, AuditEntry } from '../audit/logger';
import { AuditLogItem, Effect } from '../types';

export class AuditService {
  private logger: AuditLogger;

  constructor(
    private prisma: PrismaClient,
    hashSalt: string
  ) {
    this.logger = new AuditLogger(hashSalt);
  }

  async logDecision(
    orgId: string | undefined,
    ruleId: string,
    effect: Effect,
    actorId: string | undefined,
    payload: Record<string, unknown>,
    auditLogFields: string[] = []
  ): Promise<AuditEntry> {
    const entry = await this.logger.logDecision(
      orgId,
      ruleId,
      effect,
      actorId,
      payload,
      auditLogFields
    );

    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        org_id: entry.org_id ?? undefined,
        rule_id: entry.rule_id,
        effect: entry.effect,
        actor_id: entry.actor_id ?? undefined,
        payload_hash: entry.payload_hash,
        prev_hash: entry.prev_hash,
        merkle_leaf: entry.merkle_leaf || null,
        redacted_payload: entry.redacted_payload as Prisma.InputJsonValue
      }
    });

    return entry;
  }

  async getAuditLogs(filters: {
    from?: Date;
    to?: Date;
    org_id?: string;
    rule_id?: string;
    effect?: Effect;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLogItem[]> {
    return this.logger.getAuditLogs(filters);
  }

  async getAuditLogById(id: string): Promise<AuditLogItem | null> {
    const entry = await this.prisma.auditLog.findUnique({
      where: { id }
    });

    if (!entry) {
      return null;
    }

    return {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      org_id: entry.org_id ?? undefined,
      rule_id: entry.rule_id,
      effect: entry.effect as Effect,
      actor_id: entry.actor_id ?? undefined,
      fields_hashed: this.extractHashedFields(entry.redacted_payload)
    };
  }

  async getLatestProof(): Promise<{
    merkle_root: string;
    height: number;
    last_index: number;
  } | null> {
    const proof = this.logger.getLatestProof();
    return proof ? {
      merkle_root: proof.merkle_root,
      height: proof.height,
      last_index: proof.last_index
    } : null;
  }

  async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    return this.logger.verifyIntegrity();
  }

  private extractHashedFields(payload: unknown): Record<string, string> {
    const hashed: Record<string, string> = {};
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return hashed;
    }
    
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === 'string') {
        hashed[key] = this.hashValue(value);
      } else {
        hashed[key] = this.hashValue(JSON.stringify(value));
      }
    }

    return hashed;
  }

  private hashValue(value: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

